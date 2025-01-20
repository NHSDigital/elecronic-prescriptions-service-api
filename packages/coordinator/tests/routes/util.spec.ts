import {
  callFhirValidator,
  ContentTypes,
  filterValidatorResponse,
  handleResponse,
  VALIDATOR_HOST
} from "../../src/routes/util"
import {clone} from "../resources/test-helpers"
import * as TestResources from "../resources/test-resources"
import {getMessageHeader} from "../../src/services/translation/common/getResourcesOfType"
import axios from "axios"
import MockAdapter from "axios-mock-adapter"
import {fhir, spine} from "@models"
import {identifyMessageType} from "../../src/services/translation/common"
import * as Hapi from "@hapi/hapi"
import * as HapiShot from "@hapi/shot"

jest.mock("../../src/services/translation/response", () => ({
  translateToFhir: () => ({statusCode: 200, fhirResponse: {value: "some FHIR response"}})
}))

const mock = new MockAdapter(axios)

describe("forward header", ()=> {
  afterEach(() => {
    mock.reset()
  })

  test("API only forwards valid headers to validator", async () => {
    mock.onPost(`${VALIDATOR_HOST}/$validate`).reply(200, {resourceType: "OperationOutcome"})

    const exampleHeaders = {
      accept: "application/json+fhir",
      "content-type": "application/my-content-type",
      "x-request-id": "my_x_request_id",
      "x-amzn-trace-id": "my_x_amzn_trace_id",
      "nhsd-correlation-id": "my_nhsd_correlation_id",
      "nhsd-request-id": "my_nhsd_request_id"
    }

    await callFhirValidator("data", exampleHeaders)
    const requestHeaders = mock.history.post[0].headers
    expect(requestHeaders["Accept"]).not.toBe("application/json+fhir")
    expect(requestHeaders["Content-Type"]).toBe("application/my-content-type")
    expect(requestHeaders["x-request-id"]).toBe("my_x_request_id")
    expect(requestHeaders["x-amzn-trace-id"]).toBe("my_x_amzn_trace_id")
    expect(requestHeaders["nhsd-correlation-id"]).toBe("my_nhsd_correlation_id")
    expect(requestHeaders["nhsd-request-id"]).toBe("my_nhsd_request_id")
  })
})

describe("identifyMessageType", () => {
  let bundle: fhir.Bundle
  let messageHeader: fhir.MessageHeader

  beforeEach(() => {
    bundle = clone(TestResources.specification[0].fhirMessageUnsigned)
    messageHeader = getMessageHeader(bundle)
  })

  test("identifies a prescription message correctly", () => {
    const messageType = fhir.EventCodingCode.PRESCRIPTION
    messageHeader.eventCoding.code = messageType
    expect(identifyMessageType(bundle)).toBe(messageType)
  })
})

function createRoute<T>(spineResponse: spine.SpineDirectResponse<T> | spine.SpinePollableResponse): Hapi.ServerRoute {
  return {
    method: "POST",
    path: "/test",
    handler: async (request, responseToolkit) => {
      return await handleResponse(request, spineResponse, responseToolkit)
    }
  }
}

function createRouteOptions<T>(
  spineResponse: spine.SpineDirectResponse<T> | spine.SpinePollableResponse,
  headers?: HapiShot.RequestOptions["headers"]
) {
  return {
    method: "POST",
    url: "/test",
    headers: headers,
    payload: spineResponse
  }
}

