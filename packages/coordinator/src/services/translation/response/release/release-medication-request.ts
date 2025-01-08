import * as uuid from "uuid"
import {
  createGroupIdentifier,
  createItemNumberIdentifier,
  createResponsiblePractitionerExtension
} from "../medication-request"
import {toArray} from "../../common"
import {parseAdditionalInstructions} from "./additional-instructions"
import {convertHL7V3DateTimeToIsoDateTimeString, convertHL7V3DateToIsoDateString} from "../../common/dateTime"
import {fhir, hl7V3} from "@models"
import {LosslessNumber} from "lossless-json"

export function createMedicationRequest(
  prescription: hl7V3.Prescription,
  lineItem: hl7V3.LineItem,
  patientId: string,
  requesterId: string,
  responsiblePartyId: string
): fhir.MedicationRequest {
  const text = lineItem.pertinentInformation1?.pertinentAdditionalInstructions?.value?._text ?? ""
  const additionalInstructions = parseAdditionalInstructions(text)
  const courseOfTherapyType = createCourseOfTherapyType(
    prescription.pertinentInformation5.pertinentPrescriptionTreatmentType,
    lineItem.repeatNumber
  )
  const intent = courseOfTherapyType === fhir.COURSE_OF_THERAPY_TYPE_CONTINUOUS_REPEAT_DISPENSING
    ? fhir.MedicationRequestIntent.REFLEX_ORDER
    : fhir.MedicationRequestIntent.ORDER
  const isReflexOrder = intent === fhir.MedicationRequestIntent.REFLEX_ORDER
  const isContinuous = courseOfTherapyType === fhir.COURSE_OF_THERAPY_TYPE_CONTINUOUS

  const medicationRequest: fhir.MedicationRequest = {
    resourceType: "MedicationRequest",
    id: uuid.v4(),
    extension: createMedicationRequestExtensions(
      responsiblePartyId,
      prescription.pertinentInformation4.pertinentPrescriptionType,
      lineItem.repeatNumber,
      prescription.pertinentInformation7?.pertinentReviewDate,
      toArray(lineItem.pertinentInformation3 ?? []).map(pi3 => pi3.pertinentPrescriberEndorsement),
      additionalInstructions.controlledDrugWords,
      prescription.predecessor?.priorPreviousIssueDate
    ),
    identifier: [
      createItemNumberIdentifier(lineItem.id._attributes.root)
    ],
    // TODO: work out what the default value is for the tracker
    // TODO: refactor to separate concerns for tracker and release response
    status: lineItem.pertinentInformation4
      ? getStatus(lineItem.pertinentInformation4.pertinentItemStatus)
      : fhir.MedicationRequestStatus.ACTIVE,
    intent: intent,
    medicationCodeableConcept: createSnomedCodeableConcept(
      lineItem.product.manufacturedProduct.manufacturedRequestedMaterial.code
    ),
    subject: fhir.createReference(patientId),
    authoredOn: convertHL7V3DateTimeToIsoDateTimeString(prescription.author.time),
    category: [fhir.createCodeableConcept(
      "http://terminology.hl7.org/CodeSystem/medicationrequest-category", "outpatient", "Outpatient"
    )],
    requester: fhir.createReference(requesterId),
    groupIdentifier: createGroupIdentifierFromPrescriptionIds(prescription.id),
    courseOfTherapyType: courseOfTherapyType,
    note: createNote(additionalInstructions.additionalInstructions),
    dosageInstruction: [
      createDosage(lineItem.pertinentInformation2.pertinentDosageInstructions)
    ],
    dispenseRequest: createDispenseRequest(
      prescription.pertinentInformation1.pertinentDispensingSitePreference,
      lineItem.component.lineItemQuantity,
      prescription.component1?.daysSupply,
      prescription.performer,
      lineItem.repeatNumber?.high
    ),
    substitution: createSubstitution()
  }

  if (isReflexOrder || isContinuous) {
    const {id} = lineItem
    medicationRequest.basedOn = createBasedOn(id._attributes.root, prescription.repeatNumber)
  }

  return medicationRequest
}

