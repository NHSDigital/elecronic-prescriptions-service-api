SHELL=/bin/bash -euo pipefail

ifeq ($(shell test -e epsat.release && echo -n yes),yes)
	TEST_TARGET=test-epsat
	RELEASE_TARGET=release-epsat
	INSTALL_TARGET=install-epsat
	LINT_TARGET=lint-epsat
	CHECK_LICENSES_TARGET=check-licenses-epsat
	BUILD_TARGET=build-epsat
	BUILD_MESSAGE=echo running against epsat
else ifeq ($(shell test -e api.release && echo -n yes),yes)
	TEST_TARGET=test-api
	RELEASE_TARGET=release-api
	INSTALL_TARGET=install-api
	LINT_TARGET=lint-api
	CHECK_LICENSES_TARGET=check-licenses-api
	BUILD_TARGET=build-api
	BUILD_MESSAGE=echo running against api
else
	TEST_TARGET=test-all
	RELEASE_TARGET=release-all
	INSTALL_TARGET=install-all
	LINT_TARGET=lint-all
	CHECK_LICENSES_TARGET=check-licenses-all
	BUILD_TARGET=build-all
	BUILD_MESSAGE=echo running against all
endif

test:
	$(BUILD_MESSAGE)
	$(MAKE) $(TEST_TARGET)

release:
	$(BUILD_MESSAGE)
	$(MAKE) $(RELEASE_TARGET)

install:
	$(BUILD_MESSAGE)
	$(MAKE) $(INSTALL_TARGET)

lint:
	$(BUILD_MESSAGE)
	$(MAKE) $(LINT_TARGET)

check-licenses:
	$(BUILD_MESSAGE)
	$(MAKE) $(CHECK_LICENSES_TARGET)

build:
	$(BUILD_MESSAGE)
	$(MAKE) $(BUILD_TARGET)

## Common

all:
	$(MAKE) clean | tee build.log
	$(MAKE) build | tee -a build.log
	$(MAKE) test | tee -a build.log
	$(MAKE) release | tee -a build.log

.PHONY: install build test publish release clean

## install stuff

install-api: install-node install-python install-hooks generate-mock-certs

install-all: install-python install-hooks generate-mock-certs
	npm ci --ignore-scripts

install-epsat: install-python install-hooks
	npm ci --ignore-scripts \
		--workspace=packages/tool/site/client \
		--workspace=packages/tool/site/server \
		--workspace=packages/tool/e2e-tests \
		--include-workspace-root


install-node:
	npm ci --workspace packages/specification \
		--workspace packages/models \
		--workspace packages/coordinator \
		--workspace packages/e2e-tests \
		--include-workspace-root


install-python:
	poetry install

install-hooks: install-python
	poetry run pre-commit install --install-hooks --overwrite

install-validator:
	cd ../ && \
	$(MAKE) -C validator install

## build stuff

build-api: build-specification build-coordinator build-proxies

build-epsat:
	cd packages/tool && docker-compose build
	npm run build --workspace packages/tool/site/client

build-all: build-api build-epsat

build-specification:
	$(MAKE) --directory=packages/specification build 

build-coordinator:
	npm run --workspace=packages/coordinator/ build
	cp packages/coordinator/package.json packages/coordinator/dist/
	mkdir -p packages/coordinator/dist/coordinator/src/resources
	npm run --workspace=packages/coordinator/ copy-resources
	cp ../validator/manifest.json packages/coordinator/dist/coordinator/src/resources/validator_manifest.json 2>/dev/null || :

build-validator:
	cd ../ && \
	$(MAKE) -C validator build

build-proxies:
	mkdir -p dist/proxies/sandbox
	mkdir -p dist/proxies/live
	cp -Rv proxies/sandbox/apiproxy dist/proxies/sandbox
	cp -Rv proxies/live/apiproxy dist/proxies/live

## test stuff

test-api: check-licenses-api generate-mock-certs test-coordinator
	cd packages/e2e-tests && $(MAKE) test

test-epsat: check-licenses-epsat
	npm run test --workspace packages/tool/site/client

test-all: test-api test-epsat

test-coordinator:
	npm run test --workspace packages/coordinator

test-models:
	npm run test --workspace packages/models

# publish - does nothing

publish:
	echo Publish

# release stuff

