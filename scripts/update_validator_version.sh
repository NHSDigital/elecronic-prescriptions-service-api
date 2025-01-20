#!/usr/bin/env bash
set -e

CURRENT_VALIDATOR_VERSION=$(grep VALIDATOR_VERSION= azure/azure-build-pipeline.yml |cut -d = -f 2)
NEW_VALIDATOR_VERSION=$(curl -s "https://api.github.com/repos/NHSDigital/validation-service-fhir-r4/releases/latest" | jq -r .tag_name)

HAS_VALIDATOR_CHANGED=true

if [ "$CURRENT_VALIDATOR_VERSION" == "$NEW_VALIDATOR_VERSION" ]; then 
    HAS_VALIDATOR_CHANGED=false
fi

sed -i "s/^ARG VALIDATOR_VERSION_TAG=.*/ARG VALIDATOR_VERSION_TAG=${NEW_VALIDATOR_VERSION}/" .devcontainer/Dockerfile
sed -i "s/^          VALIDATOR_VERSION=.*/          VALIDATOR_VERSION=${NEW_VALIDATOR_VERSION}/" azure/azure-build-pipeline.yml
sed -i "s/^          VALIDATOR_VERSION=.*/          VALIDATOR_VERSION=${NEW_VALIDATOR_VERSION}/" packages/tool/azure/azure-build-pipeline.yml
sed -i "s/^          LATEST_VALIDATOR_VERSION=.*/          LATEST_VALIDATOR_VERSION=${NEW_VALIDATOR_VERSION}/" .github/workflows/run_package_code_and_api.yml

echo "CURRENT_VALIDATOR_VERSION=$CURRENT_VALIDATOR_VERSION"
echo "NEW_VALIDATOR_VERSION=$NEW_VALIDATOR_VERSION"
echo "HAS_VALIDATOR_CHANGED=$HAS_VALIDATOR_CHANGED"

if [ -n "$GITHUB_ACTIONS" ]; then
    echo "Running in github actions so saving vars"
    {
        echo "CURRENT_VALIDATOR_VERSION=$CURRENT_VALIDATOR_VERSION"
        echo "NEW_VALIDATOR_VERSION=$NEW_VALIDATOR_VERSION"
        echo "HAS_VALIDATOR_CHANGED=$HAS_VALIDATOR_CHANGED"
    } >> "$GITHUB_ENV"
fi
