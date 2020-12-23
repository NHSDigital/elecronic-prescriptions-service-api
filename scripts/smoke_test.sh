#!/bin/bash

# shellcheck disable=SC2155

set -euo pipefail

export SERVICE_ARTIFACT_NAME=$(SERVICE_ARTIFACT_NAME)
export SERVICE_BASE_PATH=$(SERVICE_BASE_PATH)

if [[ $SERVICE_ARTIFACT_NAME == v* ]]; then
export PACT_VERSION=$(echo "$SERVICE_ARTIFACT_NAME" | grep -o "v[0-9]\+\.[0-9]\+\.[0-9]\+-[[:alpha:]]\+" | tail -1)
else
export PACT_VERSION="$SERVICE_BASE_PATH"
fi

export APIGEE_ENVIRONMENT=$(APIGEE_ENVIRONMENT)
export PACT_BROKER_URL=$(PACT_BROKER_URL)
export PACT_BROKER_BASIC_AUTH_USERNAME=$(PACT_BROKER_BASIC_AUTH_USERNAME)
export PACT_BROKER_BASIC_AUTH_PASSWORD=$(PACT_BROKER_BASIC_AUTH_PASSWORD)
export PACT_BROKER_NEXT_URL=$(PACT_BROKER_NEXT_URL)
export PACT_BROKER_NEXT_TOKEN=$(PACT_BROKER_NEXT_TOKEN)
export PACT_CONSUMER=nhsd-apim-eps-test-client
export PACT_PROVIDER_URL=https://$APIGEE_ENVIRONMENT.api.service.nhs.uk/$SERVICE_BASE_PATH

if [[ "$APIGEE_ENVIRONMENT" == *"sandbox"* ]]; then
export PACT_PROVIDER=nhsd-apim-eps-sandbox
else
export PACT_PROVIDER=nhsd-apim-eps
if [ "$APIGEE_ENVIRONMENT" == "int" ]
then
    export IDP_URL="https://nhsd-apim-testing-$APIGEE_ENVIRONMENT-ns.herokuapp.com"
    docker pull artronics/nhsd-login-docker:latest > /dev/null
    export APIGEE_ACCESS_TOKEN=$(docker run --rm artronics/nhsd-login-docker:latest "$IDP_URL")
elif [ "$APIGEE_ENVIRONMENT" == "ref" ]
then
    export IDP_URL="$(REF_IDP_URL)"
    export AUTH_BEARER_TOKEN="$(REF_AUTH_BEARER_TOKEN)"
    docker pull booshi/nhsd-login-docker:latest > /dev/null
    export APIGEE_ACCESS_TOKEN=$(docker run --rm -e AUTH_BEARER_TOKEN="$AUTH_BEARER_TOKEN" booshi/nhsd-login-docker:latest "$IDP_URL")
else
    export IDP_URL="https://nhsd-apim-testing-$APIGEE_ENVIRONMENT.herokuapp.com"
    docker pull artronics/nhsd-login-docker:latest > /dev/null
    export APIGEE_ACCESS_TOKEN=$(docker run --rm artronics/nhsd-login-docker:latest "$IDP_URL")
fi
fi

# Publish
cd "$SERVICE_NAME"/"$SERVICE_ARTIFACT_NAME"/pact
rm -rf node_modules && npm install > /dev/null
make create-pacts > /dev/null
chmod +x ./broker/publish.ts
make publish-pacts > /dev/null

# Poll deploying API until our deployed version matches the release version
url="https://$APIGEE_ENVIRONMENT.api.service.nhs.uk/$SERVICE_BASE_PATH/_status"
interval_in_seconds=5
releaseCommit="$(Build.SourceVersion)"
path=".commitId"
printf "\nPolling %s every %s seconds, until commit is: %s\n" "$url" "$interval_in_seconds" "$releaseCommit"
attempts=0
success=0
until [ $attempts -eq 10 ]
do
deployedCommit=$(curl -H "apiKey: $STATUS_ENDPOINT_API_KEY" "$url" -s | jq -r $path)
if [[ "$deployedCommit" == "$releaseCommit" ]]; then
    success=1
    break;
