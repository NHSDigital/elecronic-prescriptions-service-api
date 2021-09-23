import {fhir, hl7V3} from "@models"
import {
  getCodingForSystem,
  getExtensionForUrl,
  getExtensionForUrlOrNull,
  getIdentifierValueForSystem,
  getIdentifierValueOrNullForSystem,
  getMedicationCoding,
  getMessageId,
  getNumericValueAsString,
  onlyElement
} from "../../common"
import {getMedicationDispenses, getMessageHeader, getPatientOrNull} from "../../common/getResourcesOfType"
import {convertIsoDateTimeStringToHl7V3DateTime, convertMomentToHl7V3DateTime} from "../../common/dateTime"
import pino from "pino"
import {createAgentPersonForUnattendedAccess} from "../agent-unattended"
import moment from "moment"
import {createAgentOrganisationFromReference, createPriorPrescriptionReleaseEventRef} from "./dispense-common"
import {auditDoseToTextIfEnabled} from "../dosage"
import {
  Consumable,
  DispenseNotificationPertinentInformation2,
  DispenseNotificationSuppliedLineItemQuantityPertinentInformation1,
  RequestedManufacturedProduct,
  SuppliedLineItemComponent1,
  SupplyInstructions,
  SupplyRequest
} from "../../../../../../models/hl7-v3"

export async function convertDispenseNotification(
  bundle: fhir.Bundle,
  logger: pino.Logger
): Promise<hl7V3.DispenseNotification> {

  const messageId = getMessageId([bundle.identifier], "Bundle.identifier")

  const fhirHeader = getMessageHeader(bundle)
  const fhirPatient = getPatientOrNull(bundle)
  const fhirMedicationDispenses = getMedicationDispenses(bundle)
  const fhirFirstMedicationDispense = fhirMedicationDispenses[0]
  const fhirLineItemIdentifiers = getLineItemIdentifiers(fhirMedicationDispenses)

  //TODO - find out whether we need to handle user instead of organization (and what we do about org details if so)
  const fhirOrganisationPerformer = getOrganisationPerformer(fhirFirstMedicationDispense)
  const hl7AgentOrganisation = createAgentOrganisation(fhirOrganisationPerformer)
  const hl7Patient = createPatient(fhirPatient, fhirFirstMedicationDispense)
  const hl7CareRecordElementCategory = createCareRecordElementCategory(fhirLineItemIdentifiers)
  const hl7PriorMessageRef = createPriorMessageRef(fhirHeader)
  const hl7PriorPrescriptionReleaseEventRef = createPriorPrescriptionReleaseEventRef(fhirHeader)
  const hl7PertinentInformation1 = await createPertinentInformation1(
    bundle,
    messageId,
    fhirOrganisationPerformer,
    fhirMedicationDispenses,
    fhirFirstMedicationDispense,
    logger
  )

  const hl7DispenseNotification = new hl7V3.DispenseNotification(new hl7V3.GlobalIdentifier(messageId))
  hl7DispenseNotification.effectiveTime = convertMomentToHl7V3DateTime(moment.utc())
  hl7DispenseNotification.recordTarget = new hl7V3.RecordTargetReference(hl7Patient)
  hl7DispenseNotification.primaryInformationRecipient =
    new hl7V3.DispenseNotificationPrimaryInformationRecipient(hl7AgentOrganisation)
  hl7DispenseNotification.pertinentInformation1 = hl7PertinentInformation1
  hl7DispenseNotification.pertinentInformation2 = new DispenseNotificationPertinentInformation2(
    hl7CareRecordElementCategory
  )
  if (hl7PriorMessageRef) {
    hl7DispenseNotification.replacementOf = new hl7V3.ReplacementOf(hl7PriorMessageRef)
  }
  hl7DispenseNotification.sequelTo = new hl7V3.SequelTo(hl7PriorPrescriptionReleaseEventRef)

  return hl7DispenseNotification
}