release-api:
	mkdir -p dist/packages
	cp -r packages/specification/dist/. dist
	rsync -av --progress --copy-links packages/e2e-tests/ dist/packages/e2e-tests --exclude node_modules --exclude pact
	rm -f dist/packages/e2e-tests/tsconfig.json && mv dist/packages/e2e-tests/tsconfig-deploy.json dist/packages/e2e-tests/tsconfig.json
	rsync -av --progress --copy-links examples dist --exclude build
	rsync -av --progress --copy-links packages/models/ dist/packages/models --exclude node_modules
	rsync -av --progress --copy-links packages/coordinator/ dist/packages/coordinator --exclude node_modules --exclude tests
	cp package-lock.json dist/
	cp package.json dist/
	for env in internal-dev-sandbox internal-qa-sandbox sandbox; do \
		cat ecs-proxies-deploy.yml | sed -e 's/{{ SPINE_ENV }}/veit07/g' | sed -e 's/{{ SANDBOX_MODE_ENABLED }}/1/g' > dist/ecs-deploy-$$env.yml; \
	done
	cat ecs-proxies-deploy.yml | sed -e 's/{{ SPINE_ENV }}/veit07/g' -e 's/{{ SANDBOX_MODE_ENABLED }}/0/g' > dist/ecs-deploy-internal-dev.yml
	cat ecs-proxies-deploy.yml | sed -e 's/{{ SPINE_ENV }}/int/g' -e 's/{{ SANDBOX_MODE_ENABLED }}/0/g' > dist/ecs-deploy-internal-qa.yml
	cat ecs-proxies-deploy.yml | sed -e 's/{{ SPINE_ENV }}/int/g' -e 's/{{ SANDBOX_MODE_ENABLED }}/0/g' > dist/ecs-deploy-int.yml
	cat ecs-proxies-deploy.yml | sed -e 's/{{ SPINE_ENV }}/ref/g' -e 's/{{ SANDBOX_MODE_ENABLED }}/0/g' > dist/ecs-deploy-ref.yml
	cp ecs-proxies-deploy-prod.yml dist/ecs-deploy-prod.yml

release-epsat:
	mkdir -p dist/packages/tool/e2e-tests
	cp ecs-proxies-deploy.yml dist/ecs-deploy-all.yml
	for env in internal-dev prod; do \
		cp ecs-proxies-deploy.yml dist/ecs-deploy-$$env.yml; \
	done
	cp ecs-proxies-deploy-internal-dev-sandbox.yml dist/ecs-deploy-internal-dev-sandbox.yml
	cp ecs-proxies-deploy-internal-qa.yml dist/ecs-deploy-internal-qa.yml
	cp ecs-proxies-deploy-int.yml dist/ecs-deploy-int.yml
	cp ecs-proxies-deploy-sandbox.yml dist/ecs-deploy-sandbox.yml
	cp packages/tool/specification/eps-api-tool.json dist/
	cp -Rv packages/tool/proxies dist
	rsync -av --progress packages/tool/e2e-tests/ dist/packages/tool/e2e-tests --exclude node_modules
	cp package-lock.json dist/
	cp package.json dist/

release-all:
	echo "Can not release all"
	exit 1

# prepare for either epsat or api release

prepare-for-api-release:
	cp packages/coordinator/ecs-proxies-containers.yml ecs-proxies-containers.yml
	cp packages/coordinator/ecs-proxies-deploy-prod.yml ecs-proxies-deploy-prod.yml
	cp packages/coordinator/ecs-proxies-deploy.yml ecs-proxies-deploy.yml
	cp packages/coordinator/manifest_template.yml manifest_template.yml
	touch api.release

prepare-for-epsat-release:
	cp packages/tool/ecs-proxies-containers.yml ecs-proxies-containers.yml
	cp packages/tool/ecs-proxies-deploy-int.yml ecs-proxies-deploy-int.yml
	cp packages/tool/ecs-proxies-deploy-internal-dev-sandbox.yml ecs-proxies-deploy-internal-dev-sandbox.yml
	cp packages/tool/ecs-proxies-deploy-internal-qa.yml ecs-proxies-deploy-internal-qa.yml
	cp packages/tool/ecs-proxies-deploy-sandbox.yml ecs-proxies-deploy-sandbox.yml
	cp packages/tool/ecs-proxies-deploy.yml ecs-proxies-deploy.yml
	cp packages/tool/manifest_template.yml manifest_template.yml
	cp -r examples packages/tool/site/client/static/
	cp -fr packages/models packages/tool/site/client/src/
	touch epsat.release

## clean 

