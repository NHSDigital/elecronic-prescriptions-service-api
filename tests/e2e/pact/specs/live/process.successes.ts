import {InteractionObject} from "@pact-foundation/pact"
import * as jestpact from "jest-pact"
import supertest from "supertest"
import * as TestResources from "../../resources/test-resources"
import * as LosslessJson from "lossless-json"
import * as uuid from "uuid"
import {basePath, pactOptions} from "../../resources/common"
import {fetcher, fhir} from "@models"
import {generateShortFormId, setPrescriptionIds} from "../../services/update-prescriptions"

jestpact.pactWith(
  pactOptions("live", "process", "send"),
  /* eslint-disable  @typescript-eslint/no-explicit-any */
  async (provider: any) => {
    const client = () => {
      const url = `${provider.mockService.baseUrl}`
      return supertest(url)
    }

    describe("process-message send e2e tests", () => {
      test.each(TestResources.processOrderCases)(
        "should be able to send %s",
        async (desc: string, message: fhir.Bundle) => {
          const apiPath = `${basePath}/$process-message`
          const bundleStr = LosslessJson.stringify(message)
          const bundle = JSON.parse(bundleStr) as fhir.Bundle

          const requestId = uuid.v4()
          const correlationId = uuid.v4()

          const firstMedicationRequest = message.entry.map(e => e.resource)
            .find(r => r.resourceType === "MedicationRequest") as fhir.MedicationRequest
          const prescriptionId = firstMedicationRequest.groupIdentifier.value

          const interaction: InteractionObject = {
            state: "is authenticated",
            uponReceiving: `a request to process prescription: ${prescriptionId} - ${desc} message to Spine`,
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
                    code: "informational",
                    severity: "information"
                  }
                ]
              },
              status: 200
            }
          }
          await provider.addInteraction(interaction)
          await client()
            .post(apiPath)
            .set("Content-Type", "application/fhir+json; fhirVersion=4.0")
            .set("X-Request-ID", requestId)
            .set("X-Correlation-ID", correlationId)
            .send(bundleStr)
            .expect(200)
        })
    })
  }
)

jestpact.pactWith(
  pactOptions("live", "process", "cancel"),
  /* eslint-disable  @typescript-eslint/no-explicit-any */
  async (provider: any) => {
    const client = () => {
      const url = `${provider.mockService.baseUrl}`
      return supertest(url)
    }

    describe("process-message cancel e2e tests", () => {
      test.each(TestResources.processOrderUpdateCases)(
        "should be able to cancel %s",
        async (desc: string, message: fhir.Bundle) => {
          const apiPath = `${basePath}/$process-message`
          const bundleStr = LosslessJson.stringify(message)
          const bundle = JSON.parse(bundleStr) as fhir.Bundle

          const requestId = uuid.v4()
          const correlationId = uuid.v4()

          const firstMedicationRequest = message.entry.map(e => e.resource)
            .find(r => r.resourceType === "MedicationRequest") as fhir.MedicationRequest
          const prescriptionId = firstMedicationRequest.groupIdentifier.value

          const interaction: InteractionObject = {
            state: "is authenticated",
            uponReceiving: `a request to cancel prescription: ${prescriptionId} - ${desc} message to Spine`,
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
              //TODO - Verify response body for cancellations
              status: 200
            }
          }
          await provider.addInteraction(interaction)
          await client()
            .post(apiPath)
            .set("Content-Type", "application/fhir+json; fhirVersion=4.0")
            .set("X-Request-ID", requestId)
            .set("X-Correlation-ID", correlationId)
            .send(bundleStr)
            .expect(200)
        }
      )
    })
  })

