import {fhir} from "@models"
import {InteractionObject, PactOptions} from "@pact-foundation/pact"
import path from "path"
import * as uuid from "uuid"
import * as LosslessJson from "lossless-json"
import {HTTPMethod} from "@pact-foundation/pact/src/common/request"
import {AnyTemplate} from "@pact-foundation/pact/src/dsl/matchers"

export const basePath = "/FHIR/R4"

export class CreatePactOptions {
  apiMode: ApiMode
  apiEndpoint: ApiEndpoint
  apiOperation?: ApiOperation
  constructor(apiMode: ApiMode, apiEndpoint: ApiEndpoint, apiOperation?: ApiOperation) {
    this.apiMode = apiMode
    this.apiEndpoint = apiEndpoint
    this.apiOperation = apiOperation
  }
}

export type ApiMode = "live" | "sandbox"
export type ApiEndpoint = "prepare" | "process" | "task" | "claim" |
  "validate" | "verify-signature" | "metadata" | "tracker"
export type ApiOperation = "send" | "cancel" | "dispense" | "dispenseamend" |
                        "release" | "return" | "withdraw" | "amend" | "tracker"

// used to add type-safety for adding a new pact
export function pactOptions(options: CreatePactOptions): PactOptions {
  const sandbox = options.apiMode === "sandbox"
  const pacticipant_suffix = sandbox ? "-sandbox" : ""
  return {
    spec: 2,
    consumer: `nhsd-apim-eps-test-client${pacticipant_suffix}+${process.env.PACT_VERSION}`,
    /* eslint-disable-next-line max-len */
    provider: `nhsd-apim-eps${pacticipant_suffix}+${options.apiEndpoint}${options.apiOperation ? "-" + options.apiOperation : ""}+${process.env.PACT_VERSION}`,
    pactfileWriteMode: "merge",
    dir: path.join(__dirname, "../pact/pacts"),
    logLevel: "info"
  }
}

// helper functions
function isStringParameter(parameter: fhir.Parameter): parameter is fhir.StringParameter {
  return (parameter as fhir.StringParameter).valueString !== undefined
}

export function getStringParameterByName(parameters: fhir.Parameters, name: string): fhir.StringParameter {
  const stringParams = parameters.parameter.filter(param => isStringParameter(param)) as Array<fhir.StringParameter>
  const namedStringParams = stringParams.filter(param => param.name === name)
  if (namedStringParams.length === 1) return namedStringParams[0]
}

export const successfulOperationOutcome = {
  resourceType: "OperationOutcome",
  issue: [
    {
      code: "informational",
      severity: "information",
      details: undefined
    }
  ]
}

export function getHeaders(): {[header: string]: string} {
  const requestId = uuid.v4()
  const correlationId = uuid.v4()
  return {
    "Content-Type": "application/fhir+json; fhirVersion=4.0",
    "X-Request-ID": requestId,
    "X-Correlation-ID": correlationId,
    "Authorization": `Bearer ${process.env.APIGEE_ACCESS_TOKEN}`
  }
}

export function createInteraction(
  options: CreatePactOptions,
  requestBody?: fhir.Resource,
  responseExpectation?: AnyTemplate,
  uponRecieving?: string,
  statusCodeExpectation?: number
): InteractionObject {
  const path = getApiPath(options.apiEndpoint, options.apiOperation)
  const method = getHttpMethod(options.apiEndpoint, options.apiOperation)
  if (method === "POST" && !requestBody) {
    throw new Error(`Endpoint: '${options.apiEndpoint}' expects a POST, missing: 'requestBody'`)
  }

  const interaction: InteractionObject = {
    state: null,
    uponReceiving: uponRecieving ?? "a valid FHIR message",
    withRequest: {
      headers: getHeaders(),
      method,
      path,
      body: requestBody ? LosslessJson.stringify(requestBody) : undefined
    },
    willRespondWith: {
      headers: {
        "Content-Type": "application/fhir+json; fhirVersion=4.0"
      },
      body: responseExpectation,
      status: statusCodeExpectation ?? 200
    }
  }

  return interaction
}

function getHttpMethod(endpoint: ApiEndpoint, apiOperation: ApiOperation): HTTPMethod {
  switch (endpoint) {
    case "prepare":
    case "process":
    case "verify-signature":
    case "validate":
    case "claim":
      return "POST"

    case "task":
      switch(apiOperation) {
        case "tracker":
          return "GET"
        default:
          return "POST"
      }

    case "tracker":
    case "metadata":
      return "GET"

    default:
      throw new Error(`Could not get the correct HTTP Method for endpoint: '${endpoint}'`)
  }
}

function getApiPath(endpoint: ApiEndpoint, apiOperation: ApiOperation): string {
  switch (endpoint) {
    case "metadata":
      return "/metadata"
    case "prepare":
      return `${basePath}/$prepare`
    case "process":
      return `${basePath}/$process-message`
    case "verify-signature":
      return `${basePath}/$verify-signature`
    case "validate":
      return `${basePath}/$validate`
    case "claim":
      return `${basePath}/Claim`
    case "tracker":
      return `${basePath}/Tracker`

    case "task":
      switch(apiOperation) {
        case "return":
        case "withdraw":
        case "tracker":
          return `${basePath}/Task`
        case "release":
          return `${basePath}/Task/$release`
      }
      break

    default:
      throw new Error(`Could not get the correct api path for endpoint: '${endpoint}'`)
  }
}