async function createPertinentInformation1(
  bundle: fhir.Bundle,
  messageId: string,
  fhirOrganisation: fhir.DispensePerformer,
  fhirMedicationDispenses: Array<fhir.MedicationDispense>,
  fhirFirstMedicationDispense: fhir.MedicationDispense,
  logger: pino.Logger
) {
  const hl7RepresentedOrganisationCode = fhirOrganisation.actor.identifier.value
  const hl7AuthorTime = fhirFirstMedicationDispense.whenPrepared
  const hl7PertinentPrescriptionStatus = createPrescriptionStatus(fhirFirstMedicationDispense)
  const hl7PertinentPrescriptionIdentifier = createPrescriptionId(fhirFirstMedicationDispense)
  const hl7PriorOriginalRef = createOriginalPrescriptionRef(fhirFirstMedicationDispense)
  const hl7Author = await createAuthor(
    hl7RepresentedOrganisationCode,
    hl7AuthorTime,
    logger
  )
  const hl7PertinentInformation1LineItems = fhirMedicationDispenses.map(
    medicationDispense => {
      return createDispenseNotificationSupplyHeaderPertinentInformation1(
        medicationDispense,
        getMedicationCoding(bundle, medicationDispense),
        logger
      )
    }
  )
  const supplyHeader = new hl7V3.DispenseNotificationSupplyHeader(new hl7V3.GlobalIdentifier(messageId), hl7Author)
  supplyHeader.pertinentInformation1 = hl7PertinentInformation1LineItems
  supplyHeader.pertinentInformation3 = new hl7V3.SupplyHeaderPertinentInformation3(hl7PertinentPrescriptionStatus)
  supplyHeader.pertinentInformation4 = new hl7V3.SupplyHeaderPertinentInformation4(hl7PertinentPrescriptionIdentifier)
  supplyHeader.inFulfillmentOf = new hl7V3.InFulfillmentOf(hl7PriorOriginalRef)

  if (isRepeatDispensing(fhirFirstMedicationDispense)) {
    const repeatInfo = getExtensionForUrl(
      fhirFirstMedicationDispense.extension,
      "https://fhir.nhs.uk/StructureDefinition/Extension-EPS-RepeatInformation",
      "MedicationDispense.extension"
    ) as fhir.ExtensionExtension<fhir.IntegerExtension>

    supplyHeader.repeatNumber = getRepeatNumberFromRepeatInfoExtension(repeatInfo)
  }

  return new hl7V3.DispenseCommonPertinentInformation1(supplyHeader)
}

function getLineItemIdentifiers(fhirMedicationDispenses: Array<fhir.MedicationDispense>) {
  return fhirMedicationDispenses.map(medicationDispense =>
    getIdentifierValueForSystem(
      medicationDispense.identifier,
      "https://fhir.nhs.uk/Id/prescription-dispense-item-number",
      "MedicationDispense.identifier"
    )
  )
}

function getNhsNumber(fhirPatient: fhir.Patient, fhirFirstMedicationDispense: fhir.MedicationDispense) {
  return fhirPatient
    ? getIdentifierValueOrNullForSystem(
      fhirPatient.identifier,
      "https://fhir.nhs.uk/Id/nhs-number",
      "Patient.identifier.value")
    : fhirFirstMedicationDispense.subject.identifier.value
}

function createPatient(patient: fhir.Patient, firstMedicationDispense: fhir.MedicationDispense): hl7V3.Patient {
  const nhsNumber = getNhsNumber(patient, firstMedicationDispense)
  const hl7Patient = new hl7V3.Patient()
  hl7Patient.id = new hl7V3.NhsNumber(nhsNumber)
  return hl7Patient
}

async function createAuthor(
  organisationCode: string,
  authorTime: string,
  logger: pino.Logger
): Promise<hl7V3.PrescriptionAuthor> {
  const author = new hl7V3.PrescriptionAuthor()
  author.time = convertIsoDateTimeStringToHl7V3DateTime(authorTime, "MedicationDispense.whenPrepared")
  author.signatureText = hl7V3.Null.NOT_APPLICABLE
  author.AgentPerson = await createAgentPersonForUnattendedAccess(organisationCode, logger)
  return author
}