jestpact.pactWith(
  pactOptions("live", "process", "dispense"),
  /* eslint-disable  @typescript-eslint/no-explicit-any */
  async (provider: any) => {
    const client = () => {
      const url = `${provider.mockService.baseUrl}`
      return supertest(url)
    }

    describe("process-message dispense e2e tests", () => {
      test.each(TestResources.processDispenseNotificationCases)(
        "should be able to dispense %s",
        async (desc: string, message: fhir.Bundle) => {
          const apiPath = `${basePath}/$process-message`
          const bundleStr = LosslessJson.stringify(message)
          const bundle = JSON.parse(bundleStr) as fhir.Bundle

          const requestId = uuid.v4()
          const correlationId = uuid.v4()

          const interaction: InteractionObject = {
            state: "is authenticated",
            uponReceiving: `a request to dispense prescription: ${desc} message to Spine`,
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
                    code: "informational",
                    severity: "information"
                  }
                ]
              },
              status: 200
            }
          }
          await provider.addInteraction(interaction)
          await client()
            .post(apiPath)
            .set("Content-Type", "application/fhir+json; fhirVersion=4.0")
            .set("X-Request-ID", requestId)
            .set("X-Correlation-ID", correlationId)
            .send(bundleStr)
            .expect(200)
        }
      )
    })
  })

jestpact.pactWith(
  pactOptions("live", "process", "claim"),
  /* eslint-disable  @typescript-eslint/no-explicit-any */
  async (provider: any) => {
    const client = () => {
      const url = `${provider.mockService.baseUrl}`
      return supertest(url)
    }

    describe("process-message claim e2e tests", () => {
      test.each(TestResources.processClaimInformationCases)(
        "should be able to claim for %s",
        async (desc: string, message: fhir.Bundle) => {
          const apiPath = `${basePath}/$process-message`
          const bundleStr = LosslessJson.stringify(message)
          const bundle = JSON.parse(bundleStr) as fhir.Bundle

          const requestId = uuid.v4()
          const correlationId = uuid.v4()

          const interaction: InteractionObject = {
            state: "is authenticated",
            uponReceiving: `a request to claim for prescription: ${desc} message to Spine`,
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
                    code: "informational",
                    severity: "information"
                  }
                ]
              },
              status: 200
            }
          }
          await provider.addInteraction(interaction)
          await client()
            .post(apiPath)
            .set("Content-Type", "application/fhir+json; fhirVersion=4.0")
            .set("X-Request-ID", requestId)
            .set("X-Correlation-ID", correlationId)
            .send(bundleStr)
            .expect(200)
        }
      )
    })
  })

jestpact.pactWith(
  pactOptions("live", "process", "send"),
  /* eslint-disable  @typescript-eslint/no-explicit-any */
  async (provider: any) => {
    const client = () => {
      const url = `${provider.mockService.baseUrl}`
      return supertest(url)
    }

    describe("process-message sandbox e2e tests", () => {
      test("Should be able to process a FHIR JSON Accept header", async () => {
        const testCase = fetcher.processExamples[0]
        const apiPath = `${basePath}/$process-message`
        const requestCopy = LosslessJson.parse(LosslessJson.stringify(testCase.request))
        setPrescriptionIds(requestCopy, uuid.v4(), generateShortFormId(), uuid.v4())
        const messageStr = LosslessJson.stringify(requestCopy)
        const requestId = uuid.v4()
        const correlationId = uuid.v4()

        const interaction: InteractionObject = {
          state: "is authenticated",
          uponReceiving: "a request to process a message with a FHIR JSON Accept header",
          withRequest: {
            headers: {
              "Content-Type": "application/fhir+json; fhirVersion=4.0",
              "X-Request-ID": requestId,
              "X-Correlation-ID": correlationId
            },
            method: "POST",
            path: apiPath,
            body: JSON.parse(messageStr)
          },
          willRespondWith: {
            headers: {
              "Content-Type": "application/json"
            },
            body: {
              resourceType: "OperationOutcome",
              issue: [
                {
                  code: "informational",
                  severity: "information"
                }
              ]
            },
            status: 200
          }
        }
        await provider.addInteraction(interaction)
        await client()
          .post(apiPath)
          .set("Content-Type", "application/fhir+json; fhirVersion=4.0")
          .set("Accept", "application/fhir+json")
          .set("X-Request-ID", requestId)
          .set("X-Correlation-ID", correlationId)
          .send(messageStr)
          .expect(200)
      })
    })
  }
)
