import {InteractionObject, Matchers} from "@pact-foundation/pact"
import * as jestpact from "jest-pact"
import supertest from "supertest"
import * as uuid from "uuid"
import {Bundle, Parameters} from "../resources/fhir-resources"
import * as TestResources from "../resources/test-resources"
import * as LosslessJson from "lossless-json"

jestpact.pactWith(
  {
    consumer: "nhsd-apim-eps-test-client",
    provider: "nhsd-apim-eps",
    pactfileWriteMode: "overwrite"
  },
  /* eslint-disable  @typescript-eslint/no-explicit-any */
  async (provider: any) => {
    const client = () => {
      const url = `${provider.mockService.baseUrl}`
      return supertest(url)
    }

    describe("eps e2e tests", () => {
      const convertCases = [
        ...TestResources.all.map(example => [`unsigned ${example.description}`, example.fhirMessageUnsigned]),
        ...TestResources.all.map(example => [`signed ${example.description}`, example.fhirMessageSigned])
      ]

      test.each(convertCases)("should be able to convert %s message to HL7V3", async (desc: string, message: Bundle) => {
        const apiPath = "/$convert"
        const messageStr = LosslessJson.stringify(message)
        const interaction: InteractionObject = {
          state: null,
          uponReceiving: `a request to convert ${desc} message`,
          withRequest: {
            headers: {
              "Content-Type": "application/fhir+json; fhirVersion=4.0",
              "NHSD-Session-URID": "1234"
            },
            method: "POST",
            path: "/$convert",
            body: JSON.parse(messageStr)
          },
          willRespondWith: {
            headers: {
              "Content-Type": "application/xml"
            },
            status: 200
          }
        }
        await provider.addInteraction(interaction)
        await client()
          .post(apiPath)
          .set('Content-Type', 'application/fhir+json; fhirVersion=4.0')
          .set('NHSD-Session-URID', '1234')
          .send(messageStr)
          .expect(200)
      })

      const prepareCases = TestResources.all.map(example => [example.description, example.fhirMessageUnsigned, example.fhirMessageDigest])

      test.each(prepareCases)("should be able to prepare a %s message", async (desc: string, inputMessage: Bundle, outputMessage: Parameters) => {
        const apiPath = "/$prepare"
        const inputMessageStr = LosslessJson.stringify(inputMessage)
        const interaction: InteractionObject = {
          state: null,
          uponReceiving: `a request to prepare ${desc} message`,
          withRequest: {
            headers: {
              "Content-Type": "application/fhir+json; fhirVersion=4.0",
              "NHSD-Session-URID": "1234"
            },
            method: "POST",
            path: "/$prepare",
            body: JSON.parse(inputMessageStr)
          },
          willRespondWith: {
            headers: {
              "Content-Type": "application/fhir+json; fhirVersion=4.0"
            },
            body: {
              resourceType: "Parameters",
              parameter: [
                {
                  name: "payload",
                  valueString: Matchers.string(outputMessage.parameter[0].valueString)
                },
                {
                  name: "display",
                  valueString: Matchers.string(outputMessage.parameter[1].valueString)
                },
                {
                  name: "algorithm",
                  valueString: "RS1"
                }
              ]
            },
            status: 200
          }
        }
        await provider.addInteraction(interaction)
        await client()
          .post(apiPath)
          .set('Content-Type', 'application/fhir+json; fhirVersion=4.0')
          .set('NHSD-Session-URID', '1234')
          .send(inputMessageStr)
          .expect(200)
      })

      const sendCases = TestResources.all.map(example => [example.description, example.fhirMessageSigned])

      test.each(sendCases)("should be able to send %s", async (desc: string, message: Bundle) => {
        const apiPath = "/$process-message"
        message.identifier.value = uuid.v4()
        const messageStr = LosslessJson.stringify(message)
        const interaction: InteractionObject = {
          state: null,
          uponReceiving: `a request to send ${desc} message to Spine`,
          withRequest: {
            headers: {
              "Content-Type": "application/fhir+json; fhirVersion=4.0",
              "NHSD-Session-URID": "1234"
            },
            method: "POST",
            path: "/$process-message",
            body: JSON.parse(messageStr)
          },
          willRespondWith: {
            headers: {
              "Content-Location": Matchers.string("_poll/9807d292_074a_49e8_b48d_52e5bbf785ed")
            },
            status: 202
          }
        }
        await provider.addInteraction(interaction)
        await client()
          .post(apiPath)
          .set('Content-Type', 'application/fhir+json; fhirVersion=4.0')
          .set('NHSD-Session-URID', '1234')
          .send(messageStr)
          .expect(202)
      })
    })
  }
)
