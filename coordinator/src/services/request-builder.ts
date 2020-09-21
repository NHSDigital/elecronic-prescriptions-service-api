import Mustache from "mustache"
import fs from "fs"
import moment from "moment"
import path from "path"
import * as uuid from "uuid"
import {ElementCompact} from "xml-js"
import {namespacedCopyOf, writeXmlStringPretty} from "./translation/xml"
import {SendMessagePayload} from "../model/hl7-v3-datatypes-core"
import {SpineRequest} from "./spine-communication"

const ebxmlRequestTemplate = fs.readFileSync(path.join(__dirname, "../resources/ebxml_request.mustache"), "utf-8").replace(/\n/g, "\r\n")
const cpaIdMap = new Map<string, string>(JSON.parse(process.env.CPA_ID_MAP))

class EbXmlRequest {
    timestamp = moment.utc().format()
    conversation_id = uuid.v4().toUpperCase()
    message_id = uuid.v4().toUpperCase()
    from_party_id = process.env.FROM_PARTY_KEY
    to_party_id = process.env.TO_PARTY_KEY
    service = "urn:nhs:names:services:mm"

    duplicate_elimination = true
    ack_requested = true
    ack_soap_actor = "urn:oasis:names:tc:ebxml-msg:actor:toPartyMSH"
    sync_reply = true

    action: string
    cpa_id: string
    hl7_message: string

    constructor(interactionId: string, cpaId: string, hl7V3Message: string) {
      this.action = interactionId
      this.cpa_id = cpaId
      this.hl7_message = hl7V3Message
    }
}

export function addEbXmlWrapper(spineRequest: SpineRequest): string {
  const cpaId = cpaIdMap.get(spineRequest.interactionId)
  if (!cpaId) {
    throw new Error(`Could not identify CPA ID for interaction ${spineRequest.interactionId}`)
  }

  return Mustache.render(ebxmlRequestTemplate, new EbXmlRequest(spineRequest.interactionId, cpaId, spineRequest.message))
}

export function toSpineRequest<T>(sendMessagePayload: SendMessagePayload<T>): SpineRequest {
  return {
    interactionId: extractInteractionId(sendMessagePayload),
    message: writeToString(sendMessagePayload)
  }
}

function extractInteractionId<T>(sendMessagePayload: SendMessagePayload<T>): string {
  return sendMessagePayload.interactionId._attributes.extension
}

function writeToString<T>(sendMessagePayload: SendMessagePayload<T>): string {
  const root = {
    _declaration: new XmlDeclaration()
  } as ElementCompact
  const interactionId = extractInteractionId(sendMessagePayload)
  root[interactionId] = namespacedCopyOf(sendMessagePayload)
  return writeXmlStringPretty(root)
}

export class XmlDeclaration {
  _attributes = {
    version: "1.0",
    encoding: "UTF-8"
  }
}