function createCareRecordElementCategory(fhirIdentifiers: Array<string>) {
  const hl7CareRecordElementCategory = new hl7V3.CareRecordElementCategory()
  hl7CareRecordElementCategory.component = fhirIdentifiers.map(
    fhirIdentifier => new hl7V3.CareRecordElementCategoryComponent(
      new hl7V3.ActRef({
        _attributes: {
          classCode: "SBADM",
          moodCode: "PRMS"
        },
        id: new hl7V3.GlobalIdentifier(fhirIdentifier)
      })
    )
  )
  return hl7CareRecordElementCategory
}

function createPriorMessageRef(fhirHeader: fhir.MessageHeader) {
  const replacementOf = getExtensionForUrlOrNull(
    fhirHeader.extension,
    "https://fhir.nhs.uk/StructureDefinition/Extension-replacementOf",
    "MessageHeader.extension"
  ) as fhir.IdentifierExtension

  if (replacementOf) {
    return new hl7V3.MessageRef(new hl7V3.GlobalIdentifier(replacementOf.valueIdentifier.value))
  }
}

export function createDispenseNotificationSupplyHeaderPertinentInformation1(
  fhirMedicationDispense: fhir.MedicationDispense,
  medicationCoding: fhir.Coding,
  logger: pino.Logger
): hl7V3.SupplyHeaderPertinentInformation1<hl7V3.DispenseNotificationSuppliedLineItem> {
  const fhirPrescriptionDispenseItemNumber = getPrescriptionItemNumber(fhirMedicationDispense)
  const fhirPrescriptionLineItemStatus = getPrescriptionLineItemStatus(fhirMedicationDispense)
  const fhirDosageInstruction = getDosageInstruction(fhirMedicationDispense, logger)

  const hl7SuppliedLineItemQuantitySnomedCode = new hl7V3.SnomedCode(
    fhirMedicationDispense.quantity.code,
    fhirMedicationDispense.quantity.unit
  )
  const hl7UnitValue = fhirMedicationDispense.quantity.value.toString()
  const hl7Quantity = new hl7V3.QuantityInAlternativeUnits(
    hl7UnitValue,
    hl7UnitValue,
    hl7SuppliedLineItemQuantitySnomedCode
  )
  const hl7ItemStatusCode = new hl7V3.ItemStatusCode(
    fhirPrescriptionLineItemStatus.code,
    fhirPrescriptionLineItemStatus.display
  )
  const hl7PriorOriginalItemRef = getPrescriptionItemId(fhirMedicationDispense)
  const hl7SuppliedLineItemQuantity = createSuppliedLineItemQuantity(
    hl7Quantity,
    medicationCoding,
    fhirDosageInstruction
  )

  const hl7PertinentSuppliedLineItem = new hl7V3.DispenseNotificationSuppliedLineItem(
    new hl7V3.GlobalIdentifier(fhirPrescriptionDispenseItemNumber)
  )
  hl7PertinentSuppliedLineItem.consumable = new Consumable(
    new RequestedManufacturedProduct(
      new hl7V3.ManufacturedRequestedMaterial(
        hl7SuppliedLineItemQuantitySnomedCode
      )
    )
  )
  hl7PertinentSuppliedLineItem.component = new hl7V3.SuppliedLineItemComponent(hl7SuppliedLineItemQuantity)
  hl7PertinentSuppliedLineItem.component1 = new SuppliedLineItemComponent1(
    new SupplyRequest(hl7SuppliedLineItemQuantitySnomedCode, hl7Quantity)
  )
  hl7PertinentSuppliedLineItem.pertinentInformation3 = new hl7V3.SuppliedLineItemPertinentInformation3(
    new hl7V3.ItemStatus(hl7ItemStatusCode)
  )
  hl7PertinentSuppliedLineItem.inFulfillmentOf = new hl7V3.SuppliedLineItemInFulfillmentOf(
    new hl7V3.OriginalPrescriptionRef(new hl7V3.GlobalIdentifier(hl7PriorOriginalItemRef))
  )

  if (isRepeatDispensing(fhirMedicationDispense)) {
    const repeatInfo = getExtensionForUrl(
      fhirMedicationDispense.extension,
      "https://fhir.nhs.uk/StructureDefinition/Extension-EPS-RepeatInformation",
      "MedicationDispense.extension"
    ) as fhir.ExtensionExtension<fhir.IntegerExtension>

    hl7PertinentSuppliedLineItem.repeatNumber = getRepeatNumberFromRepeatInfoExtension(repeatInfo)
  }

  return new hl7V3.SupplyHeaderPertinentInformation1(hl7PertinentSuppliedLineItem)
}

