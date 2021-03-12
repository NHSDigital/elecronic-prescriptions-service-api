import * as common from "./common"
import * as bundle from "./bundle"
import * as practitionerRole from "./practitioner-role"

export class Task extends common.Resource {
  readonly resourceType = "Task"
  identifier: Array<common.Identifier>
  groupIdentifier: common.Identifier
  status: string
  intent: string
  focus: common.IdentifierReference<bundle.Bundle>
  for: common.Reference<common.Resource>
  authoredOn: string
  owner: common.IdentifierReference<practitionerRole.PractitionerRole | practitionerRole.Practitioner
    | practitionerRole.Organization>
  reasonCode: common.CodeableConcept
  code?: common.CodeableConcept
}
