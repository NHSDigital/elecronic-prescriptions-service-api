#!/usr/bin/env bash
set -eu pipefail

echo "Specification path: ${SPEC_PATH}"
echo "Specification version: ${VERSION_NUMBER}"
echo "Stack name: ${STACK_NAME}"
echo "AWS environment: ${AWS_ENVIRONMENT}"
echo "Apigee environment: ${APIGEE_ENVIRONMENT}"
echo "Proxygen private key name: ${PROXYGEN_PRIVATE_KEY_NAME}"
echo "Proxygen KID: ${PROXYGEN_KID}"
echo "Dry run: ${DRY_RUN}"

client_private_key=$(cat ~/.proxygen/tmp/client_private_key)
client_cert=$(cat ~/.proxygen/tmp/client_cert)

if [ -z "${client_private_key}" ]; then
    echo "client_private_key is unset or set to the empty string"
    exit 1
fi
if [ -z "${client_cert}" ]; then
    echo "client_cert is unset or set to the empty string"
    exit 1
fi

put_secret_lambda=lambda-resources-ProxygenPTLMTLSSecretPut
instance_put_lambda=lambda-resources-ProxygenPTLInstancePut
spec_publish_lambda=lambda-resources-ProxygenPTLSpecPublish

if [[ "$APIGEE_ENVIRONMENT" =~ ^(int|sandbox|prod)$ ]]; then 
    put_secret_lambda=lambda-resources-ProxygenProdMTLSSecretPut
    instance_put_lambda=lambda-resources-ProxygenProdInstancePut
    spec_publish_lambda=lambda-resources-ProxygenProdSpecPublish
fi

is_pull_request=false
instance_suffix=""
if [[ ${STACK_NAME} == prescribe-dispense-pr-* ]]; then
    is_pull_request=true
    # Extracting the PR ID from $STACK_NAME
    pr_id=$(echo "${STACK_NAME}" | cut -d'-' -f4)
    instance_suffix=-"pr-${pr_id}"
fi

# Determine the proxy instance based on the provided $STACK_NAME
apigee_api="${PROXYGEN_KID}"
instance="${PROXYGEN_KID}${instance_suffix}"

echo "Is pull request: ${is_pull_request}"
echo "Proxy instance: ${instance}"
echo "Apigee api: ${apigee_api}"

echo

echo "Fixing the spec"
# Find and replace the title
title=$(jq -r '.info.title' "${SPEC_PATH}")
if [[ "${is_pull_request}" == "true" ]]; then
    jq --arg title "[PR-${pr_id}] $title" '.info.title = $title' "${SPEC_PATH}" > temp.json && mv temp.json "${SPEC_PATH}"
fi

# Find and replace the specification version number 
jq --arg version "${VERSION_NUMBER}" '.info.version = $version' "${SPEC_PATH}" > temp.json && mv temp.json "${SPEC_PATH}"

# Find and replace the x-nhsd-apim.target.url value
jq --arg stack_name "${STACK_NAME}" --arg aws_env "${AWS_ENVIRONMENT}" '.["x-nhsd-apim"].target.url = "https://\($stack_name).\($aws_env).eps.national.nhs.uk"' "${SPEC_PATH}" > temp.json && mv temp.json "${SPEC_PATH}"

# Find and replace the servers object
if [[ "${APIGEE_ENVIRONMENT}" == "prod" ]]; then
    jq --arg inst "${instance}" '.servers = [ { "url": "https://api.service.nhs.uk/\($inst)" } ]' "${SPEC_PATH}" > temp.json && mv temp.json "${SPEC_PATH}"
else
    jq --arg env "${APIGEE_ENVIRONMENT}" --arg inst "${instance}" '.servers = [ { "url": "https://\($env).api.service.nhs.uk/\($inst)" } ]' "${SPEC_PATH}" > temp.json && mv temp.json "${SPEC_PATH}"
fi

# Find and replace securitySchemes
if [[ "${APIGEE_ENVIRONMENT}" == "prod" ]]; then
    jq '.components.securitySchemes."nhs-cis2-aal3" = {"$ref": "https://proxygen.prod.api.platform.nhs.uk/components/securitySchemes/nhs-cis2-aal3"}' "${SPEC_PATH}" > temp.json && mv temp.json "${SPEC_PATH}"
else
    jq '.components.securitySchemes."nhs-cis2-aal3" = {"$ref": "https://proxygen.ptl.api.platform.nhs.uk/components/securitySchemes/nhs-cis2-aal3"}' "${SPEC_PATH}" > temp.json && mv temp.json "${SPEC_PATH}"
fi

# Remove target attributes if the environment is sandbox
if [[ "${APIGEE_ENVIRONMENT}" == *"sandbox"* ]]; then
    echo "Removing target attributes for sandbox environment"
    jq 'del(."x-nhsd-apim"."target-attributes")' "$SPEC_PATH" > temp.json && mv temp.json "${SPEC_PATH}"
fi

echo

echo "Retrieving proxygen credentials"

# Retrieve the proxygen private key and client private key and cert from AWS Secrets Manager
proxygen_private_key_arn=$(aws cloudformation list-exports --query "Exports[?Name=='secrets:${PROXYGEN_PRIVATE_KEY_NAME}'].Value" --output text)