export function createMedicationRequestExtensions(
  responsiblePartyId: string,
  prescriptionType: hl7V3.PrescriptionType,
  lineItemRepeatNumber: hl7V3.Interval<hl7V3.NumericValue>,
  reviewDate: hl7V3.ReviewDate,
  lineItemEndorsements: Array<hl7V3.PrescriptionEndorsement>,
  controlledDrugWords: string,
  previousIssueDate: hl7V3.PreviousIssueDate
): Array<fhir.MedicationRequestPermittedExtensions> {
  const extensions: Array<fhir.MedicationRequestPermittedExtensions> = [
    createResponsiblePractitionerExtension(responsiblePartyId),
    createPrescriptionTypeExtension(prescriptionType),
    ...lineItemEndorsements.map(createEndorsementExtension)
  ]
  if (reviewDate || lineItemRepeatNumber) {
    const repeatInformationExtension = createRepeatInformationExtension(reviewDate, lineItemRepeatNumber)
    extensions.push(repeatInformationExtension)
  }
  if (controlledDrugWords) {
    const controlledDrugExtension = createControlledDrugExtension(controlledDrugWords)
    extensions.push(controlledDrugExtension)
  }
  if (previousIssueDate) {
    const dispensingInformationExtension = createDispensingInformationExtension(previousIssueDate)
    extensions.push(dispensingInformationExtension)
  }
  return extensions
}

function createBasedOn(
  identifierReference: string,
  prescriptionRepeatNumber: hl7V3.Interval<hl7V3.NumericValue>
): Array<fhir.MedicationRequestBasedOn> {
  const reference = fhir.createReference(identifierReference.toLowerCase())

  const repeatNumberHighValue = parseInt(prescriptionRepeatNumber.high._attributes.value)
  const decrementedRepeatNumberHighValue = (repeatNumberHighValue - 1).toString()

  const repeatNumberLowValue = parseInt(prescriptionRepeatNumber.low._attributes.value)
  const decrementedRepeatNumberLowValue = (repeatNumberLowValue - 1).toString()

  const basedOnRepeatExtension = {
    url: "https://fhir.nhs.uk/StructureDefinition/Extension-EPS-RepeatInformation",
    extension: [{
      url: "numberOfRepeatsAllowed",
      valueInteger: new LosslessNumber(decrementedRepeatNumberHighValue)
    },
    {
      url: "numberOfRepeatsIssued",
      valueInteger: new LosslessNumber(decrementedRepeatNumberLowValue)
    }]

  }

  return [{
    ...reference,
    extension: [basedOnRepeatExtension]
  }]
}

function createRepeatInformationExtension(
  reviewDate: hl7V3.ReviewDate,
  lineItemRepeatNumber: hl7V3.Interval<hl7V3.NumericValue>
): fhir.UkCoreRepeatInformationExtension {
  const extensions: Array<fhir.UnsignedIntExtension | fhir.DateTimeExtension> = []

  if (reviewDate?.value) {
    extensions.push({
      url: "authorisationExpiryDate",
      valueDateTime: convertHL7V3DateToIsoDateString(reviewDate.value)
    })
  }

  if (lineItemRepeatNumber?.low?._attributes?.value) {
    extensions.push({
      url: "numberOfPrescriptionsIssued",
      valueUnsignedInt: new LosslessNumber(lineItemRepeatNumber.low._attributes.value)
    })
  }

  return {
    url: "https://fhir.hl7.org.uk/StructureDefinition/Extension-UKCore-MedicationRepeatInformation",
    extension: extensions
  }
}

function createEndorsementExtension(
  prescriptionEndorsement: hl7V3.PrescriptionEndorsement
): fhir.CodeableConceptExtension {
  return {
    url: "https://fhir.nhs.uk/StructureDefinition/Extension-DM-PrescriptionEndorsement",
    valueCodeableConcept: {
      coding: [{
        code: prescriptionEndorsement.value._attributes.code,
        system: "https://fhir.nhs.uk/CodeSystem/medicationrequest-endorsement",
        display: prescriptionEndorsement.value._attributes.displayName
      }]
    }
  }
}

