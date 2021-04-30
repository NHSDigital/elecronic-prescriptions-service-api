SHELL=/bin/bash -euo pipefail -O globstar

## Common

all:
	make clean > build.log
	make build >> build.log
	make test >> build.log
	make release >> build.log

.PHONY: install build test publish release clean

install: install-validator install-node install-python install-hooks

build: build-specification build-coordinator build-validator build-proxies

test: validate-models check-licenses test-coordinator
	cd tests/e2e/pact && make test
	poetry run pytest ./scripts/update_prescriptions.py

publish:
	echo Publish

release:
	mkdir -p dist/pact/models
	cp -r specification/dist/. dist
	rsync -av --progress --copy-links tests/e2e/pact dist --exclude pact/node_modules --exclude pact/pact
	rm -f dist/pact/tsconfig.json && mv dist/pact/tsconfig-deploy.json dist/pact/tsconfig.json
	rsync -av --progress --copy-links examples dist/pact --exclude examples/build
	rsync -av --progress --copy-links models dist/pact --exclude models/node_modules
	rsync -av --progress --copy-links coordinator dist/pact --exclude coordinator/node_modules --exclude coordinator/tests
	for env in internal-dev-sandbox internal-qa-sandbox sandbox; do \
		cat ecs-proxies-deploy.yml | sed -e 's/{{ SPINE_ENV }}/veit07/g' | sed -e 's/{{ SANDBOX_MODE_ENABLED }}/1/g' > dist/ecs-deploy-$$env.yml; \
	done
	for env in internal-dev internal-qa; do \
		cat ecs-proxies-deploy.yml | sed -e 's/{{ SPINE_ENV }}/veit07/g' -e 's/{{ SANDBOX_MODE_ENABLED }}/0/g' > dist/ecs-deploy-$$env.yml; \
	done
	cat ecs-proxies-deploy.yml | sed -e 's/{{ SPINE_ENV }}/int/g' -e 's/{{ SANDBOX_MODE_ENABLED }}/0/g' > dist/ecs-deploy-int.yml
	cat ecs-proxies-deploy.yml | sed -e 's/{{ SPINE_ENV }}/ref/g' -e 's/{{ SANDBOX_MODE_ENABLED }}/0/g' > dist/ecs-deploy-ref.yml
	cp ecs-proxies-deploy-prod.yml dist

clean:
	rm -rf dist
	rm -rf examples/build
	rm -rf models/dist
	rm -rf specification/dist
	rm -rf specification/build
	rm -rf coordinator/dist
	rm -f tests/e2e/postman/electronic-prescription-coordinator-postman-tests.json
	rm -f tests/e2e/postman/collections/electronic-prescription-service-collection.json

## Run

run-specification:
	scripts/set_spec_server_dev.sh
	npm run --prefix=specification/ serve

run-coordinator:
	source ./scripts/set_env_vars.sh && cd coordinator/dist && npm run start

run-validator:
	make -C validator run

## Install
install-validator:
	make -C validator install

install-python:
	poetry install

install-node:
	cd specification && npm install
	cd models && npm install
	cd coordinator && npm install
	cd tests/e2e/pact && make install

install-hooks:
	cp scripts/pre-commit .git/hooks/pre-commit

## Build

build-specification:
	cd specification \
	&& mkdir -p build/components/examples \
	&& mkdir -p build/components/schemas \
	&& cp ../examples/signature.json build/components/examples/. \
	&& cp -r ../examples/errors/. build/components/examples/. \
	&& cp -r ../examples/. build/components/examples/. \
	&& cp electronic-prescription-service-api.yaml build/electronic-prescription-service-api.yaml \
	&& npm run resolve \
	&& poetry run python ../scripts/yaml2json.py build/electronic-prescription-service-api.resolved.yaml build/ \
	&& cat build/electronic-prescription-service-api.resolved.json | poetry run python ../scripts/set_version.py > build/electronic-prescription-service-api.json \
	&& mkdir -p dist \
	&& cp build/electronic-prescription-service-api.json dist/electronic-prescription-service-api.json