export function getRepeatNumberFromRepeatInfoExtension(
  repeatInfoExtension: fhir.ExtensionExtension<fhir.IntegerExtension>
): hl7V3.Interval<hl7V3.NumericValue> {
  const numberOfRepeatsIssuedExtension = getExtensionForUrl(
    repeatInfoExtension.extension,
    "numberOfRepeatsIssued",
    /* eslint-disable-next-line max-len */
    "MedicationDispense.extension(\"https://fhir.nhs.uk/StructureDefinition/Extension-EPS-RepeatInformation\").extension"
  ) as fhir.IntegerExtension
  const numberOfRepeatsIssued = getNumericValueAsString(numberOfRepeatsIssuedExtension.valueInteger)
  const numberOfRepeatsAllowedExtension = getExtensionForUrl(
    repeatInfoExtension.extension,
    "numberOfRepeatsAllowed",
    /* eslint-disable-next-line max-len */
    "MedicationDispense.extension(\"https://fhir.nhs.uk/StructureDefinition/Extension-EPS-RepeatInformation\").extension"
  ) as fhir.IntegerExtension
  const numberOfRepeatsAllowed = getNumericValueAsString(numberOfRepeatsAllowedExtension.valueInteger)

  return new hl7V3.Interval<hl7V3.NumericValue>(
    new hl7V3.NumericValue(numberOfRepeatsIssued),
    new hl7V3.NumericValue(numberOfRepeatsAllowed)
  )
}

export function createSuppliedLineItemQuantity(
  hl7Quantity: hl7V3.QuantityInAlternativeUnits,
  fhirProductCoding: fhir.Coding,
  fhirDosageInstruction: fhir.Dosage
): hl7V3.DispenseNotificationSuppliedLineItemQuantity {
  const productCode = new hl7V3.SnomedCode(fhirProductCoding.code, fhirProductCoding.display)
  const manufacturedRequestedMaterial = new hl7V3.ManufacturedRequestedMaterial(productCode)
  const suppliedManufacturedProduct = new hl7V3.SuppliedManufacturedProduct(manufacturedRequestedMaterial)
  const dispenseProduct = new hl7V3.DispenseProduct(suppliedManufacturedProduct)
  const hl7SuppliedLineItemQuantity = new hl7V3.DispenseNotificationSuppliedLineItemQuantity(
    hl7Quantity,
    dispenseProduct
  )
  // eslint-disable-next-line max-len
  hl7SuppliedLineItemQuantity.pertinentInformation1 = new DispenseNotificationSuppliedLineItemQuantityPertinentInformation1(
    new SupplyInstructions(fhirDosageInstruction.text)
  )
  return hl7SuppliedLineItemQuantity
}

export function getOrganisationPerformer(fhirFirstMedicationDispense: fhir.MedicationDispense): fhir.DispensePerformer {
  return fhirFirstMedicationDispense.performer.find(p => p.actor.type === "Organization")
}

export function getFhirGroupIdentifierExtension(
  fhirFirstMedicationDispense: fhir.MedicationDispense
): fhir.ExtensionExtension<fhir.Extension> {
  const fhirAuthorizingPrescriptionExtensions =
    fhirFirstMedicationDispense.authorizingPrescription.flatMap(e => e.extension)
  const fhirGroupIdentifierExtension = getExtensionForUrl(
    fhirAuthorizingPrescriptionExtensions,
    "https://fhir.nhs.uk/StructureDefinition/Extension-DM-GroupIdentifier",
    "MedicationDispense.authorizingPrescription") as fhir.ExtensionExtension<fhir.Extension>
  return fhirGroupIdentifierExtension
}

