import {InteractionObject} from "@pact-foundation/pact"
import * as jestpact from "jest-pact"
import supertest from "supertest"
import * as TestResources from "../../resources/test-resources"
import {Bundle} from "../../models/fhir/fhir-resources"
import * as LosslessJson from "lossless-json"
import {processExamples} from "../../services/process-example-fetcher"
import * as uuid from "uuid"
import {basePath, pactOptions} from "../../resources/common"

jestpact.pactWith(
  pactOptions(true, "process"),
  /* eslint-disable  @typescript-eslint/no-explicit-any */
  async (provider: any) => {
    const client = () => {
      const url = `${provider.mockService.baseUrl}`
      return supertest(url)
    }

    const apiPath = `${basePath}/$process-message`

    describe("process-message sandbox e2e tests", () => {
      test.each(TestResources.processCases)("should be able to process %s", async (desc: string, request: Bundle) => {
        const messageStr = LosslessJson.stringify(request)
        const requestId = uuid.v4()
        const correlationId = uuid.v4()

        const interaction: InteractionObject = {
          state: "is not authenticated",
          uponReceiving: `a request to process ${desc} message to Spine`,
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
              "Content-Type": "application/json",
              "X-Request-ID": requestId,
              "X-Correlation-ID": correlationId
            },
            // body: {
            //   resourceType: "Bundle"
            // },
            status: 200
          }
        }
        await provider.addInteraction(interaction)
        await client()
          .post(apiPath)
          .set('Content-Type', 'application/fhir+json; fhirVersion=4.0')
          .set('X-Request-ID', requestId)
          .set('X-Correlation-ID', correlationId)
          .send(messageStr)
          .expect(200)
      })

      test("Should be able to process a FHIR JSON Accept header", async () => {
        const testCase = processExamples[0]

        const messageStr = LosslessJson.stringify(testCase.request)
        const requestId = uuid.v4()
        const correlationId = uuid.v4()

        const interaction: InteractionObject = {
          state: "is not authenticated",
          uponReceiving: `a request to process a message with a FHIR JSON Accept header`,
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
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "X-Request-ID": requestId,
              "X-Correlation-ID": correlationId
            },
          }
        }
        await provider.addInteraction(interaction)
        await client()
          .post(apiPath)
          .set('Content-Type', 'application/fhir+json; fhirVersion=4.0')
          .set('Accept', 'application/fhir+json')
          .set('X-Request-ID', requestId)
          .set('X-Correlation-ID', correlationId)
          .send(messageStr)
          .expect(200)
      })
    })
  }
)
