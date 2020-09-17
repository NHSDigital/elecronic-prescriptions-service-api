import * as XmlJs from "xml-js"
import * as codes from "../../model/hl7-v3-datatypes-codes"
import * as core from "../../model/hl7-v3-datatypes-core"
import * as prescriptions from "../../model/hl7-v3-prescriptions"
import * as fhir from "../../model/fhir-resources"
import path from "path"
import * as crypto from "crypto-js"
import Mustache from "mustache"
import fs from "fs"
import {createSendMessagePayload} from "./send-message-payload"
import {writeXmlStringCanonicalized} from "./xml"
import {convertParentPrescription} from "./parent-prescription"
import {convertFragmentsToDisplayableFormat, convertFragmentsToHashableFormat, extractFragments} from "./signing"
import {getIdentifierValueForSystem} from "./common"
import {Display} from "../../model/signing"
import * as requestBuilder from "../request-builder"
import {SpineRequest} from "../spine-communication"
import {identifyMessageType, MessageType} from "../../routes/util"

export function convertFhirMessageToSpineRequest(fhirMessage: fhir.Bundle): SpineRequest {
  const messageType = identifyMessageType(fhirMessage)
  const sendMessagePayload = messageType === MessageType.PRESCRIPTION
    ? createParentPrescriptionSendMessagePayload(fhirMessage)
    : createCancellationRequestSendMessagePayload(fhirMessage)
  return requestBuilder.toSpineRequest(sendMessagePayload)
}

export function createParentPrescriptionSendMessagePayload(fhirBundle: fhir.Bundle): core.SendMessagePayload<prescriptions.ParentPrescriptionRoot> {
  const messageId = getIdentifierValueForSystem(
    [fhirBundle.identifier],
    "https://tools.ietf.org/html/rfc4122",
    "Bundle.identifier"
  )
  const parentPrescription = convertParentPrescription(fhirBundle)
  const parentPrescriptionRoot = new prescriptions.ParentPrescriptionRoot(parentPrescription)
  const interactionId = codes.Hl7InteractionIdentifier.PARENT_PRESCRIPTION_URGENT
  return createSendMessagePayload(messageId, interactionId, fhirBundle, parentPrescriptionRoot)
}

export function createCancellationRequestSendMessagePayload(fhirBundle: fhir.Bundle): core.SendMessagePayload<prescriptions.ParentPrescriptionRoot> {
  const messageId = getIdentifierValueForSystem(
    [fhirBundle.identifier],
    "https://tools.ietf.org/html/rfc4122",
    "Bundle.identifier"
  )
  //TODO - replace with cancellation translations
  const parentPrescription = convertParentPrescription(fhirBundle)
  const parentPrescriptionRoot = new prescriptions.ParentPrescriptionRoot(parentPrescription)
  const interactionId = codes.Hl7InteractionIdentifier.CANCEL_REQUEST
  return createSendMessagePayload(messageId, interactionId, fhirBundle, parentPrescriptionRoot)
}

export function convertFhirMessageToSignedInfoMessage(fhirMessage: fhir.Bundle): string {
  //TODO - check message header and reject if this is not an order
  const parentPrescription = convertParentPrescription(fhirMessage)

  const fragments = extractFragments(parentPrescription)

  const fragmentsToBeHashed = convertFragmentsToHashableFormat(fragments)
  const payload = createParametersPayload(fragmentsToBeHashed)

  const fragmentsToDisplay = convertFragmentsToDisplayableFormat(fragments)
  const display = createParametersDisplay(fragmentsToDisplay)

  const parameters = createParameters(payload, display)

  return JSON.stringify(parameters, null, 2)
}

function createParametersPayload(fragmentsToBeHashed: string): string {
  const digestValue = crypto.SHA1(fragmentsToBeHashed).toString(crypto.enc.Base64)

  const signedInfo = {
    SignedInfo: {
      CanonicalizationMethod: new AlgorithmIdentifier("http://www.w3.org/2001/10/xml-exc-c14n#"),
      SignatureMethod: new AlgorithmIdentifier("http://www.w3.org/2000/09/xmldsig#rsa-sha1"),
      Reference: {
        Transforms: {
          Transform: new AlgorithmIdentifier("http://www.w3.org/2001/10/xml-exc-c14n#")
        },
        DigestMethod: new AlgorithmIdentifier("http://www.w3.org/2000/09/xmldsig#sha1"),
        DigestValue: digestValue
      }
    }
  } as XmlJs.ElementCompact

  return Buffer.from(writeXmlStringCanonicalized(signedInfo)).toString("base64")
}

function createParametersDisplay(fragmentsToDisplay: Display): string {
  const displayTemplate = fs.readFileSync(path.join(__dirname, "../../resources/message_display.mustache"), "utf-8")
    .replace(/\n/g, "\r\n")
  return Buffer.from(Mustache.render(displayTemplate, fragmentsToDisplay)).toString("base64")
}

function createParameters(base64Payload: string, base64Display: string): fhir.Parameters {
  const parameters: Array<fhir.Parameter> = []
  parameters.push({name: "payload", valueString: base64Payload})
  parameters.push({name: "display", valueString: base64Display})
  parameters.push({name: "algorithm", valueString: "RS1"})
  return new fhir.Parameters(parameters)
}

class AlgorithmIdentifier implements XmlJs.ElementCompact {
  _attributes: {
    Algorithm: string
  }

  constructor(algorithm: string) {
    this._attributes = {
      Algorithm: algorithm
    }
  }
}
