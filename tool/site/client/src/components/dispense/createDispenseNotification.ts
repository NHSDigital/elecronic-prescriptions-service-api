import * as fhir from "fhir/r4"
import {DispenseFormValues, LineItemFormValues, PrescriptionFormValues} from "./dispenseForm"
import * as uuid from "uuid"
import {
  TaskBusinessStatusExtension,
  URL_TASK_BUSINESS_STATUS
} from "../../fhir/customExtensions"
import {
  LineItemStatus,
  PrescriptionStatus,
  VALUE_SET_LINE_ITEM_STATUS,
  VALUE_SET_NON_DISPENSING_REASON,
  VALUE_SET_PRESCRIPTION_STATUS
} from "../../fhir/reference-data/valueSets"
import {
  createDispensingRepeatInformationExtension,
  createIdentifier,
  getMedicationRequestLineItemId,
  orderBundleResources,
  requiresDispensingRepeatInformationExtension
} from "../../fhir/helpers"

const EVENT_CODING_DISPENSE_NOTIFICATION = {
  system: "https://fhir.nhs.uk/CodeSystem/message-event",
  code: "dispense-notification",
  display: "Dispense Notification"
}

export function createDispenseNotification(
  prescriptionOrderMessageHeader: fhir.MessageHeader,
  prescriptionOrderPatient: fhir.Patient,
  medicationRequests: Array<fhir.MedicationRequest>,
  dispenseFormValues: DispenseFormValues
): fhir.Bundle {
  const dispenseNotificationPatient = createPatient(prescriptionOrderPatient)

  const medicationDispenses = medicationRequests.map(medicationRequest => {
    const lineItemId = getMedicationRequestLineItemId(medicationRequest)
    const formValuesForLineItem = dispenseFormValues.lineItems.find(item => item.id === lineItemId)
    return createMedicationDispense(
      medicationRequest,
      dispenseNotificationPatient,
      formValuesForLineItem,
      dispenseFormValues.prescription
    )
  })

  const dispenseNotificationMessageHeader = createMessageHeader(
    prescriptionOrderMessageHeader,
    [
      dispenseNotificationPatient,
      ...medicationDispenses
    ].map(resource => resource.id)
  )

  return {
    resourceType: "Bundle",
    id: uuid.v4(),
    identifier: createIdentifier(),
    type: "message",
    entry: [
      dispenseNotificationMessageHeader,
      dispenseNotificationPatient,
      ...medicationDispenses
    ].sort(orderBundleResources).map(resource => ({fullUrl: `urn:uuid:${resource.id}`, resource}))
  }
}

function createPatient(patient: fhir.Patient) {
  const patientCopy = {...patient}

  patientCopy.id = uuid.v4()

  //TODO - work out why we're getting validation errors
  patientCopy.identifier[0] = {
    system: patientCopy.identifier[0].system,
    value: patientCopy.identifier[0].value
  }

  return patientCopy
}

function createMedicationDispense(
  medicationRequest: fhir.MedicationRequest,
  patient: fhir.Patient,
  lineItemFormValues: LineItemFormValues,
  prescriptionFormValues: PrescriptionFormValues
): fhir.MedicationDispense {

  if(lineItemFormValues.dispenseDifferentMedication && !lineItemFormValues.alternativeMedicationAvailable) {
    throw new Error("There is no alternative medication available for this request.")
  }

  const extensions: Array<fhir.Extension> = [createTaskBusinessStatusExtension(prescriptionFormValues.statusCode)]
  if (requiresDispensingRepeatInformationExtension(medicationRequest)) {
    const repeatInformationExtension = createDispensingRepeatInformationExtension(medicationRequest)
    extensions.push(repeatInformationExtension)
  }

  medicationRequest.id = "m1"

  const dispensedMedication = keepOrReplaceMedication(
    medicationRequest.medicationCodeableConcept, lineItemFormValues.dispenseDifferentMedication
  )

  return {
    resourceType: "MedicationDispense",
    id: uuid.v4(),
    extension: extensions,
    identifier: [{
      system: "https://fhir.nhs.uk/Id/prescription-dispense-item-number",
      value: uuid.v4()
    }],
    contained: [medicationRequest],
    //TODO - map from line item status (nice to have)
    status: "unknown",
    statusReasonCodeableConcept: createStatusReason(lineItemFormValues),
    medicationCodeableConcept: dispensedMedication,
    subject: {
      reference: `urn:uuid:${patient.id}`,
      identifier: patient.identifier[0]
    },
    performer: [
      //TODO - map from somewhere
      MEDICATION_DISPENSE_PERFORMER_PRACTITIONER,
      MEDICATION_DISPENSE_PERFORMER_ORGANIZATION
    ],
    authorizingPrescription: [{reference: "#m1"}],
    type: createMedicationDispenseType(lineItemFormValues.statusCode),
    quantity: createDispensedQuantity(medicationRequest.dispenseRequest.quantity, lineItemFormValues),
    daysSupply: medicationRequest.dispenseRequest.expectedSupplyDuration,
    whenHandedOver: prescriptionFormValues.dispenseDate.toISOString(),
    dosageInstruction: medicationRequest.dosageInstruction
  }
}

