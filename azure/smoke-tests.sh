# Set variables
export SERVICE_NAME=$(SERVICE_NAME)
export SERVICE_ARTIFACT_NAME=`ls $SERVICE_NAME`

if [ ! -d "$SERVICE_NAME/$SERVICE_ARTIFACT_NAME/pact" ]; then
    echo "No pacts found. Exiting"
  exit 0
fi

if [[ $SERVICE_ARTIFACT_NAME == v* ]]; then
  export BUILD_VERSION=`echo $SERVICE_ARTIFACT_NAME | grep -o "v[0-9]\+\.[0-9]\+\.[0-9]\+-[[:alpha:]]\+" | tail -1`
else
  export BUILD_VERSION="${{ variables.service_base_path }}"
fi

export SANDBOX=0
if [[ $(APIGEE_ENVIRONMENT) == *"sandbox"* ]]; then
  export SANDBOX=1
fi

export SERVICE_BASE_PATH="${{ variables.service_base_path }}"
export PACT_BROKER_URL=$(PACT_BROKER_URL)
export PACT_BROKER_BASIC_AUTH_USERNAME=$(PACT_BROKER_BASIC_AUTH_USERNAME)
export PACT_BROKER_BASIC_AUTH_PASSWORD=$(PACT_BROKER_BASIC_AUTH_PASSWORD) 
export PACT_CONSUMER=nhsd-apim-eps-test-client
export APIGEE_ENVIRONMENT=$(APIGEE_ENVIRONMENT)
export ENV_VARIABLE_GROUP=$(curl https://dev.azure.com/NHSD-APIM/API%20Platform/_apis/distributedtask/variablegroups?groupName=env-$APIGEE_ENVIRONMENT -u $(vg-readonly-access-token))
export IDP_URL="$(echo $ENV_VARIABLE_GROUP | jq --raw-output '.value[0].variables.IDP_URL.value')"

if [ "$SANDBOX" == "1" ]; then
  export PACT_PROVIDER=nhsd-apim-eps-sandbox
else
export PACT_PROVIDER=nhsd-apim-eps
fi

# Publish
cd $SERVICE_NAME/$SERVICE_ARTIFACT_NAME/pact
rm -rf node_modules && npm install
make create
chmod +x ./broker/publish.sh
chmod +x ./broker/docker-entrypoint.sh
make publish

# Poll deploying API until our deployed version matches the release version
url="https://$APIGEE_ENVIRONMENT.api.service.nhs.uk/$SERVICE_BASE_PATH/_ping"
interval_in_seconds=5
releaseCommit="$(Build.SourceVersion)"
path=".commitId"
printf "\nPolling '$url' every $interval_in_seconds seconds, until commit is: '$releaseCommit'\n"
while true;
do 
  deployedCommit=`curl $url -s | jq -r $path`
  printf "\r$deployedCommit";
  if [[ "$deployedCommit" == "$releaseCommit" ]]; then 
    break; 
  fi; 
  sleep $interval_in_seconds; 
done

# Verify
if [ "$SANDBOX" == "1" ]; then
  docker run --rm \
    -e PACT_BROKER_BASE_URL=$PACT_BROKER_URL \
    -e PACT_BROKER_USERNAME=$PACT_BROKER_BASIC_AUTH_USERNAME \
    -e PACT_BROKER_PASSWORD=$PACT_BROKER_BASIC_AUTH_PASSWORD \
    pactfoundation/pact-cli:latest verify $PACT_BROKER_URL/pacts/provider/$PACT_PROVIDER/consumer/$PACT_CONSUMER/version/$BUILD_VERSION \
    --provider-base-url=https://$APIGEE_ENVIRONMENT.api.service.nhs.uk/$SERVICE_BASE_PATH \
    --provider-app-version=$BUILD_VERSION \
    --publish-verification-results
else
  export APIGEE_ACCESS_TOKEN=$(docker run --rm artronics/nhsd-login-docker:latest $IDP_URL)
  docker run --rm \
    -e PACT_BROKER_BASE_URL=$PACT_BROKER_URL \
    -e PACT_BROKER_USERNAME=$PACT_BROKER_BASIC_AUTH_USERNAME \
    -e PACT_BROKER_PASSWORD=$PACT_BROKER_BASIC_AUTH_PASSWORD \
    pactfoundation/pact-cli:latest verify $PACT_BROKER_URL/pacts/provider/$PACT_PROVIDER/consumer/$PACT_CONSUMER/version/$BUILD_VERSION \
    --provider-base-url=https://$APIGEE_ENVIRONMENT.api.service.nhs.uk/$SERVICE_BASE_PATH \
    --custom-provider-header="Authorization: Bearer $APIGEE_ACCESS_TOKEN" \
    --provider-app-version=$BUILD_VERSION \
    --publish-verification-results
fi

# Tag
docker run --rm -e PACT_BROKER_BASE_URL=$PACT_BROKER_URL -e PACT_BROKER_USERNAME=$PACT_BROKER_BASIC_AUTH_USERNAME -e PACT_BROKER_PASSWORD=$PACT_BROKER_BASIC_AUTH_PASSWORD pactfoundation/pact-cli:latest broker create-version-tag --pacticipant=$PACT_CONSUMER --version=$BUILD_VERSION --tag=$APIGEE_ENVIRONMENT$NAMESPACE
docker run --rm -e PACT_BROKER_BASE_URL=$PACT_BROKER_URL -e PACT_BROKER_USERNAME=$PACT_BROKER_BASIC_AUTH_USERNAME -e PACT_BROKER_PASSWORD=$PACT_BROKER_BASIC_AUTH_PASSWORD pactfoundation/pact-cli:latest broker create-version-tag --pacticipant=$PACT_PROVIDER --version=$BUILD_VERSION --tag=$APIGEE_ENVIRONMENT$NAMESPACE

# Link to pact on broker
echo "View Pact: $PACT_BROKER_URL/matrix?q%5B%5Dpacticipant=$PACT_CONSUMER&q%5B%5Dtag=$APIGEE_ENVIRONMENT$NAMESPACE&q%5B%5Dpacticipant=$PACT_PROVIDER&q%5B%5Dtag=$APIGEE_ENVIRONMENT$NAMESPACE&latestby=cvpv&limit=100"

# Can I Deploy
docker run --rm -e PACT_BROKER_BASE_URL=$PACT_BROKER_URL -e PACT_BROKER_USERNAME=$PACT_BROKER_BASIC_AUTH_USERNAME -e PACT_BROKER_PASSWORD=$PACT_BROKER_BASIC_AUTH_PASSWORD pactfoundation/pact-cli:latest broker can-i-deploy --pacticipant $PACT_PROVIDER --version $BUILD_VERSION --pacticipant $PACT_CONSUMER --version $BUILD_VERSION