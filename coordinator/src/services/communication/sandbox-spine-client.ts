import {SpineRequest, SpineResponse} from "../../models/spine"
import * as hl7V3 from "../../models/hl7-v3"
import * as fhir from "../../models/fhir"
import * as sandboxResponses from "../../models/sandbox/responses"
import {SpineClient} from "./spine-client"

export class SandboxSpineClient implements SpineClient {
  async send(spineRequest: SpineRequest): Promise<SpineResponse<unknown>> {
    switch (spineRequest.interactionId) {
      case hl7V3.Hl7InteractionIdentifier.PARENT_PRESCRIPTION_URGENT._attributes.extension:
        return Promise.resolve({
          statusCode: 200,
          body: sandboxResponses.PARENT_PRESCRIPTION_URGENT
        })
      case hl7V3.Hl7InteractionIdentifier.CANCEL_REQUEST._attributes.extension:
        return Promise.resolve({
          statusCode: 200,
          body: sandboxResponses.CANCEL_REQUEST
        })
      case hl7V3.Hl7InteractionIdentifier.NOMINATED_PRESCRIPTION_RELEASE_REQUEST._attributes.extension:
        return Promise.resolve({
          statusCode: 200,
          body: sandboxResponses.NOMINATED_PRESCRIPTION_RELEASE_REQUEST
        })
      case hl7V3.Hl7InteractionIdentifier.DISPENSE_NOTIFICATION._attributes.extension:
        return Promise.resolve({
          statusCode: 200,
          // todo: replace with actual spine dispense notification response when able to get one
          body: sandboxResponses.NOMINATED_PRESCRIPTION_RELEASE_REQUEST
        })
      case hl7V3.Hl7InteractionIdentifier.DISPENSER_WITHDRAW._attributes.extension:
        return Promise.resolve({
          statusCode: 200,
          // eslint-disable-next-line max-len
          body: "----=_MIME-Boundary\r\nContent-Id: <ebXMLHeader@spine.nhs.uk>\r\nContent-Type: text/xml\r\nContent-Transfer-Encoding: 8bit\r\n\r\n<?xml version='1.0' encoding='UTF-8'?>\n<soap:Envelope xmlns:xsi=\"http://www.w3c.org/2001/XML-Schema-Instance\" xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:eb=\"http://www.oasis-open.org/committees/ebxml-msg/schema/msg-header-2_0.xsd\" xmlns:xlink=\"http://www.w3.org/1999/xlink\"><soap:Header><eb:MessageHeader eb:version=\"2.0\" soap:mustUnderstand=\"1\"><eb:From><eb:PartyId eb:type=\"urn:nhs:names:partyType:ocs+serviceInstance\">YES-0000806</eb:PartyId></eb:From><eb:To><eb:PartyId eb:type=\"urn:nhs:names:partyType:ocs+serviceInstance\">T141D-822234</eb:PartyId></eb:To><eb:CPAId>S20001A000100</eb:CPAId><eb:ConversationId>69BF9F53-EFC1-4874-8E87-90CA7448373A</eb:ConversationId><eb:Service>urn:nhs:names:services:mm</eb:Service><eb:Action>MCCI_IN010000UK13</eb:Action><eb:MessageData><eb:MessageId>A7B86F8D-1DBD-FC28-E050-D20AE3AFFFFF</eb:MessageId><eb:Timestamp>2020-09-21T14:14:46Z</eb:Timestamp><eb:RefToMessageId>6B2192E2-D069-4FB7-A086-C1328D2B54AE</eb:RefToMessageId></eb:MessageData><eb:DuplicateElimination/></eb:MessageHeader><eb:AckRequested eb:version=\"2.0\" soap:mustUnderstand=\"1\" soap:actor=\"urn:oasis:names:tc:ebxml-msg:actor:toPartyMSH\" eb:signed=\"false\"/><eb:SyncReply eb:version=\"2.0\" soap:mustUnderstand=\"1\" soap:actor=\"http://schemas.xmlsoap.org/soap/actor/next\"/></soap:Header><soap:Body><eb:Manifest xmlns:hl7ebxml=\"urn:hl7-org:transport/ebXML/DSTUv1.0\" eb:version=\"2.0\"><eb:Reference xlink:href=\"cid:A7B86F8D-1DBD-FC28-E050-D20AE3AFFFFF@spine.nhs.uk\"><eb:Schema eb:location=\"urn:hl7-org:v3_MCCI_IN010000UK13.xsd\" eb:version=\"13\"/><eb:Description xml:lang=\"en\">The HL7 payload</eb:Description><hl7ebxml:Payload style=\"HL7\" encoding=\"XML\" version=\"3.0\"/></eb:Reference></eb:Manifest></soap:Body></soap:Envelope>\r\n\r\n----=_MIME-Boundary\r\nContent-Id: <A7B86F8D-1DBD-FC28-E050-D20AE3AFFFFF@spine.nhs.uk>\r\nContent-Type: application/xml\r\nContent-Transfer-Encoding: 8bit\r\n\r\n<?xml version='1.0' encoding='UTF-8'?>\n<hl7:MCCI_IN010000UK13 xmlns:hl7=\"urn:hl7-org:v3\"><hl7:id root=\"A7B86F8D-1DBD-FC28-E050-D20AE3AFFFFF\"/><hl7:creationTime value=\"20200921141446\"/><hl7:versionCode code=\"V3NPfIT4.2.00\"/><hl7:interactionId root=\"2.16.840.1.113883.2.1.3.2.4.12\" extension=\"MCCI_IN010000UK13\"/><hl7:processingCode code=\"P\"/><hl7:processingModeCode code=\"T\"/><hl7:acceptAckCode code=\"NE\"/><hl7:acknowledgement typeCode=\"AA\"><hl7:messageRef><hl7:id root=\"A7B86F8D-1DBD-FC28-E050-D20AE3AFFFFF\"/></hl7:messageRef></hl7:acknowledgement><hl7:communicationFunctionRcv typeCode=\"RCV\"><hl7:device classCode=\"DEV\" determinerCode=\"INSTANCE\"><hl7:id root=\"1.2.826.0.1285.0.2.0.107\" extension=\"200000001285\"/></hl7:device></hl7:communicationFunctionRcv><hl7:communicationFunctionSnd typeCode=\"SND\"><hl7:device classCode=\"DEV\" determinerCode=\"INSTANCE\"><hl7:id root=\"1.2.826.0.1285.0.2.0.107\" extension=\"567456789789\"/></hl7:device></hl7:communicationFunctionSnd><hl7:ControlActEvent classCode=\"CACT\" moodCode=\"EVN\"><hl7:author1 typeCode=\"AUT\"><hl7:AgentSystemSDS classCode=\"AGNT\"><hl7:agentSystemSDS classCode=\"DEV\" determinerCode=\"INSTANCE\"><hl7:id root=\"1.2.826.0.1285.0.2.0.107\" extension=\"567456789789\"/></hl7:agentSystemSDS></hl7:AgentSystemSDS></hl7:author1></hl7:ControlActEvent></hl7:MCCI_IN010000UK13>\r\n----=_MIME-Boundary--"
        })
      case hl7V3.Hl7InteractionIdentifier.DISPENSE_PROPOSAL_RETURN._attributes.extension:
        return Promise.resolve({
          statusCode: 200,
          // eslint-disable-next-line max-len
          body: "----=_MIME-Boundary\r\nContent-Id: <ebXMLHeader@spine.nhs.uk>\r\nContent-Type: text/xml\r\nContent-Transfer-Encoding: 8bit\r\n\r\n<?xml version='1.0' encoding='UTF-8'?>\n<soap:Envelope xmlns:xsi=\"http://www.w3c.org/2001/XML-Schema-Instance\" xmlns:soap=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:eb=\"http://www.oasis-open.org/committees/ebxml-msg/schema/msg-header-2_0.xsd\" xmlns:xlink=\"http://www.w3.org/1999/xlink\"><soap:Header><eb:MessageHeader eb:version=\"2.0\" soap:mustUnderstand=\"1\"><eb:From><eb:PartyId eb:type=\"urn:nhs:names:partyType:ocs+serviceInstance\">YES-0000806</eb:PartyId></eb:From><eb:To><eb:PartyId eb:type=\"urn:nhs:names:partyType:ocs+serviceInstance\">T141D-822234</eb:PartyId></eb:To><eb:CPAId>S20001A000100</eb:CPAId><eb:ConversationId>69BF9F53-EFC1-4874-8E87-90CA7448373A</eb:ConversationId><eb:Service>urn:nhs:names:services:mm</eb:Service><eb:Action>MCCI_IN010000UK13</eb:Action><eb:MessageData><eb:MessageId>A7B86F8D-1DBD-FC28-E050-D20AE3AFFFFF</eb:MessageId><eb:Timestamp>2020-09-21T14:14:46Z</eb:Timestamp><eb:RefToMessageId>6B2192E2-D069-4FB7-A086-C1328D2B54AE</eb:RefToMessageId></eb:MessageData><eb:DuplicateElimination/></eb:MessageHeader><eb:AckRequested eb:version=\"2.0\" soap:mustUnderstand=\"1\" soap:actor=\"urn:oasis:names:tc:ebxml-msg:actor:toPartyMSH\" eb:signed=\"false\"/><eb:SyncReply eb:version=\"2.0\" soap:mustUnderstand=\"1\" soap:actor=\"http://schemas.xmlsoap.org/soap/actor/next\"/></soap:Header><soap:Body><eb:Manifest xmlns:hl7ebxml=\"urn:hl7-org:transport/ebXML/DSTUv1.0\" eb:version=\"2.0\"><eb:Reference xlink:href=\"cid:A7B86F8D-1DBD-FC28-E050-D20AE3AFFFFF@spine.nhs.uk\"><eb:Schema eb:location=\"urn:hl7-org:v3_MCCI_IN010000UK13.xsd\" eb:version=\"13\"/><eb:Description xml:lang=\"en\">The HL7 payload</eb:Description><hl7ebxml:Payload style=\"HL7\" encoding=\"XML\" version=\"3.0\"/></eb:Reference></eb:Manifest></soap:Body></soap:Envelope>\r\n\r\n----=_MIME-Boundary\r\nContent-Id: <A7B86F8D-1DBD-FC28-E050-D20AE3AFFFFF@spine.nhs.uk>\r\nContent-Type: application/xml\r\nContent-Transfer-Encoding: 8bit\r\n\r\n<?xml version='1.0' encoding='UTF-8'?>\n<hl7:MCCI_IN010000UK13 xmlns:hl7=\"urn:hl7-org:v3\"><hl7:id root=\"A7B86F8D-1DBD-FC28-E050-D20AE3AFFFFF\"/><hl7:creationTime value=\"20200921141446\"/><hl7:versionCode code=\"V3NPfIT4.2.00\"/><hl7:interactionId root=\"2.16.840.1.113883.2.1.3.2.4.12\" extension=\"MCCI_IN010000UK13\"/><hl7:processingCode code=\"P\"/><hl7:processingModeCode code=\"T\"/><hl7:acceptAckCode code=\"NE\"/><hl7:acknowledgement typeCode=\"AA\"><hl7:messageRef><hl7:id root=\"A7B86F8D-1DBD-FC28-E050-D20AE3AFFFFF\"/></hl7:messageRef></hl7:acknowledgement><hl7:communicationFunctionRcv typeCode=\"RCV\"><hl7:device classCode=\"DEV\" determinerCode=\"INSTANCE\"><hl7:id root=\"1.2.826.0.1285.0.2.0.107\" extension=\"200000001285\"/></hl7:device></hl7:communicationFunctionRcv><hl7:communicationFunctionSnd typeCode=\"SND\"><hl7:device classCode=\"DEV\" determinerCode=\"INSTANCE\"><hl7:id root=\"1.2.826.0.1285.0.2.0.107\" extension=\"567456789789\"/></hl7:device></hl7:communicationFunctionSnd><hl7:ControlActEvent classCode=\"CACT\" moodCode=\"EVN\"><hl7:author1 typeCode=\"AUT\"><hl7:AgentSystemSDS classCode=\"AGNT\"><hl7:agentSystemSDS classCode=\"DEV\" determinerCode=\"INSTANCE\"><hl7:id root=\"1.2.826.0.1285.0.2.0.107\" extension=\"567456789789\"/></hl7:agentSystemSDS></hl7:AgentSystemSDS></hl7:author1></hl7:ControlActEvent></hl7:MCCI_IN010000UK13>\r\n----=_MIME-Boundary--"
        })
      default:
        return Promise.resolve({
          statusCode: 400,
          body: notSupportedOperationOutcome
        })
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async poll(path: string): Promise<SpineResponse<fhir.OperationOutcome>> {
    return Promise.resolve({
      statusCode: 400,
      body: notSupportedOperationOutcome
    })
  }
}

const notSupportedOperationOutcome: fhir.OperationOutcome = {
  resourceType: "OperationOutcome",
  issue: [
    {
      code: "informational",
      severity: "information",
      details: {
        coding: [
          {
            code: "INTERACTION_NOT_SUPPORTED_BY_SANDBOX",
            display: "Interaction not supported by sandbox",
            system: "https://fhir.nhs.uk/R4/CodeSystem/Spine-ErrorOrWarningCode",
            version: "1"
          }
        ]
      }
    }
  ]
}
