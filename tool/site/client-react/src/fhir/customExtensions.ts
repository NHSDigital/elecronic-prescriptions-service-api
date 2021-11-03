import {Coding, Extension, Identifier, Reference} from "fhir/r4"

function getExtensionFinder<T extends Extension>(url: string) {
  return (extensions: Array<Extension>) => extensions.find(extension => extension.url === url) as T
}

class ExtensionFinder<T extends Extension> {
  extensionUrls: Array<string>
  constructor() {
    this.extensionUrls = new Array<string>()
  }
  addExtension(url: string): this {
    this.extensionUrls.push(url)
    return this
  }
  findExtension() {
    return (extensions: Array<Extension>) => {
      return this.find(extensions)
    }
  }
  private find(extensions: Array<Extension>): T {
    const url = this.extensionUrls.shift()
    const foundExtension = extensions.find(e => e.url === url)
    if (!this.extensionUrls.length) {
      return foundExtension as T
    } else if (foundExtension.extension === undefined) {
      throw new Error(`Extension with url: '${foundExtension.url}' does not have any nested extension with url: '${url}'`)
    }
    return this.find(foundExtension.extension)
  }
}

const URL_TASK_BUSINESS_STATUS = "https://fhir.nhs.uk/StructureDefinition/Extension-EPS-TaskBusinessStatus"
export interface TaskBusinessStatusExtension extends Extension {
  url: typeof URL_TASK_BUSINESS_STATUS,
  valueCoding: Coding
}
export const getTaskBusinessStatusExtension = getExtensionFinder<TaskBusinessStatusExtension>(URL_TASK_BUSINESS_STATUS)

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
export const getGroupIdentifierExtension = getExtensionFinder<GroupIdentifierExtension>(URL_GROUP_IDENTIFIER_EXTENSION)

export const URL_CLAIM_SEQUENCE_IDENTIFIER = "https://fhir.nhs.uk/StructureDefinition/Extension-ClaimSequenceIdentifier"
export interface ClaimSequenceIdentifierExtension extends Extension {
  url: typeof URL_CLAIM_SEQUENCE_IDENTIFIER,
  valueIdentifier: Identifier
}
export const getClaimSequenceIdentifierExtension = getExtensionFinder<ClaimSequenceIdentifierExtension>(URL_CLAIM_SEQUENCE_IDENTIFIER)

export const URL_CLAIM_MEDICATION_REQUEST_REFERENCE = "https://fhir.nhs.uk/StructureDefinition/Extension-ClaimMedicationRequestReference"
export interface ClaimMedicationRequestReferenceExtension extends Extension {
  url: typeof URL_CLAIM_MEDICATION_REQUEST_REFERENCE,
  valueReference: Reference
}
export const getClaimMedicationRequestReferenceExtension = getExtensionFinder<ClaimMedicationRequestReferenceExtension>(URL_CLAIM_MEDICATION_REQUEST_REFERENCE)

const URL_REPEAT_INFORMATION = "https://fhir.nhs.uk/StructureDefinition/Extension-EPS-RepeatInformation"
interface RepeatInformationExtension extends Extension {
  url: typeof URL_REPEAT_INFORMATION
  extension: Array<NumberOfRepeatsIssuedExtension | NumberOfRepeatsAllowedExtension>
}
interface NumberOfRepeatsIssuedExtension extends Extension {
  url: "numberOfRepeatsIssued"
  valueInteger: number
}
interface NumberOfRepeatsAllowedExtension extends Extension {
  url: "numberOfRepeatsAllowed"
  valueInteger: number
}
export const getRepeatInformationExtension = getExtensionFinder<RepeatInformationExtension>(URL_REPEAT_INFORMATION)

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
export const getPrescriptionExtension = getExtensionFinder<PrescriptionExtension>(URL_PRESCRIPTION_EXTENSION)
export const getCourseOfTherapyTypeExtension =
  new ExtensionFinder<CourseOfTherapyTypeExtension>()
    .addExtension(URL_PRESCRIPTION_EXTENSION)
    .addExtension(URL_PRESCRIPTION_EXTENSION_COURSE_OF_THERAPY_EXTENSION)
    .findExtension()