function createPrescriptionTypeExtension(
  pertinentPrescriptionType: hl7V3.PrescriptionType
): fhir.CodingExtension {
  return {
    url: "https://fhir.nhs.uk/StructureDefinition/Extension-DM-PrescriptionType",
    valueCoding: {
      system: "https://fhir.nhs.uk/CodeSystem/prescription-type",
      code: pertinentPrescriptionType.value._attributes.code,
      display: pertinentPrescriptionType.value._attributes.displayName
    }
  }
}

function createControlledDrugExtension(controlledDrugWords: string): fhir.ControlledDrugExtension {
  return {
    url: "https://fhir.nhs.uk/StructureDefinition/Extension-DM-ControlledDrug",
    extension: [{
      url: "quantityWords",
      valueString: controlledDrugWords
    }]
  }
}

function createDispensingInformationExtension(
  previousIssueDate: hl7V3.PreviousIssueDate
): fhir.DispensingInformationExtension {
  return {
    url: "https://fhir.nhs.uk/StructureDefinition/Extension-EPS-DispensingInformation",
    extension: [{
      url: "dateLastDispensed",
      valueDateTime: convertHL7V3DateTimeToIsoDateTimeString(previousIssueDate.value)
    }]
  }
}

export function createCourseOfTherapyType(
  prescriptionTreatmentType: hl7V3.PrescriptionTreatmentType,
  lineItemRepeatNumber: hl7V3.Interval<hl7V3.NumericValue>
): fhir.CodeableConcept {
  const isRepeatDispensing = prescriptionTreatmentType.value._attributes.code
    === hl7V3.PrescriptionTreatmentTypeCode.CONTINUOUS_REPEAT_DISPENSING._attributes.code
  if (isRepeatDispensing) {
    return fhir.COURSE_OF_THERAPY_TYPE_CONTINUOUS_REPEAT_DISPENSING
  } else if (lineItemRepeatNumber) {
    return fhir.COURSE_OF_THERAPY_TYPE_CONTINUOUS
  } else {
    return fhir.COURSE_OF_THERAPY_TYPE_ACUTE
  }
}

export function getStatus(pertinentItemStatus: hl7V3.ItemStatus): fhir.MedicationRequestStatus {
  const itemStatusCode = pertinentItemStatus.value._attributes.code
  switch (itemStatusCode) {
    case hl7V3.ItemStatusCode.FULLY_DISPENSED._attributes.code:
      return fhir.MedicationRequestStatus.COMPLETED
    case hl7V3.ItemStatusCode.NOT_DISPENSED._attributes.code:
    case hl7V3.ItemStatusCode.EXPIRED._attributes.code:
      return fhir.MedicationRequestStatus.STOPPED
    case hl7V3.ItemStatusCode.DISPENSED_PARTIAL._attributes.code:
    case hl7V3.ItemStatusCode.NOT_DISPENSED_OWING._attributes.code:
    case hl7V3.ItemStatusCode.TO_BE_DISPENSED._attributes.code:
    case hl7V3.ItemStatusCode.WITH_DISPENSER._attributes.code:
      return fhir.MedicationRequestStatus.ACTIVE
    case hl7V3.ItemStatusCode.CANCELLED._attributes.code:
      return fhir.MedicationRequestStatus.CANCELLED
    default:
      throw new TypeError(`Unhandled item status code ${itemStatusCode}`)
  }
}

export function createSnomedCodeableConcept(code: hl7V3.SnomedCode): fhir.CodeableConcept {
  return fhir.createCodeableConcept("http://snomed.info/sct", code._attributes.code, code._attributes.displayName)
}

export function createNote(additionalInstructions: string): Array<fhir.Annotation> {
  if (!additionalInstructions) {
    return undefined
  }

  return [{
    text: additionalInstructions
  }]
}

export function createDosage(dosageInstructions: hl7V3.DosageInstructions): fhir.Dosage {
  return {
    text: dosageInstructions.value._text
  }
}

