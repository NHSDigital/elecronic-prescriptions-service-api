import {fhir, hl7V3} from "@models"
import * as uuid from "uuid"
import {toArray} from "."
import {convertResourceToBundleEntry, orderBundleResources, roleProfileIdIdentical} from "../response/common"
import {
  addDetailsToTranslatedAgentPerson,
  addTranslatedAgentPerson,
  translateAgentPerson
} from "../response/agent-person"
import {createMessageHeader} from "../response/message-header"
import {createPatient} from "../response/patient"
import {convertSignatureTextToProvenance} from "../response/provenance"
import {
  addTranslatedAdditionalInstructions,
  parseAdditionalInstructions,
  translateAdditionalInstructions
} from "../response/release/additional-instructions"
import {createMedicationRequest} from "../response/release/release-medication-request"
import {convertHL7V3DateTimeToIsoDateTimeString} from "./dateTime"

export function createBundle(parentPrescription: hl7V3.ParentPrescription, responseMessageId: string): fhir.Bundle {
  return {
    resourceType: "Bundle",
    id: uuid.v4(),
    meta: {
      lastUpdated: convertHL7V3DateTimeToIsoDateTimeString(parentPrescription.effectiveTime)
    },
    identifier: {
      system: "https://tools.ietf.org/html/rfc4122",
      value: parentPrescription.id._attributes.root.toLowerCase()
    },
    type: "message",
    entry: createBundleResources(parentPrescription, responseMessageId).map(convertResourceToBundleEntry)
  }
}

export function createBundleResources(
  parentPrescription: hl7V3.ParentPrescription,
  responseMessageId: string
): Array<fhir.Resource> {
  const bundleResources: Array<fhir.Resource> = []
  const focusIds: Array<string> = []

  const fhirPatient = createPatient(parentPrescription.recordTarget.Patient)
  bundleResources.push(fhirPatient)
  const patientId = fhirPatient.id
  focusIds.push(patientId)

  const pertinentPrescription = parentPrescription.pertinentInformation1.pertinentPrescription
  const prescriptionType = pertinentPrescription.pertinentInformation4.pertinentPrescriptionType.value._attributes.code
  const prescriptionAuthor = pertinentPrescription.author
  const authorAgentPerson = prescriptionAuthor.AgentPerson
  const translatedAuthor = translateAgentPerson(authorAgentPerson, prescriptionType)
  addTranslatedAgentPerson(bundleResources, translatedAuthor)

  const responsiblePartyAgentPerson = pertinentPrescription.responsibleParty?.AgentPerson
  let translatedResponsibleParty = translatedAuthor
  if (responsiblePartyAgentPerson) {
    if (roleProfileIdIdentical(responsiblePartyAgentPerson, authorAgentPerson)) {
      addDetailsToTranslatedAgentPerson(translatedAuthor, responsiblePartyAgentPerson)
    } else {
      translatedResponsibleParty = translateAgentPerson(responsiblePartyAgentPerson, prescriptionType)
      addTranslatedAgentPerson(bundleResources, translatedResponsibleParty)
    }
  }

  const lineItems = toArray(pertinentPrescription.pertinentInformation2).map(pi2 => pi2.pertinentLineItem)

  const firstItemText = lineItems[0].pertinentInformation1?.pertinentAdditionalInstructions?.value?._text ?? ""
  const firstItemAdditionalInstructions = parseAdditionalInstructions(firstItemText)

  const medication = firstItemAdditionalInstructions.medication
  const patientInfo = firstItemAdditionalInstructions.patientInfo
  if (medication.length || patientInfo.length) {
    const patientIdentifier = fhirPatient.identifier[0]
    const patientIdentifierWithoutExtension = {
      system: patientIdentifier.system,
      value: patientIdentifier.value
    }
    const organizationIdentifier = translatedAuthor.organization.identifier[0]
    const translatedAdditionalInstructions = translateAdditionalInstructions(
      patientId, patientIdentifierWithoutExtension, medication, patientInfo, organizationIdentifier
    )
    addTranslatedAdditionalInstructions(bundleResources, translatedAdditionalInstructions)
  }

  const authorId = translatedAuthor.practitionerRole.id
  const responsiblePartyId = translatedResponsibleParty.practitionerRole.id
  lineItems.forEach(hl7LineItem => {
    const medicationRequest = createMedicationRequest(
      pertinentPrescription,
      hl7LineItem,
      patientId,
      authorId,
      responsiblePartyId
    )
    bundleResources.push(medicationRequest)
    focusIds.push(medicationRequest.id)
  })

  const messageHeader = createMessageHeader(
    parentPrescription.id._attributes.root,
    fhir.EVENT_CODING_PRESCRIPTION_ORDER,
    focusIds,
    pertinentPrescription.performer?.AgentOrgSDS?.agentOrganizationSDS?.id?._attributes?.extension,
    responseMessageId
  )
  bundleResources.unshift(messageHeader)

  if (prescriptionAuthor.signatureText) {
    const resourceIds = bundleResources.map(resource => resource.id)
    bundleResources.push(convertSignatureTextToProvenance(prescriptionAuthor, authorId, resourceIds))
  }

  return bundleResources.sort(orderBundleResources)
}

