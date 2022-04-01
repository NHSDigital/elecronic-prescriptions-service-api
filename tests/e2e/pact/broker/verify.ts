import {VerifierV3, VerifierV3Options} from "@pact-foundation/pact"
import {ApiEndpoint, ApiOperation, basePath} from "../resources/common"
/* eslint-disable-next-line  @typescript-eslint/no-var-requires, @typescript-eslint/no-unused-vars */
const register = require("tsconfig-paths/register")
import {fetcher, fhir} from "@models"
import {getIdentifierParameterByName} from "@coordinator"
import path from "path"
import axios from "axios"
import * as uuid from "uuid"

let token: string

/* eslint-disable  @typescript-eslint/no-explicit-any */
async function verify(endpoint: string, operation?: string): Promise<any> {
  const useBroker = process.env.PACT_USE_BROKER !== "false"
  const providerVersion = process.env.PACT_TAG
    ? `${process.env.PACT_VERSION} (${process.env.PACT_TAG})`
    : process.env.PACT_VERSION
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
    },
    callbackTimeout: 30000
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
      pactBrokerPassword: process.env.PACT_BROKER_BASIC_AUTH_PASSWORD
    }
  } else {
    const pacticipant_suffix = process.env.APIGEE_ENVIRONMENT?.includes("sandbox") ? "-sandbox" : ""
    verifierOptions = {
      ...verifierOptions,
      pactUrls: [
        // eslint-disable-next-line max-len
        `${path.join(__dirname, "../pact/pacts")}/nhsd-apim-eps-test-client${pacticipant_suffix}+${process.env.PACT_VERSION}-${process.env.PACT_PROVIDER}+${endpoint}${operation ? "-" + operation : ""}+${process.env.PACT_VERSION}.json`
      ]
    }
  }

  const verifier = new VerifierV3(verifierOptions)
  return await verifier.verifyProvider()
}

async function verifyOnce(endpoint: ApiEndpoint, operation?: ApiOperation) {
  // debug endpoints not available in prod
  if (process.env.APIGEE_ENVIRONMENT !== "prod" || (endpoint !== "validate")) {
    await verify(endpoint, operation)
      .catch(() => process.exit(1))
  }
}

async function verifyValidate(): Promise<void> {
  await verifyOnce("validate")
}

async function verifyVerifySignatures(): Promise<void> {
  await verifyOnce("verify-signature")
}

async function verifyPrepare(): Promise<void> {
  await verifyOnce("prepare")
}

async function verifySend(): Promise<void> {
  await verifyOnce("process", "send")
}

async function verifyCancel(): Promise<void> {
  await verifyOnce("process", "cancel")
}

async function verifyRelease(): Promise<void> {
  await verifyOnce("task", "release")
}

async function verifyDispense(): Promise<void> {
  await verifyOnce("process", "dispense")
}

async function verifyDispenseAmend(): Promise<void> {
  await verifyOnce("process", "dispenseamend")
}

async function verifyReturn(): Promise<void> {
  await verifyOnce("task", "return")
}

async function verifyWithdraw(): Promise<void> {
  await verifyOnce("task", "withdraw")
}

async function verifyClaim(): Promise<void> {
  await verifyOnce("claim")
}

async function verifyClaimAmend(): Promise<void> {
  await verifyOnce("claim", "amend")
}

async function verifyMetadata(): Promise<void> {
  await verifyOnce("metadata")
}

async function verifyTracker(): Promise<void> {
  await verifyOnce("tracker")
}

async function clearData() {
  if (process.env.APIGEE_ENVIRONMENT?.includes("sandbox")) {
    return
  }

  const nominatedReleaseRequests = fetcher.taskReleaseExamples
    .filter(task => task.isSuccess)
    .map(task => task.request)
    .filter(isNominatedRelease)

  for (const nominatedReleaseRequest of nominatedReleaseRequests) {
    let response
    do {
      console.log(
        "Clearing Prescriptions For: ",
        getIdentifierParameterByName(nominatedReleaseRequest.parameter, "owner").valueIdentifier.value
      )
      response = await sendReleaseRequest(nominatedReleaseRequest)
    }
    while (response.data.resourceType !== "OperationOutcome")
  }
}

async function sendReleaseRequest(releaseRequest: fhir.Parameters) {
  return await axios.post<fhir.Bundle | fhir.OperationOutcome>(
    `${process.env.PACT_PROVIDER_URL}${basePath}/Task/$release`,
    releaseRequest,
    {
      headers: {
        "Content-Type": "application/fhir+json; fhirVersion=4.0",
        "X-Request-ID": uuid.v4(),
        "X-Correlation-ID": uuid.v4(),
        "Authorization": `Bearer ${process.env.APIGEE_ACCESS_TOKEN}`
      }
    }
  ).catch((e) => {
    console.log(e.message)
    console.log(e.response)
    process.exit(1)
  })
}

function isNominatedRelease(parameters: fhir.Parameters): boolean {
  return !parameters.parameter.find(isGroupIdentifier)
}

function isGroupIdentifier(parameter: fhir.Parameter): boolean {
  return parameter.name === "group-identifier"
}

(async () => {
  await clearData()
    .then(verifyValidate)
    .then(verifyVerifySignatures)
    .then(verifyPrepare)
    .then(verifySend)
    .then(verifyCancel)
    .then(verifyRelease)
    .then(verifyReturn)
    .then(verifyDispense)
    .then(verifyDispenseAmend)
    .then(verifyClaim)
    .then(verifyWithdraw)
    .then(verifyMetadata)
    .then(verifyTracker)
    .then(verifyClaimAmend)
})()