if [[ "${is_pull_request}" == "false" ]]; then
    echo
    echo "Store the secret used for mutual TLS to AWS using Proxygen proxy lambda"
    if [[ "${DRY_RUN}" == "false" ]]; then
        jq -n --arg apiName "${apigee_api}" \
            --arg environment "${APIGEE_ENVIRONMENT}" \
            --arg secretName "fhir-facade-mtls-1" \
            --arg secretKey "${client_private_key}" \
            --arg secretCert "${client_cert}" \
            --arg kid "${PROXYGEN_KID}" \
            --arg proxygenSecretName "${proxygen_private_key_arn}" \
            '{apiName: $apiName, environment: $environment, secretName: $secretName, secretKey: $secretKey, secretCert: $secretCert, kid, $kid, proxygenSecretName: $proxygenSecretName}' > payload.json

        aws lambda invoke --function-name "${put_secret_lambda}" --cli-binary-format raw-in-base64-out --payload file://payload.json out.txt > response.json
        if eval "cat response.json | jq -e '.FunctionError' >/dev/null"; then
            echo 'Error calling lambda'
            cat out.txt
            exit 1
        fi
        echo "Secret stored successfully"
    else
        echo "Would call ${put_secret_lambda}"
    fi
fi

echo
echo "Deploy the API instance using Proxygen proxy lambda"
if [[ "${DRY_RUN}" == "false" ]]; then

    jq -n --argfile spec "${SPEC_PATH}" \
        --arg apiName "${apigee_api}" \
        --arg environment "${APIGEE_ENVIRONMENT}" \
        --arg instance "${instance}" \
        --arg kid "${PROXYGEN_KID}" \
        --arg proxygenSecretName "${proxygen_private_key_arn}" \
        '{apiName: $apiName, environment: $environment, specDefinition: $spec, instance: $instance, kid: $kid, proxygenSecretName: $proxygenSecretName}' > payload.json

    aws lambda invoke --function-name "${instance_put_lambda}" --cli-binary-format raw-in-base64-out --payload file://payload.json out.txt > response.json

    if eval "cat response.json | jq -e '.FunctionError' >/dev/null"; then
        echo 'Error calling lambda'
        cat out.txt
        exit 1
    fi
    echo "Instance deployed"
else
    echo "Would call ${instance_put_lambda}"
fi

echo "Removing dummy paths before publishing spec"
jq 'del(."paths"."/FHIR/R4/$process-message")' "$SPEC_PATH" > temp.json && mv temp.json "${SPEC_PATH}"
jq 'del(."paths"."/FHIR/R4//FHIR/R4/Task")' "$SPEC_PATH" > temp.json && mv temp.json "${SPEC_PATH}"
jq 'del(."paths"."/FHIR/R4/$validate")' "$SPEC_PATH" > temp.json && mv temp.json "${SPEC_PATH}"

if [[ "${APIGEE_ENVIRONMENT}" == "int" ]]; then
    echo
    echo "Deploy the API spec to prod catalogue as it is int environment"
    if [[ "${DRY_RUN}" == "false" ]]; then
        jq -n --argfile spec "${SPEC_PATH}" \
            --arg apiName "${apigee_api}" \
            --arg environment "prod" \
            --arg instance "${instance}" \
            --arg kid "${PROXYGEN_KID}" \
            --arg proxygenSecretName "${proxygen_private_key_arn}" \
            '{apiName: $apiName, environment: $environment, specDefinition: $spec, instance: $instance, kid: $kid, proxygenSecretName: $proxygenSecretName}' > payload.json

        aws lambda invoke --function-name "${spec_publish_lambda}" --cli-binary-format raw-in-base64-out --payload file://payload.json out.txt > response.json

        if eval "cat response.json | jq -e '.FunctionError' >/dev/null"; then
            echo 'Error calling lambda'
            cat out.txt
            exit 1
        fi
        echo "Spec deployed"
    else
        echo "Would call ${spec_publish_lambda}"
    fi
fi

if [[ "${APIGEE_ENVIRONMENT}" == "internal-dev" && "${is_pull_request}" == "false" ]]; then
    echo
    echo "Deploy the API spec to uat catalogue as it is internal-dev environment"
    if [[ "${DRY_RUN}" == "false" ]]; then
        jq -n --argfile spec "${SPEC_PATH}" \
            --arg apiName "${apigee_api}" \
            --arg environment "uat" \
            --arg instance "${instance}" \
            --arg kid "${PROXYGEN_KID}" \
            --arg proxygenSecretName "${proxygen_private_key_arn}" \
            '{apiName: $apiName, environment: $environment, specDefinition: $spec, instance: $instance, kid: $kid, proxygenSecretName: $proxygenSecretName}' > payload.json

        aws lambda invoke --function-name "${spec_publish_lambda}" --cli-binary-format raw-in-base64-out --payload file://payload.json out.txt > response.json

        if eval "cat response.json | jq -e '.FunctionError' >/dev/null"; then
            echo 'Error calling lambda'
            cat out.txt
            exit 1
        fi
        echo "Spec deployed"
    else
        echo "Would call ${spec_publish_lambda}"
    fi
fi
