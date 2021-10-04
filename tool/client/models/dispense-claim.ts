import * as common from "./common"
import * as extension from "./extension"
import * as practitionerRole from "./practitioner-role"
import * as medicationRequest from "./medication-request"

/**
 * Details of the claim itself
 */
export interface Claim extends common.Resource {
  resourceType: "Claim"
  identifier: Array<common.Identifier>
  created: string
  prescription: ClaimPrescription
  payee: ClaimPayee
  insurance: Array<ClaimInsurance>
  item: Array<ClaimItem>
}

export interface ClaimPrescription {
  extension: Array<extension.GroupIdentifierExtension>
}

export interface ClaimPayee {
  party: common.IdentifierReference<practitionerRole.PersonOrOrganization>
}

export interface ClaimInsurance {
  coverage: common.IdentifierReference<common.Resource>
}

/**
 * Details of the prescription
 */
export interface ClaimItem extends BaseClaimItemDetail {
  extension: Array<extension.IdentifierExtension | extension.CodingExtension>
  detail: Array<ClaimItemDetail>
}

/**
 * Details of the line item
 */
export interface ClaimItemDetail extends BaseClaimItemDetail {
  extension: Array<extension.IdentifierExtension
    | extension.IdentifierReferenceExtension<medicationRequest.MedicationRequest>>
  subDetail: Array<ClaimItemSubDetail>
}

/**
 * Details of the dispense event
 */
export type ClaimItemSubDetail = BaseClaimItemDetail

interface BaseClaimItemDetail {
  sequence: number
  productOrService: common.CodeableConcept
  modifier?: Array<common.CodeableConcept>
  programCode?: Array<common.CodeableConcept>
  quantity?: common.SimpleQuantity
}
