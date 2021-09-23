import {InteractionObject} from "@pact-foundation/pact"
import * as jestpact from "jest-pact"
import supertest from "supertest"
import {basePath, pactOptions} from "../../resources/common"
import * as uuid from "uuid"
import {createUnauthorisedInteraction} from "./auth"
import * as LosslessJson from "lossless-json"
import {fetcher, fhir} from "@models"
import * as TestResources from "../../resources/test-resources"
import {updatePrescriptions} from "../../services/update-prescriptions"
import {generateTestOutputFile} from "../../services/genereate-test-output-file"
import pino from "pino"

const logger = pino()

const apiPath = `${basePath}/$process-message`
jestpact.pactWith(
  pactOptions("live", "process", "send"),
  /* eslint-disable  @typescript-eslint/no-explicit-any */
  async (provider: any) => {
    const client = () => {
      const url = `${provider.mockService.baseUrl}`
      return supertest(url)
    }

    const authenticationTestDescription = "a request to process an unauthorised message"

    beforeAll(async() => {
      if (process.env.UPDATE_PRESCRIPTIONS !== "false") {
        await updatePrescriptions(
          fetcher.prescriptionOrderExamples.filter(e => !e.isSuccess),
          [],
          [],
          [],
          [],
          logger
        )
      }
      generateTestOutputFile()
    })

    describe("endpoint authentication e2e tests", () => {
      test(authenticationTestDescription, async () => {
        const apiPath = `${basePath}/$process-message`
        const interaction: InteractionObject = createUnauthorisedInteraction(authenticationTestDescription, apiPath)
        const requestId = uuid.v4()
        const correlationId = uuid.v4()
        await provider.addInteraction(interaction)
        await client()
          .post(apiPath)
          .set("Content-Type", "application/fhir+json; fhirVersion=4.0")
          .set("X-Request-ID", requestId)
          .set("X-Correlation-ID", correlationId)
          .send({})
          .expect(401)
      })
    })

    describe("ensure errors are translated", () => {
      test("EPS Prescribe error 0003", async () => {
        const message = TestResources.prepareCaseBundles[0][1] as fhir.Bundle
        const messageClone = LosslessJson.parse(LosslessJson.stringify(message)) as fhir.Bundle
        messageClone.identifier.value = uuid.v4().toUpperCase()
        const bundleStr = LosslessJson.stringify(messageClone)
        const bundle = JSON.parse(bundleStr) as fhir.Bundle

        const requestId = uuid.v4()
        const correlationId = uuid.v4()

        const firstMedicationRequest = messageClone.entry.map(e => e.resource)
          .find(r => r.resourceType === "MedicationRequest") as fhir.MedicationRequest
        const prescriptionId = firstMedicationRequest.groupIdentifier.value

        const interaction: InteractionObject = {
          state: "is authenticated",
          uponReceiving: `a request to process prescription: ${prescriptionId} - No digital signature message to Spine`,
          withRequest: {
            headers: {
              "Content-Type": "application/fhir+json; fhirVersion=4.0",
              "X-Request-ID": requestId,
              "X-Correlation-ID": correlationId
            },
            method: "POST",
            path: apiPath,
            body: bundle
          },
          willRespondWith: {
            headers: {
              "Content-Type": "application/json"
            },
            body: {
              resourceType: "OperationOutcome",
              issue: [
                {
                  code: "business-rule",
                  severity: "error",
                  details: {
                    coding: [{
                      system: "https://fhir.nhs.uk/CodeSystem/EPS-IssueCode",
                      code: "MISSING_DIGITAL_SIGNATURE",
                      display: "Digital signature not found"
                    }]
                  }
                }
              ]
            },
            status: 400
          }
        }
        await provider.addInteraction(interaction)
        await client()
          .post(apiPath)
          .set("Content-Type", "application/fhir+json; fhirVersion=4.0")
          .set("X-Request-ID", requestId)
          .set("X-Correlation-ID", correlationId)
          .send(bundleStr)
          .expect(400)
      })

      test.each(TestResources.processErrorCases)("returns correct status code and body for %p", async (
        _: string, request: fhir.Bundle, response: fhir.OperationOutcome, statusCode: number, statusText: string
      ) => {
        const bundleStr = LosslessJson.stringify(request)

        const requestId = uuid.v4()
        const correlationId = uuid.v4()

        const firstMedicationRequest = request.entry.map(e => e.resource)
          .find(r => r.resourceType === "MedicationRequest") as fhir.MedicationRequest
        const prescriptionId = firstMedicationRequest.groupIdentifier.value

        const interaction: InteractionObject = {
          state: "is authenticated",
          uponReceiving: `a failed request (${statusText}) to process prescription: ${prescriptionId}`,
          withRequest: {
            headers: {
              "Content-Type": "application/fhir+json; fhirVersion=4.0",
              "X-Request-ID": requestId,
              "X-Correlation-ID": correlationId
            },
            method: "POST",
            path: apiPath,
            body: JSON.parse(bundleStr)
          },
          willRespondWith: {
            headers: {
              "Content-Type": "application/json"
            },
            body: response,
            status: statusCode
          }
        }
        await provider.addInteraction(interaction)
        await client()
          .post(apiPath)
          .set("Content-Type", "application/fhir+json; fhirVersion=4.0")
          .set("X-Request-ID", requestId)
          .set("X-Correlation-ID", correlationId)
          .send(bundleStr)
          .expect(400)
      })
    })

    test("should reject a message with an invalid SDS Role Profile ID", async () => {
      const message = TestResources.processOrderCases[0][1]
      const bundleStr = LosslessJson.stringify(message)
      const bundle = JSON.parse(bundleStr) as fhir.Bundle
      const requestId = uuid.v4()
      const correlationId = uuid.v4()
      const interaction: InteractionObject = {
        state: "is authenticated",
        uponReceiving: `a request with an invalid SDS Role Profile ID`,
        withRequest: {
          headers: {
            "Content-Type": "application/fhir+json; fhirVersion=4.0",
            "X-Request-ID": requestId,
            "X-Correlation-ID": correlationId,
            "NHSD-Session-URID": "invalid"
          },
          method: "POST",
          path: apiPath,
          body: bundle
        },
        willRespondWith: {
          headers: {
            "Content-Type": "application/json"
          },
          body: {
            "resourceType": "OperationOutcome",
            "issue": [
              {
                "severity": "error",
                "code": "value",
                "details": {
                  "coding": [
                    {
                      "system": "https://fhir.nhs.uk/R4/CodeSystem/Spine-ErrorOrWarningCode",
                      "version": "1",
                      "code": "INVALID_VALUE",
                      "display": "Provided value is invalid"
                    }
                  ]
                },
                "diagnostics": "Invalid value - 'invalid' in header 'NHSD-Session-URID'"
              }
            ]
          },
          status: 400
        }
      }
      await provider.addInteraction(interaction)
      await client()
        .post(apiPath)
        .set("Content-Type", "application/fhir+json; fhirVersion=4.0")
        .set("X-Request-ID", requestId)
        .set("X-Correlation-ID", correlationId)
        .set("NHSD-Session-URID", "invalid")
        .send(bundleStr)
        .expect(400)
    })
  }
)