clean:
	rm -rf dist
	rm -rf examples/build
	rm -rf packages/models/dist
	rm -rf packages/specification/dist
	rm -rf packages/specification/build
	rm -rf packages/coordinator/dist
	rm -rf packages/tool/site/server/dist
	rm -rf packages/tool/site/client/dist
	rm -rf packages/tool/site/client/coverage
	rm -f packages/e2e-tests/postman/electronic-prescription-coordinator-postman-tests.json
	rm -f packages/e2e-tests/postman/collections/electronic-prescription-service-collection.json
	rm -rf packages/tool/templates
	rm -rf packages/tool/static
	rm -rf packages/e2e-tests/pact/pacts
	rm -rf packages/tool/e2e-tests/test_results
	cd packages/tool && docker-compose down
	rm -f ecs-*.yml
	rm -f manifest_template.yml
	rm -f api.release
	rm -f epsat.release
	rm -rf packages/tool/site/client/src/models
	rm -rf packages/tool/site/client/static/examples
	rm -rf build
	rm -rf release_notes
	rm -rf packages/e2e-tests/prescriptions-*.txt
	find . -name 'junit.xml' -type f -prune -exec rm -rf '{}' +
	find . -name '__pycache__' -type d -prune -exec rm -rf '{}' +
	find . -name '.pytest_cache' -type d -prune -exec rm -rf '{}' +

deep-clean: clean
	rm -rf venv
	find . -name 'node_modules' -type d -prune -exec rm -rf '{}' +
	poetry env remove --all
	rm -rf packages/coordinator/tests/resources/certificates/certs
	rm -rf packages/coordinator/tests/resources/certificates/config
	rm -rf packages/coordinator/tests/resources/certificates/crl
	rm -rf packages/coordinator/tests/resources/certificates/private

## Run

run-specification:
	scripts/set_spec_server_dev.sh
	npm run --workspace=packages/specification/ serve

run-coordinator:
	source ./scripts/set_env_vars.sh && cd packages/coordinator/dist && npm run start

run-validator:
	cd ../ && \
	$(MAKE) -C validator run

run-epsat:
	cd packages/tool && docker-compose up


## Quality Checks

lint-api: build-api
	npm run lint --workspace packages/specification
	npm run lint --workspace packages/coordinator
	poetry run flake8 scripts/*.py --config .flake8
	shellcheck scripts/*.sh
	npm run lint --workspace packages/e2e-tests

lint-epsat:
	npm run lint --workspace packages/tool/site/client
	npm run lint --workspace packages/tool/site/server
	npm run lint --workspace packages/tool/e2e-tests

lint-all: lint-api lint-epsat

## check licenses

check-licenses-api:
	npm run check-licenses --workspace packages/specification
	npm run check-licenses --workspace packages/coordinator 
	npm run check-licenses --workspace packages/e2e-tests 
	scripts/check_python_licenses.sh

check-licenses-epsat:
	npm run check-licenses --workspace packages/tool/site/client
	npm run check-licenses --workspace packages/tool/site/server
	npm run check-licenses --workspace packages/tool/e2e-tests

check-licenses-all: check-licenses-api check-licenses-epsat

check-language-versions:
	./scripts/check_language_versions.sh


## Tools
generate-mock-certs:
	cd packages/coordinator/tests/resources/certificates && bash ./generate_mock_certs.sh

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
# make install-smoke-tests
install-smoke-tests:
	cd packages/e2e-tests && $(MAKE) install

# Example:
# make mode=sandbox create-smoke-tests
# make mode=live create-smoke-tests
# make mode=sandbox update=false create-smoke-tests
# make mode=live update=false create-smoke-tests
create-smoke-tests:
	source .envrc \
	&& cd packages/e2e-tests \
	&& $(MAKE) create-pacts \
	&& $(MAKE) publish-pacts

# Example:
# make env=internal-dev-sandbox pr=333 run-smoke-tests
# make env=internal-dev pr=333 token=qvgsB5OR0QUKppg2pGbDagVMrj65 run-smoke-tests
run-smoke-tests:
	source .envrc \
	&& cd packages/e2e-tests \
	&& $(MAKE) verify-pacts

# Example:
# make generate-postman-collection
generate-postman-collection:
	# requires: make mode=live create-smoke-tests
	mkdir -p packages/e2e-tests/postman/collections
	npm run generate-postman-collection --workspace packages/e2e-tests

create-int-release-notes:
	poetry run python ./scripts/identify_external_release_changes.py --release-to=INT --deploy-tag=${DEPLOY_TAG}

create-prod-release-notes:
	poetry run python ./scripts/identify_external_release_changes.py --release-to=PROD --deploy-tag=${DEPLOY_TAG}

npm-audit-fix:
    # || true is used to prevent errors from stopping the execution, e.g. vulnerabilities that npm cannot address
	npm audit fix --workspace packages/coordinator || true
	npm audit fix --workspace packages/e2e-tests || true
	npm audit fix --workspace packages/models || true
	npm audit fix --workspace packages/specification || true
	npm audit fix --workspace packages/tool/site/client || true
	npm audit fix --workspace packages/tool/site/server || true
	npm audit fix --workspace packages/tool/e2e-tests || true