fi;
((attempts=attempts+1))
sleep $interval_in_seconds;
done

if [ $success == 0 ]
then
    echo "Smoke tests failed, API was not ready in time"
    exit 255
fi

# Verify
chmod +x ./broker/verify.ts
make verify-pacts

# Tag
docker pull pactfoundation/pact-cli:latest > /dev/null
docker run --rm -e PACT_BROKER_BASE_URL="$PACT_BROKER_URL" -e PACT_BROKER_USERNAME="$PACT_BROKER_BASIC_AUTH_USERNAME" -e PACT_BROKER_PASSWORD="$PACT_BROKER_BASIC_AUTH_PASSWORD" pactfoundation/pact-cli:latest broker create-version-tag --pacticipant=$PACT_PROVIDER+convert+"$PACT_VERSION" --version="$PACT_VERSION" --tag="$APIGEE_ENVIRONMENT"
docker run --rm -e PACT_BROKER_BASE_URL="$PACT_BROKER_URL" -e PACT_BROKER_USERNAME="$PACT_BROKER_BASIC_AUTH_USERNAME" -e PACT_BROKER_PASSWORD="$PACT_BROKER_BASIC_AUTH_PASSWORD" pactfoundation/pact-cli:latest broker create-version-tag --pacticipant=$PACT_PROVIDER+prepare+"$PACT_VERSION" --version="$PACT_VERSION" --tag="$APIGEE_ENVIRONMENT"
docker run --rm -e PACT_BROKER_BASE_URL="$PACT_BROKER_URL" -e PACT_BROKER_USERNAME="$PACT_BROKER_BASIC_AUTH_USERNAME" -e PACT_BROKER_PASSWORD="$PACT_BROKER_BASIC_AUTH_PASSWORD" pactfoundation/pact-cli:latest broker create-version-tag --pacticipant=$PACT_PROVIDER+process+"$PACT_VERSION" --version="$PACT_VERSION" --tag="$APIGEE_ENVIRONMENT"

# Can I Deploy
docker run --rm -e PACT_BROKER_BASE_URL="$PACT_BROKER_URL" -e PACT_BROKER_USERNAME="$PACT_BROKER_BASIC_AUTH_USERNAME" -e PACT_BROKER_PASSWORD="$PACT_BROKER_BASIC_AUTH_PASSWORD" pactfoundation/pact-cli:latest broker can-i-deploy --pacticipant $PACT_PROVIDER+convert+"$PACT_VERSION" --version "$PACT_VERSION" --pacticipant $PACT_CONSUMER+"$PACT_VERSION" --version "$PACT_VERSION"
docker run --rm -e PACT_BROKER_BASE_URL="$PACT_BROKER_URL" -e PACT_BROKER_USERNAME="$PACT_BROKER_BASIC_AUTH_USERNAME" -e PACT_BROKER_PASSWORD="$PACT_BROKER_BASIC_AUTH_PASSWORD" pactfoundation/pact-cli:latest broker can-i-deploy --pacticipant $PACT_PROVIDER+prepare+"$PACT_VERSION" --version "$PACT_VERSION" --pacticipant $PACT_CONSUMER+"$PACT_VERSION" --version "$PACT_VERSION"
docker run --rm -e PACT_BROKER_BASE_URL="$PACT_BROKER_URL" -e PACT_BROKER_USERNAME="$PACT_BROKER_BASIC_AUTH_USERNAME" -e PACT_BROKER_PASSWORD="$PACT_BROKER_BASIC_AUTH_PASSWORD" pactfoundation/pact-cli:latest broker can-i-deploy --pacticipant $PACT_PROVIDER+process+"$PACT_VERSION" --version "$PACT_VERSION" --pacticipant $PACT_CONSUMER+"$PACT_VERSION" --version "$PACT_VERSION"
