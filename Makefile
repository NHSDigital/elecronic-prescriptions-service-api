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

guard-%:
	@ if [ "${${*}}" = "" ]; then \
		echo "Environment variable $* not set"; \
		exit 1; \
	fi

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
	npm ci

install-epsat: install-python install-hooks
	npm ci --workspace=packages/tool/site/client \
		--workspace=packages/tool/site/server \
		--workspace=packages/tool/e2e-tests \
		--include-workspace-root


install-node:
	npm ci --workspace packages/specification \
		--workspace packages/models \
		--workspace packages/coordinator \
		--workspace packages/e2e-tests \
		--workspace packages/bdd-tests \
		--include-workspace-root

install-python:
	poetry install

install-hooks: install-python
	poetry run pre-commit install --install-hooks --overwrite

install-validator:
	cd ../ && \
	$(MAKE) -C validator install

## download stuff

download-openjdk:
	curl -o /tmp/openjdk.tar.gz 'https://download.java.net/java/GA/jdk20/bdc68b4b9cbc4ebcb30745c85038d91d/36/GPL/openjdk-20_linux-x64_bin.tar.gz'

## build stuff

build-api: build-specification build-coordinator build-proxies

build-epsat:
	cd packages/tool && docker-compose build
	npm run build --workspace packages/tool/site/client

build-all: build-api build-epsat

build-specification:
	mkdir -p packages/specification/dist
	npm run lint --workspace packages/specification
	npm run resolve --workspace packages/specification
	cat packages/specification/dist/electronic-prescription-service-api.resolved.json | poetry run python ./scripts/set_version.py > packages/specification/dist/electronic-prescription-service-api.json

# this is a separate target as azure pipelines fail on this
build-proxygen-specification:
	mkdir -p packages/specification/dist
	npm run resolve-prescribing --workspace packages/specification/
	npm run resolve-dispensing --workspace packages/specification/

combine-specification:
	npm run combine-specification --workspace packages/specification

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

test-epsat: check-licenses-epsat
	npm run test --workspace packages/tool/site/client

test-all: test-api test-epsat

test-coordinator:
	npm run test --workspace packages/coordinator

test-models:
	npm run test --workspace packages/models

test-bdd:
	npm run test --workspace packages/bdd-tests

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
	rm -rf packages/coordinator/coverage
	rm -rf packages/tool/site/server/dist
	rm -rf packages/tool/site/client/dist
	rm -rf packages/tool/site/client/coverage
	rm -f packages/e2e-tests/postman/electronic-prescription-coordinator-postman-tests.json
	rm -f packages/e2e-tests/postman/collections/electronic-prescription-service-collection.json
	rm -rf packages/e2e-tests/coverage
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
	source ./scripts/set_env_vars.sh && cd packages/coordinator && npm run start

run-validator:
	cd ../ && \
	$(MAKE) -C validator run

run-epsat: build-epsat
	npm run watch --workspace packages/tool/site/client/ &
	cd packages/tool && docker-compose up


## Quality Checks