describe("handleResponse", () => {
  let server: Hapi.Server

  beforeEach(async () => {
    server = Hapi.server()
  })

  afterEach(async () => {
    await server.stop()
  })

  test("pollable response", async () => {
    const spineResponse: spine.SpinePollableResponse = {
      pollingUrl: "testUrl",
      statusCode: 202
    }

    server.route([createRoute(spineResponse)])

    const response = await server.inject(createRouteOptions(spineResponse))

    expect(response.headers["content-location"]).toBe("testUrl")
  })

  test("operationOutcome response", async () => {
    const operationOutcome: fhir.OperationOutcome = {
      resourceType: "OperationOutcome",
      issue: []
    }
    const spineResponse: spine.SpineDirectResponse<fhir.OperationOutcome> = {
      body: operationOutcome,
      statusCode: 200
    }

    server.route([createRoute(spineResponse)])

    const response = await server.inject(createRouteOptions(spineResponse))

    expect(JSON.parse(response.payload)).toEqual(operationOutcome)
    expect(response.headers["content-type"]).toEqual(ContentTypes.FHIR)
  })

  test("bundle response", async () => {
    const bundle: fhir.Bundle = {
      resourceType: "Bundle",
      entry: []
    }
    const spineResponse: spine.SpineDirectResponse<fhir.Bundle> = {
      body: bundle,
      statusCode: 200
    }

    server.route([createRoute(spineResponse)])

    const response = await server.inject(createRouteOptions(spineResponse))

    expect(JSON.parse(response.payload)).toEqual(bundle)
    expect(response.headers["content-type"]).toEqual(ContentTypes.FHIR)
  })

  test("xml response", async () => {
    const spineResponse: spine.SpineDirectResponse<string> = {
      body: "some xml response",
      statusCode: 200
    }

    server.route([createRoute(spineResponse)])

    const response = await server.inject(createRouteOptions(spineResponse, {"X-Raw-Response": "true"}))

    expect(response.payload).toEqual("some xml response")
    expect(response.headers["content-type"]).toEqual(ContentTypes.XML)
  })

  test("fhir response", async () => {
    const spineResponse: spine.SpineDirectResponse<string> = {
      body: "some xml response",
      statusCode: 200
    }

    server.route([createRoute(spineResponse)])

    const response = await server.inject(createRouteOptions(spineResponse))

    expect(JSON.parse(response.payload)).toEqual({value: "some FHIR response"})
    expect(response.headers["content-type"]).toEqual(ContentTypes.FHIR)
  })
})

describe("filterValidatorResponse", () => {
  test("returns errors if present", () => {
    const validatorResponse: fhir.OperationOutcome = {
      resourceType: "OperationOutcome",
      issue: [
        {
          code: undefined,
          severity: "error"
        }
      ]
    }
    expect(filterValidatorResponse(validatorResponse, false).issue).toHaveLength(1)
  })

  test("returns empty if no errors", () => {
    const validatorResponse: fhir.OperationOutcome = {
      resourceType: "OperationOutcome",
      issue: [
        {
          code: undefined,
          severity: "warning"
        }
      ]
    }
    expect(filterValidatorResponse(validatorResponse, false).issue).toHaveLength(0)
  })

  test("ignores errors that have nhsNumberVerification", () => {
    const validatorResponse: fhir.OperationOutcome = {
      resourceType: "OperationOutcome",
      issue: [
        {
          severity: "error",
          code: fhir.IssueCodes.PROCESSING,

          diagnostics:
            "None of the codes provided are in the value set " +
            "https://fhir.hl7.org.uk/ValueSet/UKCore-NHSNumberVerificationStatus " +
            "(https://fhir.hl7.org.uk/ValueSet/UKCore-NHSNumberVerificationStatus), " +
            "and a code from this value set is required) " +
            "(codes = https://fhir.hl7.org.uk/CodeSystem/UKCore-NHSNumberVerificationStatus#01)"
        },
        {
          severity: "error",
          code: fhir.IssueCodes.PROCESSING,

          diagnostics:
            "Unknown code 'https://fhir.hl7.org.uk/CodeSystem/UKCore-NHSNumberVerificationStatus#01' for " +
            "'https://fhir.hl7.org.uk/CodeSystem/UKCore-NHSNumberVerificationStatus#01'"
        }
      ]
    }
    expect(filterValidatorResponse(validatorResponse, false).issue).toHaveLength(0)
  })
})
