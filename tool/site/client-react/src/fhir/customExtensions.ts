import {CodeableConcept, Coding, Extension, Identifier, Reference} from "fhir/r4"

function getExtensions<T>(extensions: Array<Extension>, urls: Array<string>): Array<T> {
  const nextUrl = urls.shift()
  const extensionsForUrl = extensions.filter(extension => extension.url === nextUrl)
  if (!urls.length) {
    return extensions as unknown as Array<T>
  }
  const nestedExtensions = extensionsForUrl.flatMap(extension => extension?.extension || [])
  return getExtensions(nestedExtensions, urls)
}

function getSingleExtension<T>(extensions: Array<Extension>, urls: Array<string>): T {
  const foundExtensions = getExtensions(extensions, urls)
  if (foundExtensions.length === 1) {
    return foundExtensions[0] as T
  }
  throw new Error(`Found ${extensions.length} when expecting only 1. Extensions: \n${extensions}\n Urls: \n${urls}`)
}

const URL_TASK_BUSINESS_STATUS = "https://fhir.nhs.uk/StructureDefinition/Extension-EPS-TaskBusinessStatus"
export interface TaskBusinessStatusExtension extends Extension {
  url: typeof URL_TASK_BUSINESS_STATUS,
  valueCoding: Coding
}
export const getTaskBusinessStatusExtension = (extensions: Array<Extension>): TaskBusinessStatusExtension[] =>
  getExtensions<TaskBusinessStatusExtension>(extensions, [
    URL_TASK_BUSINESS_STATUS
  ])

const URL_GROUP_IDENTIFIER_EXTENSION = "https://fhir.nhs.uk/StructureDefinition/Extension-DM-GroupIdentifier"
export interface GroupIdentifierExtension extends Extension {
  url: typeof URL_GROUP_IDENTIFIER_EXTENSION,
  extension: Array<PrescriptionShortFormIdExtension | PrescriptionLongFormIdExtension>
}
interface PrescriptionShortFormIdExtension extends Extension {
  url: "shortForm",
  valueIdentifier: Identifier
}

interface PrescriptionLongFormIdExtension extends Extension {
  url: "UUID",
  valueIdentifier: Identifier
}

export const getGroupIdentifierExtension = (extensions: Array<Extension>): GroupIdentifierExtension =>
  getSingleExtension<GroupIdentifierExtension>(extensions, [
    URL_GROUP_IDENTIFIER_EXTENSION
  ])

export const URL_CLAIM_SEQUENCE_IDENTIFIER = "https://fhir.nhs.uk/StructureDefinition/Extension-ClaimSequenceIdentifier"
export interface ClaimSequenceIdentifierExtension extends Extension {
  url: typeof URL_CLAIM_SEQUENCE_IDENTIFIER,
  valueIdentifier: Identifier
}
export const getClaimSequenceIdentifierExtension = (extensions: Array<Extension>): ClaimSequenceIdentifierExtension =>
  getSingleExtension<ClaimSequenceIdentifierExtension>(extensions, [
    URL_CLAIM_SEQUENCE_IDENTIFIER
  ])

export const URL_CLAIM_MEDICATION_REQUEST_REFERENCE = "https://fhir.nhs.uk/StructureDefinition/Extension-ClaimMedicationRequestReference"
export interface ClaimMedicationRequestReferenceExtension extends Extension {
  url: typeof URL_CLAIM_MEDICATION_REQUEST_REFERENCE,
  valueReference: Reference
}
export const getClaimMedicationRequestReferenceExtension = (extensions: Array<Extension>): ClaimMedicationRequestReferenceExtension =>
  getSingleExtension<ClaimMedicationRequestReferenceExtension>(extensions, [
    URL_CLAIM_MEDICATION_REQUEST_REFERENCE
  ])

const URL_REPEAT_INFORMATION = "https://fhir.nhs.uk/StructureDefinition/Extension-EPS-RepeatInformation"
interface RepeatInformationExtension extends Extension {
  url: typeof URL_REPEAT_INFORMATION
  extension: Array<NumberOfRepeatsIssuedExtension | NumberOfRepeatsAllowedExtension>
}
export const URL_NUMBER_OF_REPEATS_ISSUED = "numberOfRepeatsIssued"
interface NumberOfRepeatsIssuedExtension extends Extension {
  url: "numberOfRepeatsIssued"
  valueInteger: number
}
export const getRepeatInformationExtension = (extensions: Array<Extension>): RepeatInformationExtension =>
  getSingleExtension<RepeatInformationExtension>(extensions, [
    URL_REPEAT_INFORMATION
  ])
