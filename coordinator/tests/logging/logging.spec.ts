import Hapi from "@hapi/hapi"

import {fhir} from "@models"
import {RequestHeaders} from "../../src/utils/headers"
import {createServer} from "../../src/server"
import * as TestResources from "../resources/test-resources"
import {PayloadIdentifiers} from "../../src/routes/logging"
import {
  configureLogging,
  expectPayloadAuditLogs,
  getPostRequestValidHeaders,
  isPrepareEndpointResponse,
  testIfValidPayload
} from "./helpers"
import {PayloadIdentifiersValidator} from "./validation"

// Custom matcher
// https://medium.com/@andrei.pfeiffer/jest-matching-objects-in-array-50fe2f4d6b98
expect.extend({
  toContainObject(received: unknown, argument: unknown) {
    const pass = this.equals(received,
      expect.arrayContaining([
        expect.objectContaining(argument)
      ])
    )

    if (pass) {
      return {
        // eslint-disable-next-line max-len
        message: () => (`expected ${this.utils.printReceived(received)} not to contain object ${this.utils.printExpected(argument)}`),
        pass: true
      }
    } else {
      return {
        // eslint-disable-next-line max-len
        message: () => (`expected ${this.utils.printReceived(received)} to contain object ${this.utils.printExpected(argument)}`),
        pass: false
      }
    }
  }
})

type PayloadIdentifiersLog = {
  payloadIdentifiers: PayloadIdentifiers
}

const isPayloadIdentifiersLog = (logData: string | Record<string, unknown>): logData is PayloadIdentifiersLog => {
  return typeof logData === "object" && "payloadIdentifiers" in logData
}

let server: Hapi.Server
let headers: Hapi.Util.Dictionary<string>
let logs: Array<Hapi.RequestLog>

const testPayloadIdentifiersAreLogged = (logs: Array<Hapi.RequestLog>, validator?: PayloadIdentifiersValidator) => {
  const identifiers = getPayloadIdentifiersFromLogs(logs)

  // Check that some identifiers were found
  expect(identifiers.length).toBeGreaterThan(0)

  const identifiersValidator = validator ?? new PayloadIdentifiersValidator()
  identifiersValidator.validateArray(identifiers)
}

const getPayloadIdentifiersFromLogs = (logs: Array<Hapi.RequestLog>): Array<PayloadIdentifiers> => {
  return logs
    .filter(log => isPayloadIdentifiersLog(log.data))
    .map(log => (log.data as PayloadIdentifiersLog).payloadIdentifiers)
}

// eslint-disable-next-line max-len
describe.each(TestResources.specification)("When a request payload is sent to a", (example: TestResources.ExamplePrescription) => {
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
        logs.forEach((log) => {
          if (isPrepareEndpointResponse(log.data)) {
            expect(log.data.PrepareEndpointResponse.parameter).toContainObject({name: "digest"})
            expect(log.data.PrepareEndpointResponse.parameter).toContainObject({name: "timestamp"})
            expect(log.data.PrepareEndpointResponse.parameter).toContainObject({name: "algorithm"})
          }
        })
      })

      test("payload identifiers are logged", async () => {
        testPayloadIdentifiersAreLogged(logs)
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
        testPayloadIdentifiersAreLogged(logs)
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
        testPayloadIdentifiersAreLogged(logs)
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
        testPayloadIdentifiersAreLogged(logs)
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
        testPayloadIdentifiersAreLogged(logs)
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
        const validator = new PayloadIdentifiersValidator()
        validator.senderOdsCode("NotProvided") // value currently not logged/provided
        testPayloadIdentifiersAreLogged(logs, validator)
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
        validator.nhsNumber("NotProvided") // value currently not logged/provided
        testPayloadIdentifiersAreLogged(logs, validator)
      })
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
        testPayloadIdentifiersAreLogged(logs)
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
        testPayloadIdentifiersAreLogged(logs)
      })
    })
  })
})
