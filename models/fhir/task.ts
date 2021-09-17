import * as common from "./common"
import * as bundle from "./bundle"
import * as patient from "./patient"
import * as practitionerRole from "./practitioner-role"
import * as medicationRequest from "./medication-request"
import * as medicationDispense from "./medication-dispense"
import * as extension from "./extension"

export class Task extends common.Resource {
  readonly resourceType = "Task"
  extension?: Array<extension.PrescriptionExtension | extension.RepeatInformationExtension>
  identifier: Array<common.Identifier>
  groupIdentifier?: common.Identifier
  status: TaskStatus
  intent: TaskIntent
  focus: common.IdentifierReference<bundle.Bundle>
  for: common.IdentifierReference<patient.Patient>
  authoredOn: string
  requester?: common.IdentifierReference<practitionerRole.PersonOrOrganization>
  owner: common.IdentifierReference<practitionerRole.PersonOrOrganization>
  reasonCode?: common.CodeableConcept
  code?: common.CodeableConcept
  businessStatus?: common.CodeableConcept
  input?: Array<TaskInput>
  output?: Array<TaskOutput>
}

export interface TaskInput {
  extension?: Array<extension.DispensingInformationExtension>
  type: common.CodeableConcept
  valueReference: common.IdentifierReference<medicationRequest.MedicationRequest>
}

export interface TaskOutput {
  extension?: Array<extension.DispensingReleaseInformationExtension>
  type: common.CodeableConcept
  valueReference: common.IdentifierReference<medicationDispense.MedicationDispense>
}

export enum TaskStatus {
  IN_PROGRESS = "in-progress",
  REJECTED = "rejected"
}

export enum TaskIntent {
  ORDER = "order"
}
