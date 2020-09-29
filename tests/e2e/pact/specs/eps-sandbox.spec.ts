/* eslint-disable */
import {InteractionObject, Matchers} from "@pact-foundation/pact"
import * as jestpact from "jest-pact"
import supertest from "supertest"
import * as TestResources from "../resources/test-resources"
import {Bundle, Parameters} from "../resources/fhir-resources"
import * as LosslessJson from "lossless-json"

jestpact.pactWith(
  {
    spec: 3,
    consumer: `nhsd-apim-eps-test-client-${process.env.COMMIT_SHA}`,
    provider: `nhsd-apim-eps-sandbox-${process.env.COMMIT_SHA}`,
    pactfileWriteMode: "overwrite"
  },
  /* eslint-disable  @typescript-eslint/no-explicit-any */
  async (provider: any) => {
    const client = () => {
      const url = `${provider.mockService.baseUrl}`
      return supertest(url)
    }

    describe("convert sandbox e2e tests", () => {

      test.each(TestResources.convertCases)("should be able to convert %s message to HL7V3", async (desc: string, request: Bundle, response: string, responseMatcher: string) => {
        const regex = new RegExp(responseMatcher)
        const isMatch = regex.test(response)
        expect(isMatch).toBe(true)

        const requestStr = LosslessJson.stringify(request)
        const requestJson = JSON.parse(requestStr)
        
        const apiPath = "/$convert"
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
            body: requestJson
          },
          willRespondWith: {
            headers: {
              "Content-Type": "text/plain; charset=utf-8"
            },
            body: Matchers.term({ generate: response, matcher: responseMatcher }),
            status: 200
          }
        }
        await provider.addInteraction(interaction)
        await client()
          .post(apiPath)
          .set('Content-Type', 'application/fhir+json; fhirVersion=4.0')
          .set('NHSD-Session-URID', '1234')
          .send(requestJson)
          .expect(200)
      })
    })

    describe("prepare sandbox e2e tests", () => {

      test.each(TestResources.prepareCases)("should be able to prepare a %s message", async (description: string, request: Bundle, response: Parameters) => {
        const apiPath = "/$prepare"
        const requestStr = LosslessJson.stringify(request)
        const responseStr = LosslessJson.stringify(response)
        const interaction: InteractionObject = {
          state: null,
          uponReceiving: `a request to prepare a ${description} message`,
          withRequest: {
            headers: {
              "Content-Type": "application/fhir+json; fhirVersion=4.0",
              "NHSD-Session-URID": "1234"
            },
            method: "POST",
            path: "/$prepare",
            body: JSON.parse(requestStr)
          },
          willRespondWith: {
            headers: {
              "Content-Type": "application/fhir+json; fhirVersion=4.0"
            },
            body: JSON.parse(responseStr),
            status: 200
          }
        }
        await provider.addInteraction(interaction)
        await client()
          .post(apiPath)
          .set('Content-Type', 'application/fhir+json; fhirVersion=4.0')
          .set('NHSD-Session-URID', '1234')
          .send(requestStr)
          .expect(200)
      })
    })

    describe("process-message sandbox e2e tests", () => {

      test.each(TestResources.sendCases)("should be able to send %s", async (desc: string, message: Bundle) => {
        const apiPath = "/$process-message"
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
              "Content-Type": "application/fhir+json; fhirVersion=4.0"
            },
            body: {
              resourceType: "OperationOutcome",
              issue: [
                {
                  code: Matchers.string("informational"),
                  severity: Matchers.string("information"),
                  diagnostics: Matchers.string("----=_MIME-Boundary\r\nContent-Id: <ebXMLHeader@spine.nhs.uk>\r\nContent-Type: text/xml\r\nContent-Transfer-Encoding: 8bit\r\n\r\n<?xml version='1.0' encoding='UTF-8'?>\n<soap:Envelope xmlns:xsi=\"http://www.w3c.org/2001/XML-Schema-Instance\" xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:eb=\"http://www.oasis-open.org/committees/ebxml-msg/schema/msg-header-2_0.xsd\" xmlns:xlink=\"http://www.w3.org/1999/xlink\"><soap:Header><eb:MessageHeader eb:version=\"2.0\" soap:mustUnderstand=\"1\"><eb:From><eb:PartyId eb:type=\"urn:nhs:names:partyType:ocs+serviceInstance\">YES-0000806</eb:PartyId></eb:From><eb:To><eb:PartyId eb:type=\"urn:nhs:names:partyType:ocs+serviceInstance\">T141D-822234</eb:PartyId></eb:To><eb:CPAId>S20001A000100</eb:CPAId><eb:ConversationId>69BF9F53-EFC1-4874-8E87-90CA7448373A</eb:ConversationId><eb:Service>urn:nhs:names:services:mm</eb:Service><eb:Action>MCCI_IN010000UK13</eb:Action><eb:MessageData><eb:MessageId>A7B86F8D-1DBD-FC28-E050-D20AE3AFFFFF</eb:MessageId><eb:Timestamp>2020-09-21T14:14:46Z</eb:Timestamp><eb:RefToMessageId>6B2192E2-D069-4FB7-A086-C1328D2B54AE</eb:RefToMessageId></eb:MessageData><eb:DuplicateElimination/></eb:MessageHeader><eb:AckRequested eb:version=\"2.0\" soap:mustUnderstand=\"1\" soap:actor=\"urn:oasis:names:tc:ebxml-msg:actor:toPartyMSH\" eb:signed=\"false\"/><eb:SyncReply eb:version=\"2.0\" soap:mustUnderstand=\"1\" soap:actor=\"http://schemas.xmlsoap.org/soap/actor/next\"/></soap:Header><soap:Body><eb:Manifest xmlns:hl7ebxml=\"urn:hl7-org:transport/ebXML/DSTUv1.0\" eb:version=\"2.0\"><eb:Reference xlink:href=\"cid:A7B86F8D-1DBD-FC28-E050-D20AE3AFFFFF@spine.nhs.uk\"><eb:Schema eb:location=\"urn:hl7-org:v3_MCCI_IN010000UK13.xsd\" eb:version=\"13\"/><eb:Description xml:lang=\"en\">The HL7 payload</eb:Description><hl7ebxml:Payload style=\"HL7\" encoding=\"XML\" version=\"3.0\"/></eb:Reference></eb:Manifest></soap:Body></soap:Envelope>\r\n\r\n----=_MIME-Boundary\r\nContent-Id: <A7B86F8D-1DBD-FC28-E050-D20AE3AFFFFF@spine.nhs.uk>\r\nContent-Type: application/xml\r\nContent-Transfer-Encoding: 8bit\r\n\r\n<?xml version='1.0' encoding='UTF-8'?>\n<hl7:MCCI_IN010000UK13 xmlns:hl7=\"urn:hl7-org:v3\"><hl7:id root=\"A7B86F8D-1DBD-FC28-E050-D20AE3AFFFFF\"/><hl7:creationTime value=\"20200921141446\"/><hl7:versionCode code=\"V3NPfIT4.2.00\"/><hl7:interactionId root=\"2.16.840.1.113883.2.1.3.2.4.12\" extension=\"MCCI_IN010000UK13\"/><hl7:processingCode code=\"P\"/><hl7:processingModeCode code=\"T\"/><hl7:acceptAckCode code=\"NE\"/><hl7:acknowledgement typeCode=\"AA\"><hl7:messageRef><hl7:id root=\"A7B86F8D-1DBD-FC28-E050-D20AE3AFFFFF\"/></hl7:messageRef></hl7:acknowledgement><hl7:communicationFunctionRcv typeCode=\"RCV\"><hl7:device classCode=\"DEV\" determinerCode=\"INSTANCE\"><hl7:id root=\"1.2.826.0.1285.0.2.0.107\" extension=\"200000001285\"/></hl7:device></hl7:communicationFunctionRcv><hl7:communicationFunctionSnd typeCode=\"SND\"><hl7:device classCode=\"DEV\" determinerCode=\"INSTANCE\"><hl7:id root=\"1.2.826.0.1285.0.2.0.107\" extension=\"567456789789\"/></hl7:device></hl7:communicationFunctionSnd><hl7:ControlActEvent classCode=\"CACT\" moodCode=\"EVN\"><hl7:author1 typeCode=\"AUT\"><hl7:AgentSystemSDS classCode=\"AGNT\"><hl7:agentSystemSDS classCode=\"DEV\" determinerCode=\"INSTANCE\"><hl7:id root=\"1.2.826.0.1285.0.2.0.107\" extension=\"567456789789\"/></hl7:agentSystemSDS></hl7:AgentSystemSDS></hl7:author1></hl7:ControlActEvent></hl7:MCCI_IN010000UK13>\r\n----=_MIME-Boundary--")
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
          .send(messageStr)
          .expect(200)
      })
    })
  }
)
