SHELL=/bin/bash -euo pipefail

## Common

install: install-node install-python install-hooks

build: build-models build-specification build-sandbox build-coordinator build-proxies

test: validate-models lint check-licenses test-coordinator #test-sandbox -> TODO: Consolidate coordinator to sandbox, move integration tests out of this target OR remove dep on background process

release:
	mkdir -p dist
	cp -r specification/dist/. dist
	cp -r terraform dist

clean:
	rm -rf dist
	rm -rf models/dist
	rm -rf specification/dist
	rm -rf specification/build
	rm -rf sandbox/mocks
	rm -rf sandbox/tests/resources
	rm -rf coordinator/dist
	rm -f coordinator/tests/resources/parent-prescription-1/fhir-message.json

## Run

run-specification:
	scripts/set_spec_server_dev.sh
	npm run serve

run-sandbox:
	cd sandbox && npm run start

run-coordinator:
	cp coordinator/package.json coordinator/dist/
	cd coordinator/dist && npm run start

## Install

install-python:
	poetry install

install-node:
	cd specification && npm install
	cd sandbox && npm install
	cd coordinator && npm install

install-hooks:
	cp scripts/pre-commit .git/hooks/pre-commit

# Build

build-models:
	cd models \
	&& mkdir -p dist/requests \
	&& mkdir -p dist/responses \
	&& mkdir -p dist/schemas \
	&& mkdir -p dist/schemas
	$(foreach file, $(wildcard models/requests/*.yaml), cp $(file) models/dist/requests;)
	$(foreach file, $(wildcard models/requests/*.json), cp $(file) models/dist/requests;)
	$(foreach file, $(wildcard models/requests/*.yaml), poetry run python scripts/yaml2json.py $(file) models/dist/requests;)
	$(foreach file, $(wildcard models/responses/*.yaml), cp $(file) models/dist/responses;)
	$(foreach file, $(wildcard models/responses/*.json), cp $(file) models/dist/responses;)
	$(foreach file, $(wildcard models/responses/*.yaml), poetry run python scripts/yaml2json.py $(file) models/dist/responses;)
	$(foreach file, $(wildcard models/schemas/*.yaml), cp $(file) models/dist/schemas;)
	$(foreach file, $(wildcard models/schemas/*.json), cp $(file) models/dist/schemas;)
	$(foreach file, $(wildcard models/schemas/*.yaml), poetry run python scripts/yaml2json.py $(file) models/dist/schemas;)
	

build-specification:
	cd specification \
	&& mkdir -p build/components/examples \
	&& mkdir -p build/components/schemas \
	&& cp -r ../models/dist/requests/*.yaml build/components/examples \
	&& cp -r ../models/dist/responses/*.yaml build/components/examples \
	&& cp -r ../models/dist/schemas/*.yaml build/components/schemas \
	&& cp electronic-prescription-service-api.yaml build/electronic-prescription-service-api.yaml \
	&& npm run resolve \
	&& poetry run python ../scripts/yaml2json.py build/electronic-prescription-service-api.resolved.yaml build/ \
	&& cat build/electronic-prescription-service-api.resolved.json | poetry run python ../scripts/set_version.py > build/electronic-prescription-service-api.json \
	&& mkdir -p build/examples \
	&& poetry run ../scripts/generate_specification_examples.py build/electronic-prescription-service-api.json build/examples \
	&& mkdir -p dist \
	&& cp build/electronic-prescription-service-api.json dist/electronic-prescription-service-api.json

build-coordinator:
	cp models/dist/requests/PrepareSuccessRequest.json coordinator/tests/resources/parent-prescription-1/fhir-message.json
	cd coordinator \
	&& npm run build

build-sandbox:
	mkdir -p sandbox/mocks
	cp -r models/dist/responses/*.json sandbox/mocks
	mkdir -p sandbox/tests/resources
	cp models/dist/requests/PrepareSuccessRequest.json sandbox/tests/resources/valid-bundle.json
	cp models/dist/requests/SendSuccessRequest.json sandbox/tests/resources/valid-bundle-with-signature.json
	cp -r models/dist/responses/*.json sandbox/mocks/
	poetry run scripts/update_sandbox_tests.py

build-proxies:
	scripts/build_proxies.sh

# Test

test-sandbox:
	cd sandbox \
	&& export ENVIRONMENT=$(or $(ENVIRONMENT),local) \
	&& export API_TEST_ENV_FILE_PATH=$(or $(API_TEST_ENV_FILE_PATH),../tests/e2e/environments/local.postman_environment.json) \
	&& export API_TEST_URL=$(or $(API_TEST_URL),localhost:9000) \
	&& npm run test

test-coordinator:
	cd coordinator \
	&& npm run test

## Quality Checks

validate-models:
	test -f models/dist/org.hl7.fhir.validator.jar || curl https://storage.googleapis.com/ig-build/org.hl7.fhir.validator.jar > models/dist/org.hl7.fhir.validator.jar
	java -jar models/dist/org.hl7.fhir.validator.jar models/dist/requests/*.json models/dist/responses/*.json -version 4.0.1 -tx n/a | tee /tmp/validation.txt

lint:
	cd specification && npm run lint
	cd sandbox && npm run lint
	cd coordinator && npm run lint
	poetry run flake8 scripts/*.py --config .flake8
	shellcheck scripts/*.sh

check-licenses:
	cd specification && npm run check-licenses
	cd sandbox && npm run check-licenses
	cd coordinator && npm run check-licenses
	scripts/check_python_licenses.sh
