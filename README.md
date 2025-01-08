# Electronic Prescription Service API

![Build](https://github.com/NHSDigital/electronic-prescription-service-api/workflows/Build/badge.svg?branch=master)

This is a RESTful HL7® FHIR® API specification for the _Electronic Prescription Service API_.

- `azure/` Defines CI/CD pipeline for the API
- `packages/bdd-tests/` Jest-Cucumber BDD Test Suite. See [README](./packages/bdd-tests/README.md) for more details.
- `packages/coordinator/` Deals with message translation and distribution to other services. Backend for the production EPS FHIR API. See [README](./packages/coordinator/README.md) for more details.
- `packages/e2e-tests/` End to end tests (Smoke tests). See [README](./packages/e2e-tests/README.md) for more details.
- `packages/models/` A common project for sharing models and loading example requests and responses for testing
- `packages/specification/` This [Open API Specification](https://swagger.io/docs/specification/about/) describes the endpoints, methods and messages exchanged by the API. Use it to generate interactive documentation; the contract between the API and its consumers.
- `packages/tool/` EPSAT tool. See [README](./packages/tool/README.md) for more details.
- `packages/tool/azure` Defines CI/CD pipeline for EPSAT
- `packages/tool/e2e-tests` End to end tests for EPSAT. See [README](./packages/e2e-tests/README.md) for more details.
- `packages/tool/proxies` Apigee API Proxies for EPSAT
- `packages/tool/scripts` Useful scripts
- `packages/tool/site` Code for EPSAT - split into client and server
- `packages/tool/specification` API spec for EPSAT - needed for Apigee deployment
- `proxies/` Apigee API Proxies for the API
- `scripts/` Utilities helpful to developers of this specification
- `.devcontainer` Contains a dockerfile and vscode devcontainer definition
- `.github` Contains github workflows that are used for building and deploying from pull requests and releases
- `.vscode` Contains vscode workspace file
- `SAMtemplates` Contains AWS resource definitions

Consumers of the API will find developer documentation on the [NHS Digital Developer Hub](https://digital.nhs.uk/developer/api-catalogue).

## Contributing

Contributions to this project are welcome from anyone, providing that they conform to the [guidelines for contribution](./CONTRIBUTING.md) and the [community code of conduct](./CODE_OF_CONDUCT.md).

### Licensing

This code is dual licensed under the MIT license and the OGL (Open Government License). Any new work added to this repository must conform to the conditions of these licenses. In particular this means that this project may not depend on GPL-licensed or AGPL-licensed libraries, as these would violate the terms of those libraries' licenses.

The contents of this repository are protected by Crown Copyright (C).

## Development

It is recommended that you use visual studio code and a devcontainer as this will install all necessary components and correct versions of tools and languages.
See https://code.visualstudio.com/docs/devcontainers/containers for details on how to set this up on your host machine.
There is also a workspace file in .vscode that should be opened once you have started the devcontainer. The workspace file can also be opened outside of a devcontainer if you wish.

All commits must be made using [signed commits](https://docs.github.com/en/authentication/managing-commit-signature-verification/signing-commits)

Once the steps at the link above have been completed. Add to your ~/.gnupg/gpg.conf as below:

```
use-agent
pinentry-mode loopback
```

and to your ~/.gnupg/gpg-agent.conf as below:

```
allow-loopback-pinentry
```

As described here:
https://stackoverflow.com/a/59170001

You will need to create the files, if they do not already exist.
This will ensure that your VSCode bash terminal prompts you for your GPG key password.

You can cache the gpg key passphrase by following instructions at https://superuser.com/questions/624343/keep-gnupg-credentials-cached-for-entire-user-session

<details>
<summary>Manual Setup</summary>

If you decide not to use devcontainers, the following dependencies need to be installed: make, jq, curl, asdf.
If you want to run validator, you must install maven and a jre

#### On Ubuntu 20.04

Installed by running the following commands:

```
sudo apt update
sudo apt install git make curl build-essential checkinstall libssl-dev -y
git clone https://github.com/asdf-vm/asdf.git ~/.asdf --branch v0.11.2
echo '. $HOME/.asdf/asdf.sh' >> ~/.bashrc; \
echo '. $HOME/.asdf/completions/asdf.bash' >> ~/.bashrc;
source ~/.bashrc

# for validator
sudo apt install default-jre maven -y

```

#### On Mac

```
xcode-select --install       # if not already installed
brew update
brew install git     # if not already installed

# INSTALL PYTHON with asdf
brew install asdf
# then follow instructions to update ~/.zshrc and restart terminal
brew install openssl readline sqlite3 xz zlib tcl-tk     # python dependencies

# INSTALL USEFUL THINGS
brew install jq

```

### asdf setup

You need to run the following to install the needed asdf packages. Make sure you are in the root directory of our repo, alongside the .tool-versions file.

```
asdf plugin add python
asdf plugin add poetry https://github.com/asdf-community/asdf-poetry.git
asdf plugin add shellcheck https://github.com/luizm/asdf-shellcheck.git
asdf plugin add nodejs https://github.com/asdf-vm/asdf-nodejs.git
asdf plugin-add java
asdf install
```

### Install packages

Install the packages with `make install`, then verify everything is installed correctly by running the default `make` target.

</details>

### Pre-commit hooks

Some pre-commit hooks are installed as part of the install above to ensure you can't commit invalid spec changes by accident and to run basic lint checks.
The pre-commit hook uses python package pre-commit and is configured in the file .pre-commit-config.yaml.
A combination of these checks are also run in CI.

### Environment Variables

Various scripts and commands rely on environment variables being set. These are documented with the commands.

:bulb: Consider using [direnv](https://direnv.net/) to manage your environment variables during development and maintaining your own `.envrc` file - the values of these variables will be specific to you and/or sensitive.

The following are recommended to place in the .envrc file

```
export PACT_PROVIDER=nhsd-apim-eps
export PACT_BROKER_BASIC_AUTH_PASSWORD=<SECRET>
export PACT_BROKER_BASIC_AUTH_USERNAME=<SECRET>
export PACT_BROKER_URL=https://nhsd-pact-broker.herokuapp.com
# for api
export SERVICE_BASE_PATH=electronic-prescriptions
# for epsat
export SERVICE_BASE_PATH=eps-api-tool
export PACT_VERSION="$SERVICE_BASE_PATH"
export APIGEE_ACCESS_TOKEN=$(npm run --silent fetch-apigee-access-token)
export APIGEE_ENVIRONMENT=internal-dev
export PACT_PROVIDER_URL=https://$APIGEE_ENVIRONMENT.api.service.nhs.uk/$SERVICE_BASE_PATH
export APIGEE_KEY=<SECRET>
export API_CLIENT_SECRET=<SECRET>
export API_CLIENT_ID=<SECRET>
export APIGEE_ENVIRONMENT=internal-dev
export JIRA_TOKEN=<SECRET>
export CONFLUENCE_TOKEN=<SECRET>
```

### Make commands

There are further `make` commands that are run as part of the CI pipeline and help alias some functionality during development.

#### API and EPSAT builds

To enable API and EPSAT to be built as part of the CI processes, the following targets are derived dynamically when the make command is invoked. The derived targets have either -api, -epsat or -all as a suffix
If there is a file called api.release in the root folder, then the targets are run for api.
If there is a file called epsat.release in the root folder, then the targets are run for epsat.
If neither file is present, then the targets are run for api and epsat.

- test
- release
- install
- lint
- check-licenses
- build

#### Common commands

Common commands needed for development can be run by running the default `make` command.

```unix
make
```

This outputs to `build.log` and runs the following targets:

- `clean` Removes the output from the build and release commands
- `build` Outputs the FHIR R4 validated models and artifacts for the: specification, coordinator and apigee proxies into the corresponding `dist/` directories
- `test` Performs quality checks including linting, license checking of dependencies and unit/low level integration tests
- `release` Pulls all the artifacts for the individual components together and arranges them in a format ready to deploy; used mainly by CI but useful to check the output matches expectations

#### Install targets

- `install` Installs dependencies based on the specified target
- `install-api` Installs dependencies for the API
- `install-all` Installs all project dependencies
- `install-epsat` Installs dependencies for epsat
- `install-node` Installs Node dependencies for specified workspaces
- `install-python` Installs Python dependencies using Poetry
- `install-hooks` Installs pre-commit hooks
- `install-validator` Installs dependencies for the validator

#### Download targets

- `download-openjdk` Downloads OpenJDK.

#### Build targets

- `build` Builds the project
- `build-api` Builds API components
- `build-epsat` Builds epsat components
- `build-all` Builds all components
- `build-specification` Builds the specification component
- `build-coordinator` Builds the coordinator component
- `build-validator` Builds the validator
- `build-proxies` Builds proxies

#### Test targets

- `test` Runs tests based on the specified target
- `test-api` Runs API tests
- `test-epsat` Runs epsat tests
- `test-all` Runs all tests
- `test-coordinator` Runs coordinator tests
- `test-models` Runs models tests
- `run-smoke-tests` Runs smoke tests
- `create-smoke-tests` Creates smoke tests
- `install-smoke-tests` Installs smoke tests
- `update-snapshots` Updates snapshots

#### Run targets

- `run-specification` Serves a preview of the specification in human-readable format
- `run-coordinator` Run the coordinator locally
- `run-validator` Runs the validator
- `run-epsat` Builds and runs epsat

All `run-*` make targets rely on the corresponding `build-*` make targets, the `build` make target will run all of these

#### Release targets

These are called from CI pipeline for either API or EPSAT and copy some files to root folder needed for the APIM supplied pipeline templates to work.
They also create a file called either api.release or epsat.release in the root folder.
They can safely be run locally.
This is not valid for -all target.

- `release` Runs release based on the specified target
- `release-api` Creates a release for the API
- `release-epsat` Creates a release for epsat
- `prepare-for-api-release` Prepares for an API release
- `prepare-for-epsat-release` Prepares for an epsat release
- `publish` Placeholder target for publishing
- `mark-jira-released` Marks Jira issues as released

#### SAM targets
These are mostly called from CI pipelines to build and deploy resources to our AWS accounts via SAM

- `sam-build` Builds deployable Cloudformation files from the main SAM template
- `sam-build-sandbox`Builds deployable Cloudformation files from the sandbox SAM template
- `sam-validate` Validates the main SAM templates
- `sam-validate-sandbox` Validates the sandbox SAM templates
- `sam-deploy-package` Deploys a Cloudformation stack of defined resources from the chosen SAM template


#### Clean and deep-clean targets

- `clean` clears up any files that have been generated by building or testing locally
- `deep-clean` runs `clean` target and also removes any node_modules, python libraries, and certificates created locally

#### Quality checks targets

- `lint` Performs linting based on the specified target
- `lint-api` Lints the API components
- `lint-epsat` Lints epsat components
- `lint-all` Lints all components
- `cfn-guard` runs cfn-guard for sam and cloudformation templates


#### Check licenses and versions targets

- `check-licenses` Checks licenses based on the specified target
- `check-licenses-api` Checks licenses for API components
- `check-licenses-epsat` Checks licenses for epsat components
- `check-licenses-all` Checks licenses for all components
- `check-language-versions` Checks language versions

#### Tool commands

- `generate-mock-certs` Creates some TLS certifacates that are used for local testing
- `update-prescriptions` Updates examples with newly generated prescription ids/short prescription ids and updates authored on fields, use this in combination with tools for signing the examples to test dispensing in integration environments

#### Release notes commands

- `publish-fhir-release-notes-int` publishes int release notes to conflunce
- `publish-fhir-release-notes-prod` publishes prod release notes to conflunce
- `publish-fhir-rc-release-notes-int` publishes RC int release notes to conflunce
- `mark-jira-released` marks a jira release as released

#### Snapshot commands

- `update-snapshots` updates the snapshots used in EPSAT unit tests. Used when you modify EPSAT pages or update some dependant libraries

#### Postman commands

- `generate-postman-collection` Generates Postman collection

#### Security auditing commands

- `npm-audit-fix` Fixes npm audit vulnerabilities

### Running tests

#### Unit and Integration tests

There are tests that can be run locally for the following

- `packages/coordinator`
- `packages/models`
- `packages/tools/site/client`
- `packages/bdd-tests`

These can either be run from the root directory specifying the workspace - eg

```
npm test --workspace packages/coordinator
```

or by changing directory and running

```
npm test
```

or by using make targets

```
make test-coordinator
make test-models
make test-epsat
make test-bdd
```

or if using the devcontainer from the testing sidebar.

#### Automated Regression API tests

As part of the pipeline to deploy, automated regression is performed by starting the regression tests workflow in the [Regression Tests Repo](https://github.com/NHSDigital/electronic-prescription-service-api-regression-tests/).
This happens post API deployment on pull requests and deployments to all environments apart from REF and PROD.
If any tests fail, this will fail the deployment


#### End-to-end API tests

See [end to end API tests](./packages/e2e-tests/README.md) for more details

#### End-to-end EPSAT tests

See [end to end EPSAT tests](./packages/tool/e2e-tests/README.md) for more details

### GitHub folder

This `/.github` folder contains workflows and templates related to github

- `dependabot.yml` Dependabot definition file
- `pull_request_template.yml` Template for pull requests

Workflows are in the `/.github/workflows` folder

- `codeql-analysis.yml` Workflow for automated security analysis and vulnerability detection
- `combine-dependabot-prs.yml` Workflow for combining dependabot pull requests
- `create_int_release_notes.yml` Workflow for creating int release notes. Called from azure pipeline
- `create_prod_release_notes.yml` Workflow for creating prod release notes. Called from azure pipeline
- `create_rc_int_release_notes.yml` Workflow for creating RC int release notes. Called from azure pipeline
- `dependabot_auto_approve_and_merge.yml` Workflow for auto-approving and merging Dependabot pull requests
- `mark_jira_released.yml` Workflow for marking jira release as released. Called from azure pipeline
- `pull_request.yml` Workflow for building, testing and deploying resources to AWS from a pull request
- `pr_title_check.yml` Checks that pull requests title matches the desired format
- `pr-link.yml` Links the raised PR with the associated Jira ticket
- `release.yml` Runs on demand to create a release and deploy to all environments
- `run_package_code_and_api.yml` Packages code and api and uploads to a github artifact for later deployment.
- `run_release_code_and_api.yml` Release code and api built by run_package_code_and_api.yml to an environment.

Issue templates are in the `.github/ISSUE_TEMPLATE` folder

- `bug_report.md` Template for creating bug reports
- `feature_request.md` Template for creating feature requests

### Azure folder

This `/azure` folder contains templates defining Azure Devops pipelines

-  `azure-build-pipeline.yml` Assembles the contents of the repository into a single file ("artifact") on Azure Devops. By default this pipeline is enabled for all branches.
- `azure-pr-pipeline.yml` Deploys ephemeral versions of the proxy to Apigee to internal environments. You can run automated and manual tests against these while you develop. This pipeline will deploy to internal-dev, but the template can be amended to add other environments as required.
- `azure-release-pipeline.yml` Deploys the long-lived version of your pipeline to internal and external environments, typically when you merge to master.
- `azure-release-template.yml` Defines parameters and extends a template for deploying services on Azure, specifically for Apigee deployment.
- `project.yml` Defines variables.

In the `/azure/templates` folder, you can define reusable actions, such as running tests, and call these actions during Azure Devops pipelines. 


### Proxies folder

This `/proxies` folder contains files relating to the Apigee API proxy.

There are 2 folders `/live` and `/sandbox` allowing you to define a different proxy for sandbox use. By default, this sandbox proxy is implemented to route to the sandbox target server.

Within the `live/apiproxy` and `sandbox/apiproxy` folders are:

- `/proxies/default.xml` Defines the proxy's Flows. Flows define how the proxy should handle different requests. By default, _ping and _status endpoint flows are defined.
See the APM confluence for more information on how the [_ping](https://nhsd-confluence.digital.nhs.uk/display/APM/_ping+endpoint) and [_status](https://nhsd-confluence.digital.nhs.uk/display/APM/_status+endpoint) endpoints work.
- `/policies` Populated with a set of standard XML Apigee policies that can be used in flows.
- `/targets` The XMLs within these folders set up target definitions which allow connections to external target servers. The sandbox target definition is implemented to route to the sandbox target server (code for this sandbox is found under /sandbox of this template repo). For more info on setting up a target server see the [API Producer Zone confluence](https://nhsd-confluence.digital.nhs.uk/display/APM/Setting+up+a+target+server)

### Emacs Plugins

- [**openapi-yaml-mode**](https://github.com/esc-emacs/openapi-yaml-mode) provides syntax highlighting, completion, and path help

### Speccy

> [Speccy](https://github.com/wework/speccy) _A handy toolkit for OpenAPI, with a linter to enforce quality rules, documentation rendering, and resolution._

Speccy does the lifting for the following npm scripts:

- `lint` Lints the definition
- `resolve` Outputs the specification as a **single file**
- `serve` Serves a preview of the specification in human-readable format

(Workflow detailed in a [post](https://developerjack.com/blog/2018/maintaining-large-design-first-api-specs/) on the _developerjack_ blog.)

:bulb: The `resolve -i` command is useful when uploading to Apigee which requires the spec as a single file. The `-i` argument ensures that all `$ref`'s are replaced with the referenced file or internal object's content

### Caveats

#### Viewing OAS specification
To view the specification in a user-friendly format, you will need VSCode with the OpenAPI extension (42Crunch.vscode-openapi) installed.
Open the [electronic-prescription-service-api.yaml](./packages/specification/electronic-prescription-service-api.yaml)  file and use the `F1 > OpenAPI: show preview using ReDoc` command.

For more information about developing specifications see the [API Producer Zone confluence](https://nhsd-confluence.digital.nhs.uk/display/APM/Documenting+your+API).

#### Swagger UI

Swagger UI unfortunately doesn't correctly render `$ref`s in examples, so use `speccy serve` instead.

#### Apigee Portal

The Apigee portal will not automatically pull examples from schemas, you must specify them manually.

#### Platform setup

Successful deployment of the API Proxy requires:

- A _Target Server_ named `ig3`

:bulb: For Sandbox-running environments (`test`) these need to be present for successful deployment but can be set to empty/dummy values.


# Validator

The FHIR Validator is fetched during CI for a specific released tag. To see the released tag currently being used you can review the `Download Validator` step [version](azure/azure-build-pipeline.yml)

## Running the validator locally

You can also run the validator locally by cloning the repo in the parent folder of this checked out repo. The code is already cloned if you are using the devcontainer

```

$ cd ../
$ git clone --depth 1 --branch <version> https://github.com/NHSDigital/validation-service-fhir-r4.git validator
$ cd electronic-prescription-service-api
$ make install-validator
$ make build-validator
$ make run-validator

```
