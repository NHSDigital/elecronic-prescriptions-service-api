import { VerifierV3 } from "@pact-foundation/pact"
import { 
  getPreparePactGroups,
  getProcessSendPactGroups,
  getProcessCancelPactGroups,
  getConvertPactGroups,
  getReleasePactGroups,
  ApiEndpoint,
  getProcessDispensePactGroups
} from "../resources/common"

let token: string

/* eslint-disable  @typescript-eslint/no-explicit-any */
async function verify(endpoint: string, pactGroupName: string): Promise<any> {
    const providerVersion = process.env.PACT_TAG
      ? `${process.env.PACT_VERSION} (${process.env.PACT_TAG})`
      : process.env.PACT_VERSION
    const verifier =  new VerifierV3({
      publishVerificationResult: true,
      pactBrokerUrl: process.env.PACT_BROKER_URL,
      pactBrokerUsername: process.env.PACT_BROKER_BASIC_AUTH_USERNAME,
      pactBrokerPassword: process.env.PACT_BROKER_BASIC_AUTH_PASSWORD,
      consumerVersionTag: process.env.PACT_VERSION,
      provider: `${process.env.PACT_PROVIDER}+${endpoint}${pactGroupName ? "-" + pactGroupName : ""}+${process.env.PACT_VERSION}`,
      providerVersion: providerVersion,
      providerBaseUrl: process.env.PACT_PROVIDER_URL,
      logLevel: "debug",
      stateHandlers: {
        "is authenticated": () => {
          token = `${process.env.APIGEE_ACCESS_TOKEN}`
          Promise.resolve(`Valid bearer token generated`)
        },
        "is not authenticated": () => {
          token = ""
          Promise.resolve(`Invalid bearer token generated`)
        }
      },
      requestFilter: (req) => {
        req.headers["x-smoke-test"] = "1"
        req.headers["Authorization"] = `Bearer ${token}`
        return req
      }
    })
    return await verifier.verifyProvider()
}

async function verifyOnce(endpoint: ApiEndpoint, pactGroupName: string) {
  await verify(endpoint, pactGroupName)
    .catch(() => process.exit(1))
}

/* eslint-disable  @typescript-eslint/no-explicit-any */
async function verifyConvert(): Promise<any> {
  await getConvertPactGroups().reduce(async (promise, group) => {
    await promise
    await verifyOnce("convert", group)
  }, Promise.resolve())
}

/* eslint-disable  @typescript-eslint/no-explicit-any */
async function verifyPrepare(): Promise<any> {
    await getPreparePactGroups().reduce(async (promise, group) => {
      await promise
      await verifyOnce("prepare", group)
    }, Promise.resolve())
}

/* eslint-disable  @typescript-eslint/no-explicit-any */
async function verifyProcess(): Promise<any> {
    await getProcessSendPactGroups().reduce(async (promise, group) => {
      await promise
      await verifyOnce("process", group)
    }, Promise.resolve())

    await getProcessDispensePactGroups().reduce(async (promise, group) => {
      await promise
      await verifyOnce("process", `${group}-dispense`)
    }, Promise.resolve())

    await getProcessCancelPactGroups().reduce(async (promise, group) => {
      await promise
      await verifyOnce("process", `${group}-cancel`)
    }, Promise.resolve())
}

/* eslint-disable  @typescript-eslint/no-explicit-any */
async function verifyRelease(): Promise<any> {
  await getReleasePactGroups().reduce(async (promise, group) => {
    await promise
    await verifyOnce("release", group)
  }, Promise.resolve())
}

(async () => {
  verifyConvert()
    .then(verifyPrepare)
    .then(verifyProcess)
    .then(verifyRelease)
})()

