import * as fhir from "fhir/r4"
import {MedicationDispense, MedicationRequest, Patient} from "fhir/r4"
import * as uuid from "uuid"
import {
  ClaimMedicationRequestReferenceExtension,
  ClaimSequenceIdentifierExtension,
  getGroupIdentifierExtension,
  getRepeatInformationExtension,
  getTaskBusinessStatusExtension,
  GroupIdentifierExtension,
  TaskBusinessStatusExtension,
  URL_CLAIM_MEDICATION_REQUEST_REFERENCE,
  URL_CLAIM_SEQUENCE_IDENTIFIER
} from "../../fhir/customExtensions"
import {
  CODEABLE_CONCEPT_CLAIM_TYPE_PHARMACY,
  CODEABLE_CONCEPT_EXEMPTION_EVIDENCE_SEEN,
  CODEABLE_CONCEPT_EXEMPTION_NO_EVIDENCE_SEEN,
  CODEABLE_CONCEPT_PAYEE_TYPE_PROVIDER,
  CODEABLE_CONCEPT_PRESCRIPTION,
  CODEABLE_CONCEPT_PRESCRIPTION_CHARGE_NOT_PAID,
  CODEABLE_CONCEPT_PRESCRIPTION_CHARGE_PAID,
  CODEABLE_CONCEPT_PRIORITY_NORMAL,
  DEPRECATED_CODEABLE_CONCEPT_CHARGE_EXEMPTION_NONE
} from "./reference-data/codeableConcepts"
import {INSURANCE_NHS_BSA} from "./reference-data/insurance"
import {ClaimFormValues, ProductInfo} from "./claim"
import chargeExemptionCodings from "./reference-data/chargeExemptionCodings"
import dispenserEndorsementCodings from "./reference-data/dispenserEndorsementCodings"

export function createClaim(
  patient: Patient,
  medicationRequests: Array<MedicationRequest>,
  medicationDispenses: Array<MedicationDispense>,
  claimFormValues: ClaimFormValues
): fhir.Claim {
  const patientIdentifier = patient.identifier[0]

  const finalMedicationDispense = medicationDispenses[medicationDispenses.length - 1]
  const prescriptionStatusExtension = getTaskBusinessStatusExtension(finalMedicationDispense.extension)

  const actors = finalMedicationDispense.performer.map(performer => performer.actor)
  const claimingPractitionerReference = actors.find(actor => actor.type === "Practitioner")
  const claimingOrganizationReference = actors.find(actor => actor.type === "Organization")

  const authorizingPrescription = finalMedicationDispense.authorizingPrescription[0]
  const groupIdentifierExtension = getGroupIdentifierExtension(authorizingPrescription.extension)

  return {
    resourceType: "Claim",
    created: new Date().toISOString(),
    identifier: [createUuidIdentifier()],
    status: "active",
    type: CODEABLE_CONCEPT_CLAIM_TYPE_PHARMACY,
    use: "claim",
    patient: createClaimPatient(patientIdentifier),
    provider: claimingPractitionerReference,
    priority: CODEABLE_CONCEPT_PRIORITY_NORMAL,
    insurance: [INSURANCE_NHS_BSA],
    payee: createClaimPayee(claimingOrganizationReference),
    prescription: createClaimPrescription(groupIdentifierExtension),
    item: [
      createClaimItem(
        prescriptionStatusExtension,
        medicationRequests,
        medicationDispenses,
        claimFormValues
      )
    ]
  }
}

function createUuidIdentifier(): fhir.Identifier {
  return {
    system: "https://tools.ietf.org/html/rfc4122",
    value: uuid.v4()
  }
}

function createClaimPatient(identifier: fhir.Identifier) {
  return {
    //Doing it this way to avoid copying the verification status extension
    identifier: {
      system: identifier.system,
      value: identifier.value
    }
  }
}

function createClaimPayee(claimingOrganizationReference: fhir.Reference): fhir.ClaimPayee {
  return {
    type: CODEABLE_CONCEPT_PAYEE_TYPE_PROVIDER,
    party: claimingOrganizationReference
  }
}

function createClaimPrescription(groupIdentifierExtension: GroupIdentifierExtension): fhir.Reference {
  return {
    extension: [groupIdentifierExtension]
  }
}

