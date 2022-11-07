import Hapi from "@hapi/hapi"

import {fhir} from "@models"
import {RequestHeaders} from "../../src/utils/headers"
import {createServer} from "../../src/server"
import * as TestResources from "../resources/test-resources"
import {configureLogging, getPostRequestValidHeaders, testIfValidPayload} from "./helpers"
import {PayloadIdentifiersValidator} from "./validation"
import {
  expectPayloadAuditLogs,
  expectPayloadIdentifiersAreLogged,
  expectPrepareEndpointParametersAreLogged
} from "./expectations"

// eslint-disable-next-line max-len
describe.each(TestResources.specification)("When a request payload is sent to a", (example: TestResources.ExamplePrescription) => {
  let server: Hapi.Server
  let headers: Hapi.Util.Dictionary<string>
  let logs: Array<Hapi.RequestLog>

  beforeAll(async () => {
    server = await createServer({collectLogs: true})
    configureLogging(server)
    await server.initialize()

    headers = TestResources.validTestHeaders
    headers[RequestHeaders.SKIP_VALIDATION] = "true"
  })

  afterAll(async () => {
    await server.stop()
  })

  describe("prescribing endpoint", () => {
    let bundle: fhir.Bundle

    describe("$\\prepare", () => {
      beforeAll(async () => {
        bundle = example.fhirMessageUnsigned
        const request = getPostRequestValidHeaders("/FHIR/R4/$prepare", headers, bundle)
        const res = await server.inject(request)
        logs = res.request.logs
      })

      test("the payload hash is logged", async () => {
        expectPayloadAuditLogs(logs)
      })

      test("digest, timestamp, and algorithm are logged", async () => {
        expectPrepareEndpointParametersAreLogged(logs)
      })

      test("payload identifiers are logged", async () => {
        expectPayloadIdentifiersAreLogged(logs)
      })
    })

    describe("/$\\process-message#prescription-order", () => {
      let bundle: fhir.Bundle

      beforeAll(async () => {
        bundle = example.fhirMessageSigned
        const request = getPostRequestValidHeaders("/FHIR/R4/$process-message", headers, bundle)
        const res = await server.inject(request)
        logs = res.request.logs
      })

      test("the payload hash is logged", async () => {
        expectPayloadAuditLogs(logs)
      })

      test("payload identifiers are logged", async () => {
        expectPayloadIdentifiersAreLogged(logs)
      })
    })

    describe("/$\\process-message#prescription-order-update", () => {
      let bundle: fhir.Bundle

      beforeAll(async () => {
        bundle = example.fhirMessageSigned
        const request = getPostRequestValidHeaders("/FHIR/R4/$process-message", headers, bundle)
        const res = await server.inject(request)
        logs = res.request.logs
      })

      test("the payload hash is logged", async () => {
        expectPayloadAuditLogs(logs)
      })

      test("payload identifiers are logged", async () => {
        expectPayloadIdentifiersAreLogged(logs)
      })
    })
  })

  describe("dispensing endpoint", () => {

    describe("/\\$verify-signature", () => {
      let bundle: fhir.Bundle

      beforeAll(async () => {
        bundle = example.fhirMessageSigned
        const request = getPostRequestValidHeaders("/FHIR/R4/$verify-signature", headers, bundle)
        const res = await server.inject(request)
        logs = res.request.logs
      })

      test("the payload hash is logged", async () => {
        expectPayloadAuditLogs(logs)
      })

      test("payload identifiers are logged", async () => {
        expectPayloadIdentifiersAreLogged(logs)
      })
    })

    describe("/$process-message#dispense-notification", () => {
      let bundle: fhir.Bundle

      beforeAll(async () => {
        bundle = example.fhirMessageSigned
        const request = getPostRequestValidHeaders("/FHIR/R4/$process-message", headers, bundle)
        const res = await server.inject(request)
        logs = res.request.logs
      })

      test("the payload hash is logged", async () => {
        expectPayloadAuditLogs(logs)
      })

      test("payload identifiers are logged", async () => {
        expectPayloadIdentifiersAreLogged(logs)
      })
    })

    describe("/Claim", () => {
      let claim: fhir.Claim

      beforeAll(async () => {
        claim = example.fhirMessageClaim
        const request = getPostRequestValidHeaders("/FHIR/R4/Claim", headers, claim)
        const res = await server.inject(request)
        logs = res.request.logs
      })

      testIfValidPayload(example.fhirMessageClaim)("the payload hash is logged", async () => {
        expectPayloadAuditLogs(logs)
      })

      testIfValidPayload(example.fhirMessageClaim)("payload identifiers are logged", async () => {
        expectPayloadIdentifiersAreLogged(logs)
      })
    })

    describe("/Task/$\\release", () => {
      let parameters: fhir.Parameters

      beforeAll(async () => {
        parameters = example.fhirMessageReleaseRequest
        const request = getPostRequestValidHeaders("/FHIR/R4/Task/$release", headers, parameters)
        const res = await server.inject(request)
        logs = res.request.logs
      })

      testIfValidPayload(example.fhirMessageReleaseRequest)("the payload hash is logged", async () => {
        expectPayloadAuditLogs(logs)
      })

      testIfValidPayload(example.fhirMessageReleaseRequest)("payload identifiers are logged", async () => {
        const validator = new PayloadIdentifiersValidator()
        // Parameters type payload don't have a top level identifier, and
        // release requests don't include the patient's NHS number
        validator.payloadIdentifier("NotProvided").nhsNumber("NotProvided")
        expectPayloadIdentifiersAreLogged(logs, validator)
      })

      // TODO: Log release response message?
    })

    describe("/Task#return ", () => {
      let task: fhir.Task

      beforeAll(async () => {
        task = example.fhirMessageReturnRequest
        const request = getPostRequestValidHeaders("/FHIR/R4/Task", headers, task)
        const res = await server.inject(request)
        logs = res.request.logs
      })

      testIfValidPayload(example.fhirMessageReturnRequest)("the payload hash is logged", async () => {
        expectPayloadAuditLogs(logs)
      })

      testIfValidPayload(example.fhirMessageClaim)("payload identifiers are logged", async () => {
        expectPayloadIdentifiersAreLogged(logs)
      })
    })

    describe("/Task#withdraw ", () => {
      let task: fhir.Task

      beforeAll(async () => {
        task = example.fhirMessageWithdrawRequest
        const request = getPostRequestValidHeaders("/FHIR/R4/Task", headers, task)
        const res = await server.inject(request)
        logs = res.request.logs
      })

      testIfValidPayload(example.fhirMessageWithdrawRequest)("the payload hash is logged", async () => {
        expectPayloadAuditLogs(logs)
      })

      testIfValidPayload(example.fhirMessageClaim)("payload identifiers are logged", async () => {
        expectPayloadIdentifiersAreLogged(logs)
      })
    })
  })
})
