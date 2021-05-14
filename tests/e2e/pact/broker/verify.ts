import {VerifierV3, VerifierV3Options} from "@pact-foundation/pact"
import {ApiEndpoint, ApiOperation} from "../resources/common"
import path from "path"

let token: string

/* eslint-disable  @typescript-eslint/no-explicit-any */
async function verify(endpoint: string, operation?: string): Promise<any> {
    const useBroker = process.env.PACT_USE_BROKER !== "false"
    const providerVersion = process.env.PACT_TAG
      ? `${process.env.PACT_VERSION} (${process.env.PACT_TAG})`
      : process.env.PACT_VERSION
    const pacticipant_suffix = isSandbox ? "-sandbox" : ""
    let verifierOptions: VerifierV3Options = {
      consumerVersionTags: process.env.PACT_VERSION,
      provider: `${process.env.PACT_PROVIDER}+${endpoint}${operation ? "-" + operation : ""}+${process.env.PACT_VERSION}`,
      providerVersion: providerVersion,
      providerBaseUrl: process.env.PACT_PROVIDER_URL,
      logLevel: "debug",
      stateHandlers: {
        "is authenticated": () => {
          token = `${process.env.APIGEE_ACCESS_TOKEN}`
        },
        "is not authenticated": () => {
          token = ""
        }
      },
      requestFilter: (req) => {
        req.headers["x-smoke-test"] = "1"
        req.headers["Authorization"] = `Bearer ${token}`
        return req
      }
    }

    if (useBroker) {
      verifierOptions = {
        ...verifierOptions,
        publishVerificationResult: true,
        // use the below if you want to try a new broker without
        // impacting other deploys until merged in
        // then switch over variables in ADO
        // pactBrokerUrl: process.env.PACT_BROKER_NEXT_URL,
        // pactBrokerToken: process.env.PACT_BROKER_NEXT_TOKEN,
        pactBrokerUrl: process.env.PACT_BROKER_URL,
        pactBrokerUsername: process.env.PACT_BROKER_BASIC_AUTH_USERNAME,
        pactBrokerPassword: process.env.PACT_BROKER_BASIC_AUTH_PASSWORD,
      }
    }
    else {
      verifierOptions = {
        ...verifierOptions,
        pactUrls: [
          // eslint-disable-next-line max-len
          `${path.join(__dirname, "../pact/pacts")}/nhsd-apim-eps-test-client${pacticipant_suffix}+${process.env.PACT_VERSION}-${process.env.PACT_PROVIDER}+${endpoint}${operation ? "-" + operation : ""}+${process.env.PACT_VERSION}.json`
        ]
      }
    }

    const verifier =  new VerifierV3(verifierOptions)
    return await verifier.verifyProvider()
}

// todo, remove live/sandbox split once dispense interactions are handled in live proxies
const liveProcessMessageOperations: Array<ApiOperation> = ["send", "cancel"]
const liveTaskOperations: Array<ApiOperation> = ["release"]
const sandboxProcessMessageOperations: Array<ApiOperation> = ["send", "cancel", "dispense"]
const sandboxTaskOperations: Array<ApiOperation> = ["release", "return", "withdraw"]
const isSandbox = process.env.APIGEE_ENVIRONMENT?.includes("sandbox")
const processMessageOperations = isSandbox ? sandboxProcessMessageOperations : liveProcessMessageOperations
const taskOperations = isSandbox ? sandboxTaskOperations : liveTaskOperations

async function verifyOnce(endpoint: ApiEndpoint, operation?: ApiOperation) {
  // todo: remove below if statement once dispense interactions are handled in live proxies
  let shouldVerifyOperation =
    !(endpoint === "process" || endpoint === "task")
    || (endpoint === "process" && processMessageOperations.includes(operation))
      || (endpoint === "task" && taskOperations.includes(operation))

  // only verify prepare in prod so we're not sending data to spine until we've
  // ironed out requirements for this
  if (process.env.APIGEE_ENVIRONMENT === "prod" && endpoint !== "prepare")
  {
    shouldVerifyOperation = false
  }

  if (shouldVerifyOperation) {
    await verify(endpoint, operation)
      .catch(() => process.exit(1))
  }
}

async function verifyConvert(): Promise<void> { await verifyOnce("convert") }
async function verifyValidate(): Promise<void> { await verifyOnce("validate") }
async function verifyPrepare(): Promise<void> { await verifyOnce("prepare") }
async function verifySend(): Promise<void> { await verifyOnce("process", "send") }
async function verifyCancel(): Promise<void> { await verifyOnce("process", "cancel") }
async function verifyRelease(): Promise<void> { await verifyOnce("task", "release") }
async function verifyDispense(): Promise<void> { await verifyOnce("process", "dispense") }
async function verifyReturn(): Promise<void> { await verifyOnce("task", "return") }
async function verifyWithdraw(): Promise<void> { await verifyOnce("task", "withdraw") }

(async () => {
  await verifyConvert()
    .then(verifyValidate)
    .then(verifyPrepare)
    .then(verifySend)
    .then(verifyCancel)
    .then(verifyRelease)
    .then(verifyDispense)
    .then(verifyReturn)
    .then(verifyWithdraw)
})()
