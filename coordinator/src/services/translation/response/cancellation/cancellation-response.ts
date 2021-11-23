import {
  createMedicationRequest,
  extractStatusCode,
  PrescriptionStatusInformation
} from "./cancellation-medication-request"
import {createMessageHeader} from "../message-header"
import {
  addDetailsToTranslatedAgentPerson,
  addTranslatedAgentPerson,
  convertResourceToBundleEntry,
  roleProfileIdIdentical,
  translateAgentPerson
} from "../common"
import {convertHL7V3DateTimeToIsoDateTimeString} from "../../common/dateTime"
import {fhir, hl7V3} from "@models"
import {createPatient} from "../patient"
import pino from "pino"

export async function translateSpineCancelResponseIntoBundle(
  cancellationResponse: hl7V3.CancellationResponse,
  logger: pino.Logger
): Promise<fhir.Bundle> {
  return {
    resourceType: "Bundle",
    type: "message",
    identifier: createBundleIdentifier(cancellationResponse),
    timestamp: convertHL7V3DateTimeToIsoDateTimeString(cancellationResponse.effectiveTime),
    entry: await createBundleEntries(cancellationResponse, logger)
  }
}

export function translateSpineCancelResponseIntoOperationOutcome(
  prescriptionStatusInformation: PrescriptionStatusInformation): fhir.OperationOutcome {
  return {
    resourceType: "OperationOutcome",
    issue: [{
      severity: "error",
      code: prescriptionStatusInformation.issueCode,
      details: {
        coding: [{
          system: "https://fhir.nhs.uk/CodeSystem/medicationrequest-status-history",
          code: prescriptionStatusInformation.prescriptionStatusCode,
          display: prescriptionStatusInformation.prescriptionStatusDisplay
        }]
      }
    }]
  }
}

export async function translateSpineCancelResponse (
  cancellationResponse: hl7V3.CancellationResponse,
  logger: pino.Logger
):
  Promise<fhir.Bundle | fhir.OperationOutcome> {
  const prescriptionStatusInformation = extractStatusCode(cancellationResponse)
  if (prescriptionStatusInformation.issueCode) {
    return translateSpineCancelResponseIntoOperationOutcome(prescriptionStatusInformation)
  } else {
    return await translateSpineCancelResponseIntoBundle(cancellationResponse, logger)
  }
}

async function createBundleEntries(cancellationResponse: hl7V3.CancellationResponse, logger: pino.Logger) {
  const bundleResources: Array<fhir.Resource> = []

  const fhirPatient = createPatient(cancellationResponse.recordTarget.Patient)
  bundleResources.push(fhirPatient)
  const patientId = fhirPatient.id

  //The Author represents the author of the cancel request, not necessarily the author of the original prescription
  const cancelRequesterAgentPerson = cancellationResponse.author.AgentPerson
  const translatedCancelRequester = await translateAgentPerson(cancelRequesterAgentPerson, logger)
  addTranslatedAgentPerson(bundleResources, translatedCancelRequester)

  //The ResponsibleParty represents the author of the original prescription (if different to the cancel requester)
  const originalPrescriptionAuthorAgentPerson = cancellationResponse.responsibleParty?.AgentPerson
  let translatedOriginalPrescriptionAuthor = translatedCancelRequester
  if (originalPrescriptionAuthorAgentPerson) {
    if (roleProfileIdIdentical(originalPrescriptionAuthorAgentPerson, cancelRequesterAgentPerson)) {
      addDetailsToTranslatedAgentPerson(translatedCancelRequester, originalPrescriptionAuthorAgentPerson)
    } else {
      translatedOriginalPrescriptionAuthor = await translateAgentPerson(originalPrescriptionAuthorAgentPerson, logger)
      addTranslatedAgentPerson(bundleResources, translatedOriginalPrescriptionAuthor)
    }
  }

  const cancelRequesterId = translatedCancelRequester.practitionerRole.id
  const originalPrescriptionAuthorId = translatedOriginalPrescriptionAuthor.practitionerRole.id
  const medicationRequest = createMedicationRequest(
    cancellationResponse,
    cancelRequesterId,
    patientId,
    originalPrescriptionAuthorId
  )
  bundleResources.push(medicationRequest)

  const representedOrganizationId = cancelRequesterAgentPerson.representedOrganization.id._attributes.extension
  const messageId = cancellationResponse.id._attributes.root
  const cancelRequestId = cancellationResponse.pertinentInformation4.pertinentCancellationRequestRef.id._attributes.root
  const messageHeader = createMessageHeader(
    messageId,
    fhir.EVENT_CODING_PRESCRIPTION_ORDER_RESPONSE,
    [patientId, medicationRequest.id],
    representedOrganizationId,
    cancelRequestId
  )
  bundleResources.unshift(messageHeader)

  if (cancellationResponse.performer) {
    const performerAgentPerson = cancellationResponse.performer.AgentPerson
    let translatedPerformer
    if (roleProfileIdIdentical(performerAgentPerson, cancelRequesterAgentPerson)) {
      addDetailsToTranslatedAgentPerson(translatedCancelRequester, performerAgentPerson)
      translatedPerformer = translatedCancelRequester
    } else if (roleProfileIdIdentical(performerAgentPerson, originalPrescriptionAuthorAgentPerson)) {
      addDetailsToTranslatedAgentPerson(translatedOriginalPrescriptionAuthor, performerAgentPerson)
      translatedPerformer = translatedOriginalPrescriptionAuthor
    } else {
      translatedPerformer = await translateAgentPerson(performerAgentPerson, logger)
      addTranslatedAgentPerson(bundleResources, translatedPerformer)
    }
    medicationRequest.dispenseRequest = createDispenserInfoReference(
      translatedPerformer.practitionerRole.id,
      performerAgentPerson.representedOrganization.id._attributes.extension,
      performerAgentPerson.representedOrganization.name._text
    )
  }

  return bundleResources.map(convertResourceToBundleEntry)
}

function createDispenserInfoReference(practitionerId: string, organizationCode: string, organizationName: string) {
  return {
    performer: {
      extension:  [
        {
          url: "https://fhir.nhs.uk/StructureDefinition/Extension-DM-DispensingPerformer",
          valueReference: fhir.createReference(practitionerId)
        }
      ],
      identifier: fhir.createIdentifier("https://fhir.nhs.uk/Id/ods-organization-code", organizationCode),
      display: organizationName
    }
    //TODO: does this reference & identifier need a display name? if so, how to show?
  }
}

function createBundleIdentifier(cancellationResponse: hl7V3.CancellationResponse) {
  return {
    system: "https://tools.ietf.org/html/rfc4122",
    value: cancellationResponse.id._attributes.root.toLowerCase()
  }
}
