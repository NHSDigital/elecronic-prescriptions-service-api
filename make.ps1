# Run the command below to add make facade commands to powershell: 
# . .\make.ps1
function make() { 
    $make_args = $args[0..($args.count-2)]
    $make_command = $args[-1]
    Invoke-Expression ". .\make.ps1; $make_command $make_args" 
}

# Example:
# make env=internal-dev-sandbox update-prescriptions
# make env=internal-dev-sandbox pr=333 update-prescriptions
function update-prescriptions() {
    foreach ($arg in $args) {
        $split_args = $arg.Split("=")
        $arg_name = $split_args[0]
        $arg_value = $split_args[1]
        Invoke-Expression `$$arg_name="""$arg_value"""
        if ($arg_name -eq "pr") {
            $pr_prefix="-pr-"
        }
    }
    ./scripts/update-prescriptions.ps1
}

# Example:
# make env=internal-dev-sandbox pr=333 create-smoke-tests
# make env=internal-dev pr=333 token=qvgsB5OR0QUKppg2pGbDagVMrj65 create-smoke-tests
function install-smoke-tests() {
    cd tests/e2e/pact
    #rm -rf pact
    npm install -g jest
    npm install -g node-gyp
    npm install -g node-pre-gyp
    npm install
    cd ../../..
}

# Example:
# make mode=sandbox create-smoke-tests
# make mode=live create-smoke-tests
function create-smoke-tests() {
    foreach ($arg in $args) {
        $split_args = $arg.Split("=")
        $arg_name = $split_args[0]
        $arg_value = $split_args[1]
        Invoke-Expression `$$arg_name="""$arg_value"""
        if ($arg_name -eq "pr") {
            $pr_prefix="-pr-"
        }
    }
    . ./envrc.ps1
    $env:PACT_VERSION="$env:USERNAME".replace(' ','')
    #$env:LOG_LEVEL="debug"
    Remove-Item Env:\LOG_LEVEL -ErrorAction SilentlyContinue
    cd tests/e2e/pact
    Remove-Item './pact' -Recurse -ErrorAction SilentlyContinue
    '..\..\..\models\examples' | Get-ChildItem -Recurse -File -Include *.json, *.xml | ForEach-Object {
        if ($_.FullName) {
            (Get-Content $_.FullName -Raw).Replace("`r`n","`n") | Set-Content $_.FullName -Force 
        }
    }
    if ($mode -eq "sandbox") {
        npm run create-sandbox-pacts 
    }
    else {
        npm run create-live-pacts
    }
	npm run publish-pacts
    cd ../../..
}

# Example:
# make env=internal-dev-sandbox pr=333 run-smoke-tests
# make env=internal-dev pr=333 token=qvgsB5OR0QUKppg2pGbDagVMrj65 run-smoke-tests
function run-smoke-tests() {
    foreach ($arg in $args) {
        $split_args = $arg.Split("=")
        $arg_name = $split_args[0]
        $arg_value = $split_args[1]
        Invoke-Expression `$$arg_name="""$arg_value"""
        if ($arg_name -eq "pr") {
            $pr_prefix="-pr-"
        }
    }
    . ./envrc.ps1
    if ($env -match "sandbox") {
        $provider_suffix="-sandbox"
    }
    $env:PACT_PROVIDER="nhsd-apim-eps$provider_suffix"
    $env:SERVICE_BASE_PATH="electronic-prescriptions$pr_prefix$pr"
    $env:PACT_VERSION="$env:USERNAME".replace(' ','')
    $env:APIGEE_ACCESS_TOKEN="$token"
    $env:PACT_PROVIDER_URL="https://$env.api.service.nhs.uk/$env:SERVICE_BASE_PATH"
    #$env:LOG_LEVEL="debug"
    Remove-Item Env:\LOG_LEVEL -ErrorAction SilentlyContinue
    cd tests/e2e/pact
	npm run verify-pacts | Out-String -Stream | Select-String -Pattern "is not authenticated" -NotMatch | Select-String -Pattern "is authenticated" -NotMatch
    cd ../../..
}