build-coordinator:
	npm run --prefix=coordinator/ build
	cp coordinator/package.json coordinator/dist/
	mkdir -p coordinator/dist/coordinator/src/resources
	cp coordinator/src/resources/ebxml_request.mustache coordinator/dist/coordinator/src/resources/

build-validator:
	make -C validator build

build-proxies:
	mkdir -p dist/proxies/sandbox
	mkdir -p dist/proxies/live
	cp -Rv proxies/sandbox/apiproxy dist/proxies/sandbox
	cp -Rv proxies/live/apiproxy dist/proxies/live

## Test

test-coordinator:
	cd coordinator \
	&& npm run test

## Quality Checks

validate-models:
	mkdir -p examples/build
	test -f examples/build/org.hl7.fhir.validator.jar || curl https://storage.googleapis.com/ig-build/org.hl7.fhir.validator.jar > examples/build/org.hl7.fhir.validator.jar
	for dir in "errors/**" "secondary-care/**"; do \
		java -jar examples/build/org.hl7.fhir.validator.jar examples/$$dir/*.json -version 4.0.1 -tx n/a | tee /tmp/validation.txt; \
	done

lint: build
	cd specification && npm run lint
	cd coordinator && npm run lint
	make -C validator lint
	cd tests/e2e/pact && make lint
	poetry run flake8 scripts/*.py --config .flake8
	shellcheck scripts/*.sh

check-licenses:
	cd specification && npm run check-licenses
	cd coordinator && npm run check-licenses
	make -C validator lint
	cd tests/e2e/pact && make check-licenses
	scripts/check_python_licenses.sh

## Tools

# Variables

ifdef pr
pr-prefix = -pr-
endif

ifneq (,$(findstring sandbox,$(env)))
pact-provider = nhsd-apim-eps-sandbox
else
pact-provider = nhsd-apim-eps
endif

export SERVICE_BASE_PATH=electronic-prescriptions$(pr-prefix)$(pr)
export PACT_PROVIDER=$(pact-provider)
export APIGEE_ENVIRONMENT=$(env)
export APIGEE_ACCESS_TOKEN=$(token)

space := $(subst ,, )
export PACT_VERSION = $(subst $(space),,$(USERNAME))
export PACT_PROVIDER_URL=https://$(env).api.service.nhs.uk/$(SERVICE_BASE_PATH)
export PACT_TAG=$(env)

# Example:
# make env=internal-dev-sandbox update-prescriptions
# make env=internal-dev-sandbox pr=333 update-prescriptions
update-prescriptions:
	cd scripts && poetry run python update_prescriptions.py https://$(env).api.service.nhs.uk/electronic-prescriptions$(pr-prefix)$(pr)

# Example:
# make install-smoke-tests
install-smoke-tests:
	cd tests/e2e/pact && make install

# Example:
# make mode=sandbox create-smoke-tests
# make mode=live create-smoke-tests
# make mode=sandbox update=false create-smoke-tests
# make mode=live update=false create-smoke-tests
create-smoke-tests:
	source .envrc \
	&& cd tests/e2e/pact \
	&& make create-pacts \
	&& make publish-pacts

# Example:
# make env=internal-dev-sandbox pr=333 run-smoke-tests
# make env=internal-dev pr=333 token=qvgsB5OR0QUKppg2pGbDagVMrj65 run-smoke-tests
run-smoke-tests:
	source .envrc \
	&& cd tests/e2e/pact \
	&& make verify-pacts

# Example:
# make generate-postman-collection
generate-postman-collection:
	# requires: make mode=live create-smoke-tests
	mkdir -p tests/e2e/postman/collections
	cd tests/e2e/pact \
	&& npm run generate-postman-collection

identify-external-release-changes:
	poetry run python ./scripts/identify_external_release_changes.py
