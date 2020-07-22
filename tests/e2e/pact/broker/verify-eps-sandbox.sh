./broker/pact/bin/pact-provider-verifier --pact-broker-base-url=$PACT_BROKER_URL --broker-username=$PACT_BROKER_BASIC_AUTH_USERNAME --broker-password=$PACT_BROKER_BASIC_AUTH_PASSWORD --provider=nhsd-apim-eps-sandbox --provider-base-url=https://$APIGEE_ENVIRONMENT.api.service.nhs.uk/$SERVICE_BASE_PATH --provider-app-version=$GIT_TAG-$COMMIT_ID --publish-verification-results
./broker/pact/bin/pact-broker create-version-tag --broker-base-url=$PACT_BROKER_URL --broker-username=$PACT_BROKER_BASIC_AUTH_USERNAME --broker-password=$PACT_BROKER_BASIC_AUTH_PASSWORD --pacticipant=nhsd-apim-eps-sandbox --version=$GIT_TAG-$COMMIT_ID --tag=$APIGEE_ENVIRONMENT-sandbox
./broker/pact/bin/pact-broker can-i-deploy --broker-base-url=$PACT_BROKER_URL --broker-username=$PACT_BROKER_BASIC_AUTH_USERNAME --broker-password=$PACT_BROKER_BASIC_AUTH_PASSWORD --pacticipant nhsd-apim-eps-sandbox --version $GIT_TAG-$COMMIT_ID --pacticipant nhsd-apim-eps-test-client --version $GIT_TAG-$COMMIT_ID

#!/bin/bash

set -o pipefail

if [ -z "$PACT_BROKER_TOKEN" ]
then
    docker run --rm -e PACT_BROKER_BASE_URL=$PACT_BROKER_URL -e PACT_BROKER_USERNAME=$PACT_BROKER_BASIC_AUTH_USERNAME -e PACT_BROKER_PASSWORD=$PACT_BROKER_BASIC_AUTH_PASSWORD pactfoundation/pact-cli:latest verify --provider=nhsd-apim-eps-sandbox --provider-base-url=https://$APIGEE_ENVIRONMENT.api.service.nhs.uk/$SERVICE_BASE_PATH --provider-app-version=$GIT_TAG-$COMMIT_ID --publish-verification-results
    docker run --rm -e PACT_BROKER_BASE_URL=$PACT_BROKER_URL -e PACT_BROKER_USERNAME=$PACT_BROKER_BASIC_AUTH_USERNAME -e PACT_BROKER_PASSWORD=$PACT_BROKER_BASIC_AUTH_PASSWORD pactfoundation/pact-cli:latest broker create-version-tag --pacticipant=nhsd-apim-eps-sandbox --version=$GIT_TAG-$COMMIT_ID --tag=$APIGEE_ENVIRONMENT-sandbox
    docker run --rm -e PACT_BROKER_BASE_URL=$PACT_BROKER_URL -e PACT_BROKER_USERNAME=$PACT_BROKER_BASIC_AUTH_USERNAME -e PACT_BROKER_PASSWORD=$PACT_BROKER_BASIC_AUTH_PASSWORD pactfoundation/pact-cli:latest broker can-i-deploy --pacticipant nhsd-apim-eps-sandbox --version $GIT_TAG-$COMMIT_ID --pacticipant nhsd-apim-eps-test-client --version $GIT_TAG-$COMMIT_ID
else
    docker run --rm -e PACT_BROKER_BASE_URL=$PACT_BROKER_URL -e PACT_BROKER_TOKEN=$PACT_BROKER_TOKEN pactfoundation/pact-cli:latest verify --provider=nhsd-apim-eps-sandbox --provider-base-url=https://$APIGEE_ENVIRONMENT.api.service.nhs.uk/$SERVICE_BASE_PATH --provider-app-version=$GIT_TAG-$COMMIT_ID --publish-verification-results
    docker run --rm -e PACT_BROKER_BASE_URL=$PACT_BROKER_URL -e PACT_BROKER_TOKEN=$PACT_BROKER_TOKEN pactfoundation/pact-cli:latest broker create-version-tag --pacticipant=nhsd-apim-eps-sandbox --version=$GIT_TAG-$COMMIT_ID --tag=$APIGEE_ENVIRONMENT-sandbox
    docker run --rm -e PACT_BROKER_BASE_URL=$PACT_BROKER_URL -e PACT_BROKER_TOKEN=$PACT_BROKER_TOKEN pactfoundation/pact-cli:latest broker can-i-deploy --pacticipant nhsd-apim-eps-sandbox --version $GIT_TAG-$COMMIT_ID --pacticipant nhsd-apim-eps-test-client --version $GIT_TAG-$COMMIT_ID
fi