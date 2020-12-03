import * as fhir from "../../../models/fhir/fhir-resources"
import {
  CancellationResponse,  PertinentInformation1,
  PertinentInformation2, PertinentInformation3
} from "../../../models/hl7-v3/hl7-v3-spine-response"
import {convertHL7V3DateTimeStringToISODateTime} from "./common"
import {InvalidValueError} from "../../../models/errors/processing-errors"

export function createMedicationRequest(
  cancellationResponse: CancellationResponse,
  responsiblePartyPractitionerRoleId: string,
  patientId: string,
  authorPractitionerRoleId: string
): fhir.MedicationRequest {
  const medicationRequest = {resourceType: "MedicationRequest"} as fhir.MedicationRequest

  const pertinentInformation3 = cancellationResponse.pertinentInformation3
  medicationRequest.extension = createExtensions(pertinentInformation3, responsiblePartyPractitionerRoleId)

  const pertinentInformation1 = cancellationResponse.pertinentInformation1
  medicationRequest.identifier = createIdentifier(pertinentInformation1)

  medicationRequest.status = getStatus(pertinentInformation3.pertinentResponse.value._attributes.code)

  medicationRequest.intent = "order"

  medicationRequest.medicationCodeableConcept = getMedicationCodeableConcept()

  medicationRequest.subject = createSubject(patientId)

  medicationRequest.authoredOn = convertHL7V3DateTimeStringToISODateTime(
    cancellationResponse.effectiveTime._attributes.value
  )

  medicationRequest.requester = {
    reference: authorPractitionerRoleId
  }

  const pertinentInformation2 = cancellationResponse.pertinentInformation2
  medicationRequest.groupIdentifier = getMedicationGroupIdentifier(pertinentInformation2)

  if (medicationRequestHasDispenser()) {
    medicationRequest.dispenseRequest = getDispenseRequest(cancellationResponse)
  }

  return medicationRequest
}

function createExtensions(cancellationPertinentInformation3: PertinentInformation3, practitionerRoleId: string) {
  const cancellationCode = cancellationPertinentInformation3.pertinentResponse.value._attributes.code
  const cancellationDisplay = cancellationPertinentInformation3.pertinentResponse.value._attributes.displayName
  const {fhirCode, fhirDisplay} = getCodeAndDisplay(cancellationCode, cancellationDisplay)

  return [
    {
      "url": "https://fhir.nhs.uk/R4/StructureDefinition/Extension-DM-PrescriptionStatusHistory",
      "extension":  [
        {
          "url": "status",
          "valueCoding": {
            "system": "https://fhir.nhs.uk/CodeSystem/medicationrequest-status-history",
            "code": fhirCode,
            "display": fhirDisplay
          }
        }
      ]
    },
    {
      "url": "https://fhir.nhs.uk/R4/StructureDefinition/Extension-DM-ResponsiblePractitioner",
      "valueReference": {
        "reference": practitionerRoleId
      }
    }
  ]
}

function getStatus(code: string) {
  //active | on-hold | cancelled | completed | entered-in-error | stopped | draft | unknown
  switch(code) {
  case ("0001"):
  case ("0006"):
    return "cancelled"
  case("0002"):
  case("0003"):
  case("0009"):
  case("0010"):
    return "active"
  case("0004"):
    return "completed"
  case("0005"):
    return "stopped"
  case("0007"):
  case("0008"):
  case("5000"):
  case("5888"):
    return "unknown"
  default:
    throw InvalidValueError
  }
}

function getCodeAndDisplay(code: string, display: string) {
  const extraInformation = display.split("-")[1]
  switch (code) {
  case "0001":
    return {fhirCode: "R-0001", fhirDisplay: "Prescription/item was cancelled"}
  case "0002":
    return {fhirCode: "R-0002", fhirDisplay: "Prescription/item was not cancelled – With dispenser"}
  case "0003":
    return {fhirCode: "R-0003", fhirDisplay: "Prescription item was not cancelled – With dispenser active"}
  case "0004":
    return {fhirCode: "R-0004", fhirDisplay: "Prescription/item was not cancelled – Dispensed to Patient"}
  case "0005":
    return {fhirCode: "R-0005", fhirDisplay: "Prescription item had expired"}
  case "0006":
    return {fhirCode: "R-0006", fhirDisplay: "Prescription/item had already been cancelled"}
  case "0007":
    return {fhirCode: "R-0007", fhirDisplay: "Prescription/item cancellation requested by another prescriber"}
  case "0008":
    return {fhirCode: "R-0008", fhirDisplay: "Prescription/item not found"}
  case "0009":
    return {fhirCode: "R-0009", fhirDisplay: "Cancellation functionality disabled in Spine"}
  case "0010":
    return {fhirCode: "R-0010", fhirDisplay: "Prescription/item was not cancelled. Prescription has been not dispensed"}
  case "5000":
    return {fhirCode: "R-5000", fhirDisplay: `Unable to process message.${extraInformation}`}
  case "5888":
    return {fhirCode: "R-5888", fhirDisplay: "Invalid message"}
  default:
    throw InvalidValueError
  }
}

function createIdentifier(pertinentInformation1: PertinentInformation1) {
  const id = pertinentInformation1.pertinentLineItemRef.id._attributes.root
  return [{
    system: "https://fhir.nhs.uk/Id/prescription-order-item-number",
    value: id.toLocaleLowerCase()
  }]
}

function getMedicationCodeableConcept() {
  return {
    "coding": [{
      "system": "http://snomed.info/sct",
      "code": "763158003",
      "display": "Medicinal product"
    }]
  }
}

function createSubject(patientId: string) {
  return {
    reference: patientId
  }
}

function getMedicationGroupIdentifier(pertinentInformation2: PertinentInformation2) {
  return {
    system: "https://fhir.nhs.uk/Id/prescription-order-number",
    value: pertinentInformation2.pertinentPrescriptionID.value._attributes.extension
  }
}

function medicationRequestHasDispenser() {
  return false
}

function getDispenseRequest(cancellationResponse: CancellationResponse) {
  cancellationResponse
  return {
    performer: {
      extension: [{
        url: "https://fhir.nhs.uk/R4/StructureDefinition/Extension-DispensingPerformer",
        valueReference: {
          reference: "" //TODO: when we have dispense info we need to fill
        }
      }],
      identifier: {
        system: "https://fhir.nhs.uk/Id/ods-organization-code",
        value: "" //TODO: when we have dispense info we need to fill
      }
    }
  }
}
