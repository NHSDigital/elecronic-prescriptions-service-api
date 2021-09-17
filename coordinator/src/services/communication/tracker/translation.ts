import {DetailPrescription, DetailTrackerResponse} from "./spine-model"
import {fhir} from "@models"
import * as uuid from "uuid"

function isPrescriptionField(trackerResponse: DetailTrackerResponse, fieldName: string) {
  return !!trackerResponse[fieldName].prescriptionStatus
}

function getStatusCodeFromDisplay(display: string): string {
  switch (display) {
    case "To be Dispensed":
      return "0001"
    case "With Dispenser":
      return "0002"
    case "With Dispenser - Active":
      return "0003"
    case "Expired":
      return "0004"
    case "Cancelled":
      return "0005"
    case "Dispensed":
      return "0006"
    case "Not Dispensed":
      return "0007"
    default:
      throw new Error
  }
}

function convertLineItemToInput(lineItemId: string, prescription: DetailPrescription){
  const lineItem = prescription.lineItems[lineItemId]
  const taskInput: fhir.TaskInput = {
    type: fhir.createCodeableConcept("http://snomed.info/sct", lineItem.code, lineItem.description),
    valueReference: fhir.createIdentifierReference(
      fhir.createIdentifier("https://fhir.nhs.uk/Id/prescription-order-item-number", lineItemId)
    )
  }
  const dispensingInformationExtension = []
  if (prescription.prescriptionDispensedDate) {
    dispensingInformationExtension.push({
      url: "dateLastDispensed",
      valueDate: prescription.prescriptionDispensedDate
    })
  }

  dispensingInformationExtension.push({
    url: "dispenseNotificationReference",
    valueIdentifier: fhir.createIdentifier("https://tools.ietf.org/html/rfc4122", "PLACEHOLDER")
  })

  if (lineItem.itemStatus) {
    dispensingInformationExtension.push({
      url: "dispenseStatus",
      valueCoding: fhir.createCoding(
        "https://fhir.nhs.uk/CodeSystem/medicationdispense-type",
        getStatusCodeFromDisplay(lineItem.itemStatus),
        lineItem.itemStatus
      )
    })
  }

  if (dispensingInformationExtension.length > 0) {
    taskInput.extension = [{
      url: "https://fhir.nhs.uk/StructureDefinition/Extension-EPS-DispensingInformation",
      extension: dispensingInformationExtension
    }]
  }

  return taskInput
}

function convertLineItemToOutput(lineItemId: string, prescription: DetailPrescription){
  const lineItem = prescription.lineItems[lineItemId]
  const taskOutput: fhir.TaskOutput = {
    type: fhir.createCodeableConcept("http://snomed.info/sct", lineItem.code, lineItem.description),
    valueReference: fhir.createIdentifierReference(
      fhir.createIdentifier("https://fhir.nhs.uk/Id/prescription-dispense-item-number", lineItemId)
    )
  }
  const releaseInformationExtensions = []
  if (prescription.prescriptionLastIssueDispensedDate) {
    releaseInformationExtensions.push({
      url: "dateLastIssuedDispensed",
      valueDate: prescription.prescriptionLastIssueDispensedDate
    })
  }
  if (prescription.prescriptionDownloadDate) {
    releaseInformationExtensions.push({
      url: "dateDownloaded",
      valueDate: prescription.prescriptionDownloadDate
    })
  }
  if (prescription.prescriptionClaimedDate) {
    releaseInformationExtensions.push({
      url: "dateClaimed",
      valueDate: prescription.prescriptionClaimedDate
    })
  }

  if (releaseInformationExtensions.length > 0) {
    taskOutput.extension = [{
      url: "https://fhir.nhs.uk/StructureDefinition/Extension-EPS-DispensingReleaseInformation",
      extension: releaseInformationExtensions
    }]
  }

  return taskOutput
}

export function convertDetailedJsonResponseToFhirTask(response: DetailTrackerResponse): fhir.Task {
  const prescriptionIds = Object.keys(response).filter(fieldName => isPrescriptionField(response, fieldName))
  const prescriptions = prescriptionIds.map(id => response[id])
  const prescription = prescriptions[0]

  const owner = prescription.dispensingPharmacy ?? prescription.nominatedPharmacy

  const task: fhir.Task = {
    resourceType: "Task",
    identifier: [fhir.createIdentifier("https://tools.ietf.org/html/rfc4122", uuid.v4())],
    status: fhir.TaskStatus.IN_PROGRESS,
    businessStatus: fhir.createCodeableConcept(
      "https://fhir.nhs.uk/CodeSystem/EPS-task-business-status",
      getStatusCodeFromDisplay(prescription.prescriptionStatus),
      prescription.prescriptionStatus
    ),
    intent: fhir.TaskIntent.ORDER,
    focus: fhir.createIdentifierReference(
      fhir.createIdentifier("https://fhir.nhs.uk/Id/prescription-order-number", prescriptionIds[0])
    ),
    for: fhir.createIdentifierReference(
      fhir.createIdentifier("https://fhir.nhs.uk/Id/nhs-number", prescription.patientNhsNumber)
    ),
    authoredOn: prescription.prescriptionIssueDate,
    owner: fhir.createIdentifierReference(
      fhir.createIdentifier("https://fhir.nhs.uk/Id/ods-organization-code", owner.ods),
      owner.name
    )
  }

  const lineItemIds = Object.keys(prescription.lineItems)
  task.input = lineItemIds.map(lineItemId => convertLineItemToInput(lineItemId, prescription))
  task.output = lineItemIds.map(lineItemId => convertLineItemToOutput(lineItemId, prescription))
  return task
}