function createDispenseRequestQuantity(lineItemQuantity: hl7V3.LineItemQuantity): fhir.SimpleQuantity {
  const lineItemQuantityTranslation = lineItemQuantity.quantity.translation
  let value = lineItemQuantityTranslation._attributes.value
  // Catch numbers like `.5`, which cannot be parsed, and prepend a 0
  // `0.5` can be parsed correctly.
  if (value.startsWith(".")) {
    value = "0"+value
  };
  return {
    value: new LosslessNumber(value),
    unit: lineItemQuantityTranslation._attributes.displayName,
    system: "http://snomed.info/sct",
    code: lineItemQuantityTranslation._attributes.code
  }
}

function createValidityPeriod(effectiveTime: hl7V3.Interval<hl7V3.Timestamp>): fhir.Period {
  const validityPeriod: fhir.Period = {}
  if (effectiveTime.low) {
    validityPeriod.start = convertHL7V3DateToIsoDateString(effectiveTime.low)
  }
  if (effectiveTime.high) {
    validityPeriod.end = convertHL7V3DateToIsoDateString(effectiveTime.high)
  }
  return validityPeriod
}

function createExpectedSupplyDuration(expectedUseTime: hl7V3.IntervalUnanchored): fhir.SimpleQuantity {
  return {
    unit: "days",
    value: new LosslessNumber(expectedUseTime.width._attributes.value),
    system: "http://unitsofmeasure.org",
    code: "d"
  }
}

export function createDispenseRequest(
  dispensingSitePreference: hl7V3.DispensingSitePreference,
  lineItemQuantity: hl7V3.LineItemQuantity,
  daysSupply: hl7V3.DaysSupply,
  performer: hl7V3.PrescriptionPerformer,
  lineItemRepeatNumberHigh?: hl7V3.NumericValue
): fhir.MedicationRequestDispenseRequest {

  const repeatHigh = lineItemRepeatNumberHigh?._attributes.value ?
    parseInt(lineItemRepeatNumberHigh?._attributes.value) - 1 : 0
  const numberOfRepeatsAllowed = new LosslessNumber(repeatHigh.toString())

  const dispenseRequest: fhir.MedicationRequestDispenseRequest = {
    extension: [
      createPerformerSiteTypeExtension(dispensingSitePreference)
    ],
    numberOfRepeatsAllowed: numberOfRepeatsAllowed,
    quantity: createDispenseRequestQuantity(lineItemQuantity)
  }
  if (daysSupply?.effectiveTime?.low || daysSupply?.effectiveTime?.high) {
    dispenseRequest.validityPeriod = createValidityPeriod(daysSupply.effectiveTime)
  }
  if (daysSupply?.expectedUseTime?.width) {
    dispenseRequest.expectedSupplyDuration = createExpectedSupplyDuration(daysSupply.expectedUseTime)
  }
  if (performer) {
    dispenseRequest.performer = createPerformer(performer.AgentOrgSDS.agentOrganizationSDS)
  }
  return dispenseRequest
}

function createPerformerSiteTypeExtension(
  dispensingSitePreference: hl7V3.DispensingSitePreference
): fhir.CodingExtension {
  return {
    url: "https://fhir.nhs.uk/StructureDefinition/Extension-DM-PerformerSiteType",
    valueCoding: {
      system: "https://fhir.nhs.uk/CodeSystem/dispensing-site-preference",
      code: dispensingSitePreference.value._attributes.code
    }
  }
}

function createPerformer(performerOrganization: hl7V3.Organization): fhir.Performer {
  return {
    identifier: {
      system: "https://fhir.nhs.uk/Id/ods-organization-code",
      value: performerOrganization.id._attributes.extension
    }
  }
}

export function createGroupIdentifierFromPrescriptionIds(
  prescriptionIds: [hl7V3.GlobalIdentifier, hl7V3.ShortFormPrescriptionIdentifier]
): fhir.MedicationRequestGroupIdentifier {
  const shortFormId = prescriptionIds[1]._attributes.extension
  const longFormId = prescriptionIds[0]._attributes.root.toLowerCase()
  return createGroupIdentifier(shortFormId, longFormId)
}

function createSubstitution() {
  return {
    allowedBoolean: false as const
  }
}