function createClaimItem(
  prescriptionStatusExtension: TaskBusinessStatusExtension,
  medicationRequests: Array<fhir.MedicationRequest>,
  medicationDispenses: Array<fhir.MedicationDispense>,
  claimFormValues: ClaimFormValues
): fhir.ClaimItem {
  const lineItemIds = medicationRequests.map(getMedicationRequestLineItemId)

  const exemptionStatusCodeableConcept: fhir.CodeableConcept = {
    coding: chargeExemptionCodings.filter(coding => coding.code === claimFormValues.exemptionInfo.exemptionStatus)
  }

  return {
    extension: [prescriptionStatusExtension],
    sequence: 1,
    productOrService: CODEABLE_CONCEPT_PRESCRIPTION,
    programCode: [
      exemptionStatusCodeableConcept,
      claimFormValues.exemptionInfo.evidenceSeen
        ? CODEABLE_CONCEPT_EXEMPTION_EVIDENCE_SEEN
        : CODEABLE_CONCEPT_EXEMPTION_NO_EVIDENCE_SEEN
    ],
    detail: lineItemIds.map((lineItemId, index) => {
      const medicationRequestForLineItem = medicationRequests.find(
        medicationRequest => getMedicationRequestLineItemId(medicationRequest) === lineItemId
      )
      const medicationDispensesForLineItem = medicationDispenses.filter(
        medicationDispense => getMedicationDispenseLineItemId(medicationDispense) === lineItemId
      )
      const dispensedProductInfoForLineItem = claimFormValues.productInfo.find(product => product.id === lineItemId)
      return createClaimItemDetail(
        index + 1,
        lineItemId,
        medicationRequestForLineItem,
        medicationDispensesForLineItem,
        dispensedProductInfoForLineItem
      )
    })
  }
}

function createClaimItemDetail(
  sequence: number,
  lineItemId: string,
  medicationRequest: fhir.MedicationRequest,
  medicationDispenses: Array<fhir.MedicationDispense>,
  dispensedProductInfo: ProductInfo
): fhir.ClaimItemDetail {
  const claimItemDetailExtensions: Array<fhir.Extension> = [
    createClaimSequenceIdentifierExtension(),
    createMedicationRequestReferenceExtension(lineItemId)
  ]
  const repeatInformationExtension = getRepeatInformationExtension(medicationRequest.extension)
  if (repeatInformationExtension) {
    claimItemDetailExtensions.push(repeatInformationExtension)
  }
  const finalMedicationDispense = medicationDispenses[medicationDispenses.length - 1]
  return {
    extension: claimItemDetailExtensions,
    sequence,
    productOrService: medicationRequest.medicationCodeableConcept,
    modifier: [finalMedicationDispense.type],
    programCode: [DEPRECATED_CODEABLE_CONCEPT_CHARGE_EXEMPTION_NONE], //TODO - remove this duplicated info
    quantity: medicationRequest.dispenseRequest.quantity,
    subDetail: medicationDispenses.map((medicationDispense, index) =>
      createClaimItemDetailSubDetail(index + 1, medicationDispense, dispensedProductInfo)
    )
  }
}

function createClaimSequenceIdentifierExtension(): ClaimSequenceIdentifierExtension {
  return {
    url: URL_CLAIM_SEQUENCE_IDENTIFIER,
    valueIdentifier: {
      system: "https://fhir.nhs.uk/Id/claim-sequence-identifier",
      value: uuid.v4()
    }
  }
}

function createMedicationRequestReferenceExtension(lineItemId: string): ClaimMedicationRequestReferenceExtension {
  return {
    url: URL_CLAIM_MEDICATION_REQUEST_REFERENCE,
    valueReference: {
      identifier: {
        system: "https://fhir.nhs.uk/Id/prescription-order-item-number",
        value: lineItemId
      }
    }
  }
}

function createClaimItemDetailSubDetail(
  sequence: number,
  medicationDispense: fhir.MedicationDispense,
  dispensedProductInfo: ProductInfo
): fhir.ClaimItemDetailSubDetail {
  const endorsementCodeableConcepts: Array<fhir.CodeableConcept> = dispensedProductInfo.endorsements
    .map(endorsement => ({
      coding: dispenserEndorsementCodings.filter(coding => coding.code === endorsement.code),
      text: endorsement.supportingInfo ? endorsement.supportingInfo : undefined
    }))

  const chargePaidCodeableConcept = dispensedProductInfo.patientPaid
    ? CODEABLE_CONCEPT_PRESCRIPTION_CHARGE_PAID
    : CODEABLE_CONCEPT_PRESCRIPTION_CHARGE_NOT_PAID

  return {
    sequence,
    productOrService: medicationDispense.medicationCodeableConcept,
    quantity: medicationDispense.quantity,
    programCode: [
      ...endorsementCodeableConcepts,
      chargePaidCodeableConcept
    ]
  }
}

export function getMedicationRequestLineItemId(medicationRequest: fhir.MedicationRequest): string {
  return medicationRequest.identifier[0].value
}

export function getMedicationDispenseLineItemId(medicationDispense: fhir.MedicationDispense): string {
  return medicationDispense.authorizingPrescription[0].identifier.value
}