export const getNumberOfRepeatsIssuedExtension = (extensions: Array<Extension>): NumberOfRepeatsIssuedExtension =>
  getSingleExtension<NumberOfRepeatsIssuedExtension>(extensions, [
    URL_NUMBER_OF_REPEATS_ISSUED
  ])

const URL_PRESCRIPTION_EXTENSION = "https://fhir.nhs.uk/StructureDefinition/Extension-EPS-Prescription"
const URL_PRESCRIPTION_EXTENSION_COURSE_OF_THERAPY_EXTENSION = "courseOfTherapyType"
interface PrescriptionExtension extends Extension {
  url: typeof URL_PRESCRIPTION_EXTENSION,
  extension: Array<CourseOfTherapyTypeExtension>
}
interface CourseOfTherapyTypeExtension extends Extension {
  url: typeof URL_PRESCRIPTION_EXTENSION_COURSE_OF_THERAPY_EXTENSION,
  valueCoding: Coding
}
export const getPrescriptionExtension = (extensions: Array<Extension>): PrescriptionExtension =>
  getSingleExtension<PrescriptionExtension>(extensions, [
    URL_PRESCRIPTION_EXTENSION
  ])
export const getCourseOfTherapyTypeExtension = (extensions: Array<Extension>): CourseOfTherapyTypeExtension =>
  getSingleExtension<CourseOfTherapyTypeExtension>(extensions, [
    URL_PRESCRIPTION_EXTENSION,
    URL_PRESCRIPTION_EXTENSION_COURSE_OF_THERAPY_EXTENSION
  ])

export const URL_NUMBER_OF_REPEATS_ALLOWED = "numberOfRepeatsAllowed"
export interface NumberOfRepeatsAllowedExtension extends Extension {
  url: typeof URL_NUMBER_OF_REPEATS_ALLOWED
  valueInteger: number
}
export const getNumberOfRepeatsAllowedExtension = (extensions: Array<Extension>): NumberOfRepeatsAllowedExtension =>
  getSingleExtension<NumberOfRepeatsAllowedExtension>(extensions, [
    URL_NUMBER_OF_REPEATS_ALLOWED
  ])

export const URL_PERFORMER_SITE_TYPE = "https://fhir.nhs.uk/StructureDefinition/Extension-DM-PerformerSiteType"
export interface PerformerSiteTypeExtension extends Extension {
  url: typeof URL_PERFORMER_SITE_TYPE
  valueCoding: Coding
}
export const getPerformerSiteTypeExtension = (extensions: Array<Extension>): PerformerSiteTypeExtension =>
  getSingleExtension<PerformerSiteTypeExtension>(extensions, [
    URL_PERFORMER_SITE_TYPE
  ])

export const URL_PRESCRIPTION_ENDORSEMENT = "https://fhir.nhs.uk/StructureDefinition/Extension-DM-PrescriptionEndorsement"
export interface PrescriptionEndorsementExtension extends Extension {
  url: typeof URL_PRESCRIPTION_ENDORSEMENT
  valueCodeableConcept: CodeableConcept
}
export const getPrescriptionEndorsementExtension = (extensions: Array<Extension>): PrescriptionEndorsementExtension[] =>
  getExtensions<PrescriptionEndorsementExtension>(extensions, [
    URL_PRESCRIPTION_ENDORSEMENT
  ])
const URL_DISPENSING_INFORMATION_EXTENSION = "https://fhir.nhs.uk/StructureDefinition/Extension-EPS-DispensingInformation"
const URL_DISPENSING_INFORMATION_DISPENSE_STATUS_EXTENSION = "dispenseStatus"
interface DispenseStatusExtension extends Extension {
  url: typeof URL_DISPENSING_INFORMATION_DISPENSE_STATUS_EXTENSION,
  valueCoding: Coding
}

export const getDispenseStatusExtension = (extensions: Array<Extension>): DispenseStatusExtension =>
  getSingleExtension<DispenseStatusExtension>(extensions, [
    URL_DISPENSING_INFORMATION_EXTENSION,
    URL_DISPENSING_INFORMATION_DISPENSE_STATUS_EXTENSION
  ])