lint-api: build-api
	npm run lint --workspace packages/specification
	npm run lint --workspace packages/coordinator
	poetry run flake8 scripts/*.py --config .flake8
	shellcheck scripts/*.sh
	npm run lint --workspace packages/e2e-tests
	npm run lint --workspace packages/bdd-tests
	npm run lint --workspace packages/models

lint-epsat:
	npm run lint --workspace packages/tool/site/client
	npm run lint --workspace packages/tool/site/server
	npm run lint --workspace packages/tool/e2e-tests

lint-githubactions:
	actionlint

lint-all: lint-api lint-epsat lint-githubactions

## check licenses

check-licenses-api:
	npm run check-licenses --workspace packages/specification
	npm run check-licenses --workspace packages/coordinator 
	npm run check-licenses --workspace packages/e2e-tests 
	npm run check-licenses --workspace packages/bdd-tests 
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

clear-pacts:
	rm -rf packages/e2e-tests/pact

# we use cd for these rather than workspace as the scripts expect to be run in packages/e2e-tests
create-sandbox-pacts: clear-pacts
	cd packages/e2e-tests && npm run create-sandbox-pacts

create-apim-pacts: clear-pacts
	cd packages/e2e-tests && API_DEPLOYMENT_METHOD=apim npm run create-live-pacts

create-proxygen-pacts: clear-pacts
	cd packages/e2e-tests && API_DEPLOYMENT_METHOD=proxygen npm run create-live-pacts

verify-pacts:
	cd packages/e2e-tests && npm run verify-pacts
	
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

npm-audit-fix:
    # || true is used to prevent errors from stopping the execution, e.g. vulnerabilities that npm cannot address
	npm audit fix --workspace packages/coordinator || true
	npm audit fix --workspace packages/e2e-tests || true
	npm audit fix --workspace packages/models || true
	npm audit fix --workspace packages/specification || true
	npm audit fix --workspace packages/tool/site/client || true
	npm audit fix --workspace packages/tool/site/server || true
	npm audit fix --workspace packages/tool/e2e-tests || true

publish-fhir-release-notes-int:
	dev_tag=$$(curl -s "https://internal-dev.api.service.nhs.uk/electronic-prescriptions/_ping" | jq --raw-output ".version"); \
	int_tag=$$(curl -s "https://int.api.service.nhs.uk/electronic-prescriptions/_ping" | jq --raw-output ".version"); \
	echo { \"currentTag\": \"$$int_tag\", \"targetTag\": \"$$dev_tag\", \"repoName\": \"electronic-prescription-service-api\", \"targetEnvironment\": \"INT\", \"productName\": \"FHIR API\", \"releaseNotesPageId\": \"587367089\", \"releaseNotesPageTitle\": \"Current FHIR API release notes - INT\" } > /tmp/payload.json
	aws lambda invoke \
		--function-name "release-notes-createReleaseNotes" \
		--cli-binary-format raw-in-base64-out \
		--payload file:///tmp/payload.json /tmp/out.txt
	cat /tmp/out.txt

publish-fhir-rc-release-notes-int: guard-release_tag guard-current_tag
	echo { \"createReleaseCandidate\": \"true\", \"releasePrefix\": \"FHIR-\", \"currentTag\": \"$$current_tag\", \"targetTag\": \"$$release_tag\", \"repoName\": \"electronic-prescription-service-api\", \"targetEnvironment\": \"INT\", \"productName\": \"FHIR API\", \"releaseNotesPageId\": \"587372008\", \"releaseNotesPageTitle\": \"FHIR-$$release_tag - Deployed to [INT] on $$(date +'%d-%m-%y')\" } > /tmp/payload.json
	aws lambda invoke \
		--function-name "release-notes-createReleaseNotes" \
		--cli-binary-format raw-in-base64-out \
		--payload file:///tmp/payload.json /tmp/out.txt
	cat /tmp/out.txt

publish-fhir-release-notes-prod:
	dev_tag=$$(curl -s "https://internal-dev.api.service.nhs.uk/electronic-prescriptions/_ping" | jq --raw-output ".version"); \
	prod_tag=$$(curl -s "https://api.service.nhs.uk/electronic-prescriptions/_ping" | jq --raw-output ".version"); \
	echo { \"currentTag\": \"$$prod_tag\", \"targetTag\": \"$$dev_tag\", \"repoName\": \"electronic-prescription-service-api\", \"targetEnvironment\": \"PROD\", \"productName\": \"FHIR API\", \"releaseNotesPageId\": \"587367100\", \"releaseNotesPageTitle\": \"Current FHIR API release notes - PROD\" } > /tmp/payload.json
	aws lambda invoke \
		--function-name "release-notes-createReleaseNotes" \
		--cli-binary-format raw-in-base64-out \
		--payload file:///tmp/payload.json /tmp/out.txt
	cat /tmp/out.txt

mark-jira-released: guard-release_version
	echo { \"releaseVersion\": \"$$release_version\" } > /tmp/payload.json
	aws lambda invoke \
		--function-name "release-notes-markJiraReleased" \
		--cli-binary-format raw-in-base64-out \
		--payload file:///tmp/payload.json /tmp/out.txt
	cat /tmp/out.txt

update-snapshots: install-all
	npm run update-snapshots --workspace packages/tool/site/client

sam-build: sam-validate
	sam build --template-file SAMtemplates/main_template.yaml --region eu-west-2

sam-validate: 
	sam validate --template-file SAMtemplates/main_template.yaml --region eu-west-2

sam-build-sandbox: sam-validate-sandbox
	sam build --template-file SAMtemplates/sandbox_template.yaml --region eu-west-2

sam-validate-sandbox:
	sam validate --template-file SAMtemplates/sandbox_template.yaml --region eu-west-2

sam-deploy-package: guard-artifact_bucket guard-artifact_bucket_prefix guard-stack_name guard-template_file guard-cloud_formation_execution_role guard-LATEST_TRUSTSTORE_VERSION guard-TRUSTSTORE_FILE guard-VERSION_NUMBER guard-COMMIT_ID guard-TARGET_ENVIRONMENT guard-DOMAIN_NAME_EXPORT guard-ZONE_ID_EXPORT
	sam deploy \
		--template-file $$template_file \
		--stack-name $$stack_name \
		--capabilities CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND \
		--region eu-west-2 \
		--s3-bucket $$artifact_bucket \
		--s3-prefix $$artifact_bucket_prefix \
		--config-file samconfig_package_and_deploy.toml \
		--no-fail-on-empty-changeset \
		--role-arn $$cloud_formation_execution_role \
		--no-confirm-changeset \
		--force-upload \
		--tags "version=$$VERSION_NUMBER" \
		--parameter-overrides \
			TruststoreBucketName=$$TRUSTSTORE_BUCKET_NAME \
			TruststoreVersion=$$LATEST_TRUSTSTORE_VERSION \
			TruststoreFile=$$TRUSTSTORE_FILE \
			EnableMutualTLS=$$enable_mutual_tls \
			VersionNumber=$$VERSION_NUMBER \
			CommitId=$$COMMIT_ID \
			LogLevel=$$LOG_LEVEL \
			ValidatorLogLevel=$$VALIDATOR_LOG_LEVEL \
			LogRetentionInDays=$$LOG_RETENTION_DAYS \
			Env=$$TARGET_ENVIRONMENT \
			DomainNameExport=$$DOMAIN_NAME_EXPORT \
			ZoneIDExport=$$ZONE_ID_EXPORT \
			TargetSpineServer=$$TARGET_SPINE_SERVER \
			DockerImageTag=$$DOCKER_IMAGE_TAG \
			ToAsid=$$TO_ASID \
			ToPartyKey=$$TO_PARTY_KEY

cfn-guard:
	./scripts/run_cfn_guard.sh

aws-login:
	aws sso login --sso-session sso-session