export function getPrescriptionStatus(fhirFirstMedicationDispense: fhir.MedicationDispense): fhir.CodingExtension {
  return getExtensionForUrl(
    fhirFirstMedicationDispense.extension,
    "https://fhir.nhs.uk/StructureDefinition/Extension-EPS-TaskBusinessStatus",
    "MedicationDispense.extension") as fhir.CodingExtension
}

export function getPrescriptionItemId(fhirMedicationDispense: fhir.MedicationDispense): string {
  return getIdentifierValueForSystem(
    fhirMedicationDispense.authorizingPrescription.map(e => e.identifier),
    "https://fhir.nhs.uk/Id/prescription-order-item-number",
    "MedicationDispense.authorizingPrescription.identifier"
  )
}

export function getDosageInstruction(
  fhirMedicationDispense: fhir.MedicationDispense,
  logger: pino.Logger
): fhir.Dosage {
  auditDoseToTextIfEnabled(fhirMedicationDispense.dosageInstruction, logger)
  return onlyElement(
    fhirMedicationDispense.dosageInstruction,
    "MedicationDispense.dosageInstruction"
  )
}

export function getPrescriptionItemNumber(fhirMedicationDispense: fhir.MedicationDispense): string {
  return getIdentifierValueForSystem(
    fhirMedicationDispense.identifier,
    "https://fhir.nhs.uk/Id/prescription-dispense-item-number",
    "MedicationDispense.identifier"
  )
}

export function getPrescriptionLineItemStatus(fhirMedicationDispense: fhir.MedicationDispense): fhir.Coding {
  return getCodingForSystem(
    fhirMedicationDispense.type.coding,
    "https://fhir.nhs.uk/CodeSystem/medicationdispense-type",
    "MedicationDispense.type.coding"
  )
}

export function createPrescriptionId(
  fhirFirstMedicationDispense: fhir.MedicationDispense
): hl7V3.PrescriptionId {
  const fhirGroupIdentifierExtension = getFhirGroupIdentifierExtension(fhirFirstMedicationDispense)
  const fhirAuthorizingPrescriptionShortFormIdExtension = getExtensionForUrl(
    fhirGroupIdentifierExtension.extension,
    "shortForm",
    "MedicationDispense.authorizingPrescription.extension.valueIdentifier"
  ) as fhir.IdentifierExtension
  const hl7PertinentPrescriptionId = fhirAuthorizingPrescriptionShortFormIdExtension
    .valueIdentifier
    .value
  return new hl7V3.PrescriptionId(hl7PertinentPrescriptionId)
}

export function createOriginalPrescriptionRef(
  firstMedicationDispense: fhir.MedicationDispense
): hl7V3.OriginalPrescriptionRef {
  const fhirGroupIdentifierExtension = getFhirGroupIdentifierExtension(firstMedicationDispense)
  const fhirAuthorizingPrescriptionShortFormIdExtension = getExtensionForUrl(
    fhirGroupIdentifierExtension.extension,
    "UUID",
    "MedicationDispense.authorizingPrescription.extension.valueIdentifier"
  ) as fhir.IdentifierExtension
  const id = fhirAuthorizingPrescriptionShortFormIdExtension.valueIdentifier.value
  return new hl7V3.OriginalPrescriptionRef(
    new hl7V3.GlobalIdentifier(id)
  )
}

export function createPrescriptionStatus(
  fhirFirstMedicationDispense: fhir.MedicationDispense
): hl7V3.PrescriptionStatus {
  const prescriptionStatusExtension = getPrescriptionStatus(fhirFirstMedicationDispense)
  const prescriptionStatusCoding = prescriptionStatusExtension.valueCoding
  return new hl7V3.PrescriptionStatus(prescriptionStatusCoding.code, prescriptionStatusCoding.display)
}

export function isRepeatDispensing(medicationDispense: fhir.MedicationDispense): boolean {
  return !!getExtensionForUrlOrNull(
    medicationDispense.extension,
    "https://fhir.nhs.uk/StructureDefinition/Extension-EPS-RepeatInformation",
    "MedicationDispense.extension"
  )
}

export function createAgentOrganisation(
  organisation: fhir.DispensePerformer
): hl7V3.AgentOrganization {
  return createAgentOrganisationFromReference(organisation.actor)
}
