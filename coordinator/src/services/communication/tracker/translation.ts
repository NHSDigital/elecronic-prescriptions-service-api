import {DetailPrescription, DetailTrackerResponse} from "./spine-model"
import {fhir} from "@models"
import * as uuid from "uuid"
import {convertResourceToBundleEntry} from "../../translation/response/common"
import moment from "moment"
import {HL7_V3_DATE_TIME_FORMAT, ISO_DATE_FORMAT} from "../../translation/common/dateTime"

export function convertSpineResponseToBundle(spineResponse: unknown): fhir.Bundle {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const {version, reason, statusCode, ...remainder} = spineResponse as DetailTrackerResponse
  const tasks = Object.entries(remainder).map(
    ([id, detailPrescription]) => convertPrescriptionToTask(id, detailPrescription)
  )

  return {
    resourceType: "Bundle",
    type: "searchset",
    total: tasks.length,
    entry: tasks.map(convertResourceToBundleEntry)
  }
}

function convertPrescriptionToTask(prescriptionId: string, prescription: DetailPrescription): fhir.Task {
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
      fhir.createIdentifier("https://fhir.nhs.uk/Id/prescription-order-number", prescriptionId)
    ),
    for: fhir.createIdentifierReference(
      fhir.createIdentifier("https://fhir.nhs.uk/Id/nhs-number", prescription.patientNhsNumber)
    ),
    authoredOn: convertToFhirDate(prescription.prescriptionIssueDate),
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

function convertToFhirDate(dateString: string) {
  return moment.utc(dateString, HL7_V3_DATE_TIME_FORMAT).format(ISO_DATE_FORMAT)
}

function convertLineItemToInput(lineItemId: string, prescription: DetailPrescription) {
  const lineItem = prescription.lineItems[lineItemId]
  const taskInput: fhir.TaskInput = {
    type: fhir.createCodeableConcept("http://snomed.info/sct", lineItem.code, lineItem.description),
    valueReference: fhir.createIdentifierReference(
      fhir.createIdentifier("https://fhir.nhs.uk/Id/prescription-order-item-number", lineItemId.toLowerCase())
    )
  }

  const dispensingInformationExtension = []
  if (prescription.prescriptionDispensedDate) {
    dispensingInformationExtension.push({
      url: "dateLastDispensed",
      valueDate: convertToFhirDate(prescription.prescriptionDispensedDate)
    })
  }

  // dispensingInformationExtension.push({
  //   url: "dispenseNotificationReference",
  //   valueIdentifier: fhir.createIdentifier("https://tools.ietf.org/html/rfc4122", "PLACEHOLDER")
  // })

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

function convertLineItemToOutput(lineItemId: string, prescription: DetailPrescription) {
  const lineItem = prescription.lineItems[lineItemId]
  const taskOutput: fhir.TaskOutput = {
    type: fhir.createCodeableConcept("http://snomed.info/sct", lineItem.code, lineItem.description),
    valueReference: fhir.createIdentifierReference(
      fhir.createIdentifier("https://fhir.nhs.uk/Id/prescription-dispense-item-number", lineItemId.toLowerCase())
    )
  }
  const releaseInformationExtensions = []
  if (prescription.prescriptionLastIssueDispensedDate && prescription.prescriptionLastIssueDispensedDate !== "False") {
    releaseInformationExtensions.push({
      url: "dateLastIssuedDispensed",
      valueDate: convertToFhirDate(prescription.prescriptionLastIssueDispensedDate)
    })
  }
  if (prescription.prescriptionDownloadDate) {
    releaseInformationExtensions.push({
      url: "dateDownloaded",
      valueDate: convertToFhirDate(prescription.prescriptionDownloadDate)
    })
  }
  if (prescription.prescriptionClaimedDate) {
    releaseInformationExtensions.push({
      url: "dateClaimed",
      valueDate: convertToFhirDate(prescription.prescriptionClaimedDate)
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