function createTaskBusinessStatusExtension(prescriptionStatus: PrescriptionStatus): TaskBusinessStatusExtension {
  return {
    url: URL_TASK_BUSINESS_STATUS,
    valueCoding: VALUE_SET_PRESCRIPTION_STATUS.find(coding => coding.code === prescriptionStatus)
  }
}

function createStatusReason(lineItemFormValues: LineItemFormValues): fhir.CodeableConcept {
  if (lineItemFormValues.statusCode !== LineItemStatus.NOT_DISPENSED) {
    return undefined
  }
  return {
    coding: VALUE_SET_NON_DISPENSING_REASON.filter(coding => coding.code === lineItemFormValues.nonDispensingReasonCode)
  }
}

const MEDICATION_DISPENSE_PERFORMER_PRACTITIONER: fhir.MedicationDispensePerformer = {
  actor: {
    type: "Practitioner",
    identifier: {
      system: "https://fhir.hl7.org.uk/Id/gphc-number",
      value: "7654321"
    },
    display: "Mr Peter Potion"
  }
}

const MEDICATION_DISPENSE_PERFORMER_ORGANIZATION: fhir.MedicationDispensePerformer = {
  actor: {
    type: "Organization",
    identifier: {
      system: "https://fhir.nhs.uk/Id/ods-organization-code",
      value: "VNFKT"
    },
    display: "FIVE STAR HOMECARE LEEDS LTD"
  }
}

function createMedicationDispenseType(lineItemStatus: LineItemStatus): fhir.CodeableConcept {
  return {
    coding: VALUE_SET_LINE_ITEM_STATUS.filter(coding => coding.code === lineItemStatus)
  }
}

function createDispensedQuantity(
  requestedQuantity: fhir.Quantity,
  {statusCode, priorStatusCode, suppliedQuantityValue, dispensedQuantityValue, prescribedQuantityValue}: LineItemFormValues
): fhir.Quantity {
  const dispensedQuantity = {...requestedQuantity}
  if (statusCode === LineItemStatus.PARTIALLY_DISPENSED) {
    dispensedQuantity.value = parseInt(suppliedQuantityValue)
  } else if (statusCode !== LineItemStatus.DISPENSED || priorStatusCode === LineItemStatus.DISPENSED) {
    dispensedQuantity.value = 0
  } else if (statusCode === LineItemStatus.DISPENSED && priorStatusCode === LineItemStatus.PARTIALLY_DISPENSED) {
    dispensedQuantity.value = prescribedQuantityValue - dispensedQuantityValue
  }
  return dispensedQuantity
}

function createMessageHeader(
  prescriptionOrderMessageHeader: fhir.MessageHeader,
  focusResourceIds: Array<string>
): fhir.MessageHeader {
  return {
    resourceType: "MessageHeader",
    id: uuid.v4(),
    destination: prescriptionOrderMessageHeader.destination,
    sender: {
      ...prescriptionOrderMessageHeader.sender,
      reference: undefined
    },
    source: prescriptionOrderMessageHeader.source,
    //TODO - suspect unused - remove from translations?
    response: {
      code: "ok",
      identifier: "ffffffff-ffff-4fff-bfff-ffffffffffff"
    },
    eventCoding: EVENT_CODING_DISPENSE_NOTIFICATION,
    focus: focusResourceIds.map(id => ({reference: `urn:uuid:${id}`}))
  }
}

function keepOrReplaceMedication(requestedMedication: fhir.CodeableConcept, needsReplacement: boolean): fhir.CodeableConcept {
  const medicationToSupply = {
    "coding":  [
      {
        "system": "http://snomed.info/sct",
        "code": "1858411000001101",
        "display": "Paracetamol 500mg soluble tablets (Alliance Healthcare (Distribution) Ltd) 60 tablet"
      }
    ]
  } as fhir.CodeableConcept

  return needsReplacement ? medicationToSupply : requestedMedication
}
