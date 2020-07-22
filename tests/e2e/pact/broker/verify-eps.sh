#!/bin/bash

set -o pipefail

docker run --rm -e PACT_BROKER_BASE_URL=$PACT_BROKER_URL -e PACT_BROKER_USERNAME=$PACT_BROKER_BASIC_AUTH_USERNAME -e PACT_BROKER_PASSWORD=$PACT_BROKER_BASIC_AUTH_PASSWORD pactfoundation/pact-cli:latest verify --provider=nhsd-apim-eps --provider-base-url=https://$APIGEE_ENVIRONMENT.api.service.nhs.uk/$SERVICE_BASE_PATH --custom-provider-header="Authorization: Bearer $APIGEE_ACCESS_TOKEN" --provider-app-version=$GIT_TAG-$COMMIT_ID --publish-verification-results
docker run --rm -e PACT_BROKER_BASE_URL=$PACT_BROKER_URL -e PACT_BROKER_USERNAME=$PACT_BROKER_BASIC_AUTH_USERNAME -e PACT_BROKER_PASSWORD=$PACT_BROKER_BASIC_AUTH_PASSWORD pactfoundation/pact-cli:latest broker create-version-tag --pacticipant=nhsd-apim-eps --version=$GIT_TAG-$COMMIT_ID --tag=$APIGEE_ENVIRONMENT
docker run --rm -e PACT_BROKER_BASE_URL=$PACT_BROKER_URL -e PACT_BROKER_USERNAME=$PACT_BROKER_BASIC_AUTH_USERNAME -e PACT_BROKER_PASSWORD=$PACT_BROKER_BASIC_AUTH_PASSWORD pactfoundation/pact-cli:latest broker can-i-deploy --pacticipant nhsd-apim-eps --version $GIT_TAG-$COMMIT_ID --pacticipant nhsd-apim-eps-test-client --version $GIT_TAG-$COMMIT_ID