import * as common from "./common"
import * as demographics from "./demographics"

export class PractitionerRole extends common.Resource {
  readonly resourceType = "PractitionerRole"
  identifier?: Array<common.Identifier>
  practitioner?: common.Reference<Practitioner>
  organization?: common.Reference<Organization>
  code?: Array<common.CodeableConcept>
  healthcareService?: Array<common.Reference<HealthcareService>>
  telecom: Array<demographics.ContactPoint>
}

export class Practitioner extends common.Resource {
  readonly resourceType = "Practitioner"
  identifier?: Array<common.Identifier>
  name?: Array<demographics.HumanName>
  telecom?: Array<demographics.ContactPoint>
  address?: Array<demographics.Address>
}

export interface Organization extends common.Resource {
  readonly resourceType: "Organization"
  identifier?: Array<common.Identifier>
  type?: Array<common.CodeableConcept>
  name?: string
  telecom?: Array<demographics.ContactPoint>
  address?: Array<demographics.Address>
  partOf?: common.Reference<Organization> | common.IdentifierReference<Organization>
}

export interface HealthcareService extends common.Resource {
  resourceType: "HealthcareService"
  identifier?: Array<common.Identifier>
  name?: string
  telecom?: Array<demographics.ContactPoint>
  active?: string
  providedBy?: { identifier: common.Identifier }
  location?: Array<common.Reference<Location>>
}

export interface Location extends common.Resource {
  resourceType: "Location"
  identifier?: Array<common.Identifier>
  status?: string
  mode?: string
  address?: demographics.Address
}
