# electronic-prescription-service-api

![Build](https://github.com/NHSDigital/electronic-prescription-service-api/workflows/Build/badge.svg?branch=master)

This is not a RESTful HL7® FHIR® API specification for the *Electronic Prescription Service API*.

* `azure/` Defines CI/CD pipeline.
* `coordinator/` Deals with message translation and distribution to other services. Backend for the production EPS FHIR API.
* `models/` A common project for sharing models and loading example requests and responses for testing
* `examples/` Contains example requests and responses used to test various components of this solution.
* `proxies/` Apigee API Proxies
* `scripts/` Utilities helpful to developers of this specification.
* `specification/` This [Open API Specification](https://swagger.io/docs/specification/about/) describes the endpoints, methods and messages exchanged by the API. Use it to generate interactive documentation; the contract between the API and its consumers.
* `tests/` End-to-end testing of the EPS FHIR API.

Consumers of the API will find developer documentation on the [NHS Digital Developer Hub](https://emea-demo8-nhsdportal.apigee.io/).

## Contributing
Contributions to this project are welcome from anyone, providing that they conform to the [guidelines for contribution](https://github.com/NHSDigital/electronic-prescription-service-api/blob/master/CONTRIBUTING.md) and the [community code of conduct](https://github.com/NHSDigital/electronic-prescription-service-api/blob/master/CODE_OF_CONDUCT.md).

### Licensing
This code is dual licensed under the MIT license and the OGL (Open Government License). Any new work added to this repository must conform to the conditions of these licenses. In particular this means that this project may not depend on GPL-licensed or AGPL-licensed libraries, as these would violate the terms of those libraries' licenses.

The contents of this repository are protected by Crown Copyright (C).

## Development


### Setup

First time fresh install Ubuntu 20.04, dependencies:

* make
* jq
* nodejs + npm/yarn
* poetry
* python3
* shellcheck
* curl
* java

These can be installed by running the following commands:

```
& sudo apt update
$ sudo apt install git make curl npm python3-apt python3-distutils python3-venv default-jre shellcheck build-essential checkinstall libssl-dev maven -y
$ curl -sSL https://raw.githubusercontent.com/python-poetry/poetry/master/get-poetry.py | python3
$ curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.37.2/install.sh | bash
$ nvm install v14.15.4
```

Clone validator sub-repo:
```
$ git submodule update --init --recursive
```

Install packages:

```
$ make install
```

You can then verify everything is installed correctly by running the default `make` target see [Make commands](#make-commands)

#### Pre-commit hooks
Some pre-commit hooks are installed as part of the install above to ensure you can't commit invalid spec changes by accident. A combination of these checks are also run in CI.

### Environment Variables
Various scripts and commands rely on environment variables being set. These are documented with the commands.

:bulb: Consider using [direnv](https://direnv.net/) to manage your environment variables during development and maintaining your own `.envrc` file - the values of these variables will be specific to you and/or sensitive.

### Make commands
There are further `make` commands that help alias some functionality during development.

#### Common commands
Common commands needed for development can be run by running the default `make` command.

```
$ make
```

This outputs to `build.log` and runs the following targets:

 * `clean` -- Removes the output from the build and release commands
 * `build` -- Outputs the FHIR R4 validated models and artifacts for the: specification, coordinator and apigee proxies into the corresponding `dist/` directories
 * `test` -- Performs quality checks including linting, licence checking of dependencies and unit/low level integration tests
 * `release` -- Pulls all the artifacts for the individual components together and arranges them in a format ready to deploy; used mainly by CI but useful to check the output matches expectations

#### Run commands
 * `run-specification` -- Serves a preview of the specification in human-readable format
 * `run-coordinator` -- Run the coordinator locally

All `run-*` make targets rely on the corresponding `build-*` make targets, the `build` make target will run all of these

#### Tool commands
 * `update-prescriptions` -- Updates examples with newly generated prescription ids/short prescription ids and updates authored on fields, use this in combination with tools for signing the examples to test dispensing in integration environments

### Running tests
#### Unit and Integration tests
To run tests for the coordinator: while in the coordinator folder, run
```
npm t
```

#### End-to-end tests

See [end to end tests](./tests/e2e/README.md) for more details

### VS Code Plugins

 * [openapi-lint](https://marketplace.visualstudio.com/items?itemName=mermade.openapi-lint) resolves links and validates entire spec with the 'OpenAPI Resolve and Validate' command
 * [OpenAPI (Swagger) Editor](https://marketplace.visualstudio.com/items?itemName=42Crunch.vscode-openapi) provides sidebar navigation


### Emacs Plugins

 * [**openapi-yaml-mode**](https://github.com/esc-emacs/openapi-yaml-mode) provides syntax highlighting, completion, and path help

### Speccy

> [Speccy](http://speccy.io/) *A handy toolkit for OpenAPI, with a linter to enforce quality rules, documentation rendering, and resolution.*

Speccy does the lifting for the following npm scripts:

 * `lint` -- Lints the definition
 * `resolve` -- Outputs the specification as a **single file**
 * `serve` -- Serves a preview of the specification in human-readable format

(Workflow detailed in a [post](https://developerjack.com/blog/2018/maintaining-large-design-first-api-specs/) on the *developerjack* blog.)

:bulb: The `resolve -i` command is useful when uploading to Apigee which requires the spec as a single file. The `-i` argument ensures that all `$ref`'s are replaced with the referenced file or internal object's content

### Caveats

#### Swagger UI
Swagger UI unfortunately doesn't correctly render `$ref`s in examples, so use `speccy serve` instead.

#### Apigee Portal
The Apigee portal will not automatically pull examples from schemas, you must specify them manually.

#### Platform setup
Successful deployment of the API Proxy requires:

 * A *Target Server* named `ig3`

:bulb: For Sandbox-running environments (`test`) these need to be present for successful deployment but can be set to empty/dummy values.
