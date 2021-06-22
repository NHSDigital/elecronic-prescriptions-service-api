import * as common from "./common"
import * as practitionerRole from "./practitioner-role"
import * as patient from "./patient"
import * as medication from "./medication"
import * as extension from "./extension"
import {LosslessNumber} from "lossless-json"
import {PerformanceNodeTiming} from "perf_hooks"
import {CodeableConcept} from "./common"

export enum CourseOfTherapyTypeCode {
  ACUTE = "acute",
  CONTINUOUS = "continuous",
  CONTINUOUS_REPEAT_DISPENSING = "continuous-repeat-dispensing"
}

export const COURSE_OF_THERAPY_TYPE_ACUTE = common.createCodeableConcept(
  "http://terminology.hl7.org/CodeSystem/medicationrequest-course-of-therapy",
  CourseOfTherapyTypeCode.ACUTE,
  "Short course (acute) therapy"
)

export const COURSE_OF_THERAPY_TYPE_CONTINUOUS = common.createCodeableConcept(
  "http://terminology.hl7.org/CodeSystem/medicationrequest-course-of-therapy",
  CourseOfTherapyTypeCode.CONTINUOUS,
  "Continuous long term therapy"
)

export const COURSE_OF_THERAPY_TYPE_CONTINUOUS_REPEAT_DISPENSING = common.createCodeableConcept(
  "https://fhir.nhs.uk/CodeSystem/medicationrequest-course-of-therapy",
  CourseOfTherapyTypeCode.CONTINUOUS_REPEAT_DISPENSING,
  "Continuous long term (repeat dispensing)"
)

export enum MedicationRequestStatus {
  ACTIVE = "active",
  CANCELLED = "cancelled",
  COMPLETED = "completed",
  STOPPED = "stopped",
  UNKNOWN = "unknown"
}

export enum MedicationRequestIntent {
  ORDER = "order",
  PLAN = "plan"
}

export interface BaseMedicationRequest extends common.Resource {
  resourceType: "MedicationRequest"
  extension: Array<extension.Extension>
  identifier: Array<common.Identifier>
  status: MedicationRequestStatus
  intent: MedicationRequestIntent
  medicationCodeableConcept?: common.CodeableConcept
  medicationReference?: common.Reference<medication.Medication>
  subject: common.Reference<patient.Patient>
  authoredOn: string
  requester: common.Reference<practitionerRole.PractitionerRole>
  groupIdentifier: MedicationRequestGroupIdentifier
  dispenseRequest?: MedicationRequestDispenseRequest
  substitution?: {
    allowedBoolean: false
  }
}

export interface MedicationRequest extends BaseMedicationRequest {
  category?: Array<common.CodeableConcept>
  courseOfTherapyType: common.CodeableConcept
  dosageInstruction: Array<Dosage>
  extension: Array<MedicationRequestPermittedExtensions>
  statusReason?: common.CodeableConcept
  dispenseRequest: MedicationRequestDispenseRequest
}

export interface MedicationRequestOutcome extends BaseMedicationRequest {
  extension: Array<extension.ReferenceExtension<practitionerRole.PractitionerRole> | PrescriptionStatusHistoryExtension>
}

//TODO - at what point do we just use Extension instead of a union type? What benefit is this providing?
export type MedicationRequestPermittedExtensions = extension.IdentifierExtension
  | extension.ReferenceExtension<practitionerRole.PractitionerRole>
  | extension.CodingExtension | extension.CodeableConceptExtension
  | RepeatInformationExtension | ControlledDrugExtension

export type RepeatInformationExtension = extension.ExtensionExtension<extension.UnsignedIntExtension
  | extension.DateTimeExtension>
export type ControlledDrugExtension = extension.ExtensionExtension<extension.StringExtension
  | extension.CodingExtension>
export type PrescriptionStatusHistoryExtension = extension.ExtensionExtension<extension.CodingExtension
  | extension.DateTimeExtension>

export interface MedicationRequestGroupIdentifier extends common.Identifier {
  extension?: Array<extension.IdentifierExtension>
}

export type Dosage = {
  sequence?: string | LosslessNumber
  text?: string
  additionalInstruction?: Array<common.CodeableConcept>
  patientInstruction?: string
  timing?: Timing
  site?: common.CodeableConcept
  route?: common.CodeableConcept
  method?: common.CodeableConcept
  doseAndRate?: DoseAndRate
  maxDosePerPeriod?: common.Ratio
  maxDosePerAdministration?: common.SimpleQuantity
  maxDosePerLifetime?: common.SimpleQuantity
} & AsNeeded

export type AsNeeded = {
  asNeededBoolean?: boolean
  asNeededCodeableConcept?: never
} | {
  asNeededBoolean?: never
  asNeededCodeableConcept?: common.CodeableConcept
}

export type Dose = {
  doseRange?: common.Range
  doseQuantity?: never
} | {
  doseRange?: never
  doseQuantity?: common.SimpleQuantity
}

export type Rate = {
  rateRatio?: common.Ratio
  rateRange?: never
  rateQuantity?: never
} | {
  rateRatio?: never
  rateRange?: common.Range
  rateQuantity?: never
} | {
  rateRatio?: never
  rateRange?: never
  rateQuantity?: common.SimpleQuantity
}

export type DoseAndRate = {
  type?: common.CodeableConcept
} & Dose & Rate

export interface Timing {
  event?: string
  repeat?: Repeat
  code?: common.CodeableConcept
}

export type Repeat = {
  count?: string | LosslessNumber
  countMax?: string | LosslessNumber
  duration?: string | LosslessNumber
  durationMax?: string | LosslessNumber
  durationUnit?: string
  frequency?: string | LosslessNumber
  frequencyMax?: string | LosslessNumber
  period?: string | LosslessNumber
  periodMax?: string | LosslessNumber
  periodUnit?: string
  dayOfWeek?: string
  timeOfDay?: string
  when?: string
  offset?: string | LosslessNumber
} & Bounds

export type Bounds = {
  boundsDuration?: common.Duration
  boundsRange?: never
  boundsPeriod?: never
} | {
  boundsDuration?: never
  boundsRange?: common.Range
  boundsPeriod?: never
} | {
  boundsDuration?: never
  boundsRange?: never
  boundsPeriod?: common.Period
}

export interface Performer extends common.IdentifierReference<practitionerRole.Organization> {
  extension?: Array<extension.ReferenceExtension<practitionerRole.PractitionerRole>>
}

export interface MedicationRequestDispenseRequest {
  extension?: Array<extension.CodingExtension
    | extension.StringExtension
    | extension.ReferenceExtension<practitionerRole.PractitionerRole>>
  identifier?: common.Identifier
  quantity?: common.SimpleQuantity
  expectedSupplyDuration?: common.SimpleQuantity
  performer?: Performer
  validityPeriod?: common.Period
  numberOfRepeatsAllowed?: string | LosslessNumber
}
