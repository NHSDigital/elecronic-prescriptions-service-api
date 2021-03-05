import moment from "moment"
import {getCodeableConceptCodingForSystem, getIdentifierValueForSystem, resolveReference} from "../common"
import {getMedicationRequests} from "../common/getResourcesOfType"
import {convertMomentToHl7V3DateTime} from "../common/dateTime"
import * as hl7V3 from "../../../models/hl7-v3"
import * as fhir from "../../../models/fhir"
import {identifyMessageType} from "../../../routes/util"
import * as uuid from "uuid"
import {Hl7InteractionIdentifier} from "../../../models/hl7-v3"

export function createSendMessagePayload<T>(
  interactionId: hl7V3.Hl7InteractionIdentifier,
  bundle: fhir.Bundle,
  subject: T
): hl7V3.SendMessagePayload<T> {
  const messageId = getIdentifierValueForSystem(
    [bundle.identifier],
    "https://tools.ietf.org/html/rfc4122",
    "Bundle.identifier"
  )

  const sendMessagePayload = createInitialSendMessagePayload<T>(messageId, interactionId)
  sendMessagePayload.ControlActEvent = createControlActEvent(bundle, subject)
  return sendMessagePayload
}

export function createReleaseRequestSendMessagePayload<T>(
  interactionId: hl7V3.Hl7InteractionIdentifier,
  subject: T
): hl7V3.SendMessagePayload<T> {
  const messageId = uuid.v4()

  const sendMessagePayload = createInitialSendMessagePayload<T>(messageId, interactionId)
  sendMessagePayload.ControlActEvent = createReleaseControlActEvent(subject)
  return sendMessagePayload
}

function createInitialSendMessagePayload<T>(
  messageId: string,
  interactionId: Hl7InteractionIdentifier
): hl7V3.SendMessagePayload<T> {
  const sendMessagePayload = new hl7V3.SendMessagePayload<T>(
    new hl7V3.GlobalIdentifier(messageId),
    convertMomentToHl7V3DateTime(moment.utc()),
    interactionId
  )

  sendMessagePayload.communicationFunctionRcv = createCommunicationFunction(process.env.TO_ASID)
  sendMessagePayload.communicationFunctionSnd = createCommunicationFunction(process.env.FROM_ASID)

  return sendMessagePayload
}

function createCommunicationFunction(asid: string) {
  const id = new hl7V3.AccreditedSystemIdentifier(asid)
  const device = new hl7V3.Device(id)
  return new hl7V3.CommunicationFunction(device)
}

function createControlActEvent<T>(
  bundle: fhir.Bundle,
  subject: T
) {
  const controlActEvent = new hl7V3.ControlActEvent<T>()
  controlActEvent.author = convertRequesterToControlActAuthor(bundle)
  controlActEvent.author1 = createControlActEventAuthor1(process.env.FROM_ASID)
  controlActEvent.subject = subject
  return controlActEvent
}

function convertRequesterToControlActAuthor(
  bundle: fhir.Bundle
) {

  // todo: implement dispense verson
  const messageType = identifyMessageType(bundle)
  if (messageType === fhir.EventCodingCode.DISPENSE) {
    const sdsUniqueIdentifier = "687227875014"
    const sdsJobRoleCode = "R8003"
    const sdsRoleProfileIdentifier = "781733617547"
    return createControlActEventAuthor(sdsUniqueIdentifier, sdsJobRoleCode, sdsRoleProfileIdentifier)
  }

  const firstMedicationRequest = getMedicationRequests(bundle)[0]
  const authorPractitionerRole = resolveReference(bundle, firstMedicationRequest.requester)
  const authorPractitioner = resolveReference(bundle, authorPractitionerRole.practitioner)

  const sdsUniqueIdentifier = getIdentifierValueForSystem(
    authorPractitioner.identifier,
    "https://fhir.nhs.uk/Id/sds-user-id",
    "Practitioner.identifier"
  )
  const sdsJobRoleCode = getCodeableConceptCodingForSystem(
    authorPractitionerRole.code,
    "https://fhir.hl7.org.uk/CodeSystem/UKCore-SDSJobRoleName",
    "PractitionerRole.code"
  ).code
  const sdsRoleProfileIdentifier = getIdentifierValueForSystem(
    authorPractitionerRole.identifier,
    "https://fhir.nhs.uk/Id/sds-role-profile-id",
    "PractitionerRole.identifier"
  )
  return createControlActEventAuthor(sdsUniqueIdentifier, sdsJobRoleCode, sdsRoleProfileIdentifier)
}

function createControlActEventAuthor(
  sdsUniqueIdentifierStr: string,
  sdsJobRoleCodeStr: string,
  sdsRoleProfileIdentifierStr: string
) {
  const sdsUniqueIdentifier = new hl7V3.SdsUniqueIdentifier(sdsUniqueIdentifierStr)
  const authorAgentPersonPerson = new hl7V3.AgentPersonPersonSds(sdsUniqueIdentifier)

  const sdsJobRoleIdentifier = new hl7V3.SdsJobRoleIdentifier(sdsJobRoleCodeStr)
  const sdsRole = new hl7V3.SdsRole(sdsJobRoleIdentifier)
  const agentPersonPart = new hl7V3.AgentPersonPart(sdsRole)

  const sdsRoleProfileIdentifier = new hl7V3.SdsRoleProfileIdentifier(sdsRoleProfileIdentifierStr)
  const authorAgentPerson = new hl7V3.AgentPersonSds()
  authorAgentPerson.id = sdsRoleProfileIdentifier
  authorAgentPerson.agentPersonSDS = authorAgentPersonPerson
  authorAgentPerson.part = agentPersonPart

  return new hl7V3.SendMessagePayloadAuthorPersonSds(authorAgentPerson)
}

function createControlActEventAuthor1(asid: string) {
  const id = new hl7V3.AccreditedSystemIdentifier(asid)
  const agentSystemSystemSds = new hl7V3.AgentSystemSystemSds(id)
  const agentSystemSds = new hl7V3.AgentSystemSds(agentSystemSystemSds)
  return new hl7V3.SendMessagePayloadAuthorSystemSds(agentSystemSds)
}

function createReleaseControlActEvent<T>(
  subject: T
) {
  const controlActEvent = new hl7V3.ControlActEvent<T>()
  controlActEvent.author = convertRequesterToReleaseControlActAuthor(subject)
  controlActEvent.author1 = createControlActEventAuthor1(process.env.FROM_ASID)
  controlActEvent.subject = subject
  return controlActEvent
}

function convertRequesterToReleaseControlActAuthor<T>(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  hl7ReleaseRequest: T
) {
  const sdsUniqueIdentifier = "G9999999"

  const sdsJobRoleCode = "R8000"

  const sdsRoleProfileIdentifier = "100102238986"
  return createControlActEventAuthor(sdsUniqueIdentifier, sdsJobRoleCode, sdsRoleProfileIdentifier)
}
