./broker/pact/bin/pact-provider-verifier --pact-broker-base-url=$PACT_BROKER_URL --broker-username=$PACT_BROKER_BASIC_AUTH_USERNAME --broker-password=$PACT_BROKER_BASIC_AUTH_PASSWORD --provider=apim-eps-sandbox --provider-base-url=https://internal-dev.api.service.nhs.uk/electronic-prescriptions-AEA-389_add_pact_e2e_tests-sandbox --provider-app-version=v1.0.44-alpha-$COMMIT_ID --publish-verification-results