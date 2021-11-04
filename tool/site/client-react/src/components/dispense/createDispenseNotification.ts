import {
  Bundle,
  CodeableConcept,
  Extension,
  Identifier,
  MedicationDispense,
  MedicationDispensePerformer,
  MedicationRequest,
  MessageHeader,
  Patient,
  Quantity,
  Reference
} from "fhir/r4"
import {DispenseFormValues, LineItemFormValues, PrescriptionFormValues} from "./dispenseForm"
import * as uuid from "uuid"
import {
  getLongFormIdExtension,
  TaskBusinessStatusExtension,
  URL_GROUP_IDENTIFIER_EXTENSION,
  URL_TASK_BUSINESS_STATUS
} from "../../fhir/customExtensions"
import {
  COURSE_OF_THERAPY_TYPE_CODES,
  LineItemStatus,
  PrescriptionStatus,
  VALUE_SET_LINE_ITEM_STATUS,
  VALUE_SET_NON_DISPENSING_REASON,
  VALUE_SET_PRESCRIPTION_STATUS
} from "../../fhir/reference-data/valueSets"
import {
  createDispensingRepeatInformationExtension,
  createUuidIdentifier,
  getMedicationRequestLineItemId, requiresDispensingRepeatInformationExtension
} from "../../fhir/helpers"

const EVENT_CODING_DISPENSE_NOTIFICATION = {
  system: "https://fhir.nhs.uk/CodeSystem/message-event",
  code: "dispense-notification",
  display: "Dispense Notification"
}

export function createDispenseNotification(
  prescriptionOrderMessageHeader: MessageHeader,
  prescriptionOrderPatient: Patient,
  medicationRequests: Array<MedicationRequest>,
  dispenseFormValues: DispenseFormValues
): Bundle {
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
    identifier: createUuidIdentifier(),
    type: "message",
    entry: [
      dispenseNotificationMessageHeader,
      dispenseNotificationPatient,
      ...medicationDispenses
    ].map(resource => ({resource, fullUrl: `urn:uuid:${resource.id}`}))
  }
}

function createPatient(patient: Patient) {
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
  medicationRequest: MedicationRequest,
  patient: Patient,
  lineItemFormValues: LineItemFormValues,
  prescriptionFormValues: PrescriptionFormValues
): MedicationDispense {
  const extensions: Array<Extension> = [createTaskBusinessStatusExtension(prescriptionFormValues.statusCode)]
  if (requiresDispensingRepeatInformationExtension(medicationRequest)) {
    const repeatInformationExtension = createDispensingRepeatInformationExtension(medicationRequest)
    extensions.push(repeatInformationExtension)
  }

  const lineItemId = getMedicationRequestLineItemId(medicationRequest)

  return {
    resourceType: "MedicationDispense",
    id: uuid.v4(),
    extension: extensions,
    identifier: [{
      system: "https://fhir.nhs.uk/Id/prescription-dispense-item-number",
      value: uuid.v4()
    }],
    //TODO - map from line item status (nice to have)
    status: "unknown",
    statusReasonCodeableConcept: createStatusReason(lineItemFormValues),
    medicationCodeableConcept: medicationRequest.medicationCodeableConcept,
    subject: {
      reference: `urn:uuid:${patient.id}`,
      identifier: patient.identifier[0]
    },
    performer: [
      //TODO - map from somewhere
      MEDICATION_DISPENSE_PERFORMER_PRACTITIONER,
      MEDICATION_DISPENSE_PERFORMER_ORGANIZATION
    ],
    authorizingPrescription: [createAuthorizingPrescription(medicationRequest.groupIdentifier, lineItemId)],
    type: createMedicationDispenseType(lineItemFormValues.statusCode),
    quantity: createDispensedQuantity(medicationRequest.dispenseRequest.quantity, lineItemFormValues),
    daysSupply: medicationRequest.dispenseRequest.expectedSupplyDuration,
    whenPrepared: new Date().toISOString(),
    dosageInstruction: medicationRequest.dosageInstruction
  }
}

function createTaskBusinessStatusExtension(prescriptionStatus: PrescriptionStatus): TaskBusinessStatusExtension {
  return {
    url: URL_TASK_BUSINESS_STATUS,
    valueCoding: VALUE_SET_PRESCRIPTION_STATUS.find(coding => coding.code === prescriptionStatus)
  }
}

function createStatusReason(lineItemFormValues: LineItemFormValues): CodeableConcept {
  if (lineItemFormValues.statusCode !== LineItemStatus.NOT_DISPENSED) {
    return undefined
  }
  return {
    coding: VALUE_SET_NON_DISPENSING_REASON.filter(coding => coding.code === lineItemFormValues.nonDispensingReasonCode)
  }
}

const MEDICATION_DISPENSE_PERFORMER_PRACTITIONER: MedicationDispensePerformer = {
  actor: {
    type: "Practitioner",
    identifier: {
      system: "https://fhir.hl7.org.uk/Id/gphc-number",
      value: "7654321"
    },
    display: "Mr Peter Potion"
  }
}

const MEDICATION_DISPENSE_PERFORMER_ORGANIZATION: MedicationDispensePerformer = {
  actor: {
    type: "Organization",
    identifier: {
      system: "https://fhir.nhs.uk/Id/ods-organization-code",
      value: "VNFKT"
    },
    display: "FIVE STAR HOMECARE LEEDS LTD"
  }
}

function createAuthorizingPrescription(groupIdentifier: Identifier, lineItemId: string): Reference {
  return {
    extension: [createGroupIdentifierExtension(groupIdentifier)],
    identifier: {
      system: "https://fhir.nhs.uk/Id/prescription-order-item-number",
      value: lineItemId
    }
  }
}

function createGroupIdentifierExtension({extension, system, value}: Identifier) {
  return {
    url: URL_GROUP_IDENTIFIER_EXTENSION,
    extension: [
      {
        url: "shortForm",
        valueIdentifier: {system, value}
      },
      {
        url: "UUID",
        valueIdentifier: getLongFormIdExtension(extension).valueIdentifier
      }
    ]
  }
}

function createMedicationDispenseType(lineItemStatus: LineItemStatus): CodeableConcept {
  return {
    coding: VALUE_SET_LINE_ITEM_STATUS.filter(coding => coding.code === lineItemStatus)
  }
}

function createDispensedQuantity(
  requestedQuantity: Quantity,
  {statusCode, priorStatusCode}: LineItemFormValues
): Quantity {
  const dispensedQuantity = {...requestedQuantity}
  //TODO - maybe handle custom quantities for partial dispensing
  if (statusCode !== LineItemStatus.DISPENSED || priorStatusCode === LineItemStatus.DISPENSED) {
    dispensedQuantity.value = 0
  }
  return dispensedQuantity
}

function createMessageHeader(
  prescriptionOrderMessageHeader: MessageHeader,
  focusResourceIds: Array<string>
): MessageHeader {
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
