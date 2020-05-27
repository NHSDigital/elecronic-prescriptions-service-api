SHELL=/bin/bash -euo pipefail

install: install-node install-python install-fhir-validator install-hooks

install-python:
	poetry install

install-node:
	npm install
	cd sandbox && npm install

install-hooks:
	cp scripts/pre-commit .git/hooks/pre-commit

install-fhir-validator:
	mkdir -p bin
	test -f bin/org.hl7.fhir.validator.jar || curl https://storage.googleapis.com/ig-build/org.hl7.fhir.validator.jar > bin/org.hl7.fhir.validator.jar

test:
	npm run test

lint:
	npm run lint
	cd sandbox && npm run lint && cd ..
	poetry run flake8 **/*.py --config .flake8
	find -name '*.sh' | grep -v node_modules | xargs shellcheck

validate: generate-examples
	java -jar bin/org.hl7.fhir.validator.jar build/examples/**/*application_fhir+json*.json -version 4.0.1 -tx n/a | tee /tmp/validation.txt

clean:
	rm -rf build
	rm -rf dist

publish: clean
	mkdir -p build
	npm run publish 2> /dev/null

serve: update-examples
	npm run serve

generate-examples: publish clean
	mkdir -p build/examples
	poetry run python scripts/generate_examples.py build/electronic-prescriptions.json build/examples

update-examples: generate-examples
	jq -rM . <build/examples/requests/paths._Prescription.post.requestBody.content.application_fhir+json.examples.example.value.json >specification/components/examples/PrescriptionPostSuccessRequest.json
	jq -rM . <build/examples/responses/paths._Prescription.post.responses.200.content.application_fhir+json.examples.example.value.json >specification/components/examples/PrescriptionPostSuccessResponse.json
	jq -rM . <build/examples/requests/paths._Prescription.put.requestBody.content.application_fhir+json.examples.example.value.json >specification/components/examples/PrescriptionPutSuccessRequest.json
	jq -rM . <build/examples/responses/paths._Prescription.put.responses.200.content.application_fhir+json.examples.example.value.json >specification/components/examples/PrescriptionPutSuccessResponse.json
	make publish

check-licenses:
	npm run check-licenses
	scripts/check_python_licenses.sh

deploy-proxy: update-examples
	scripts/deploy_proxy.sh

deploy-spec: update-examples
	scripts/deploy_spec.sh

format:
	poetry run black **/*.py

sandbox: update-examples
	cd sandbox && npm run start

build-proxy:
	scripts/build_proxy.sh

release: clean publish build-proxy
	mkdir -p dist
	tar -zcvf dist/package.tar.gz build
	cp -r terraform dist
	cp -r build/. dist
