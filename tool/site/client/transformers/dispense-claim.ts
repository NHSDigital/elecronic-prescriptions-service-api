import * as fhir from "../models"
import * as uuid from "uuid"
import {
  getMedicationDispenseResources,
  getMedicationRequestResources,
  getPatientResources
} from "../parsers/read/bundle-parser"
import {createUuidIdentifier} from "./common"

const INSURANCE_NHS_BSA: fhir.ClaimInsurance = {
  sequence: 1,
  focal: true,
  coverage: {
    identifier: {
      system: "https://fhir.nhs.uk/Id/ods-organization-code",
      value: "T1450"
    },
    display: "NHS BUSINESS SERVICES AUTHORITY"
  }
}

const CODEABLE_CONCEPT_CLAIM_TYPE_PHARMACY: fhir.CodeableConcept = {
  coding: [
    {
      system: "http://terminology.hl7.org/CodeSystem/claim-type",
      code: "pharmacy",
      display: "Pharmacy"
    }
  ]
}

const CODEABLE_CONCEPT_PRIORITY_NORMAL: fhir.CodeableConcept = {
  coding: [
    {
      system: "http://terminology.hl7.org/CodeSystem/processpriority",
      code: "normal"
    }
  ]
}

const CODEABLE_CONCEPT_PAYEE_TYPE_PROVIDER: fhir.CodeableConcept = {
  coding: [
    {
      system: "http://terminology.hl7.org/CodeSystem/payeetype",
      code: "provider",
      display: "Provider"
    }
  ]
}

const CODEABLE_CONCEPT_PRESCRIPTION: fhir.CodeableConcept = {
  coding: [
    {
      system: "http://snomed.info/sct",
      code: "16076005",
      display: "Prescription"
    }
  ]
}

const CODEABLE_CONCEPT_CHARGE_EXEMPTION_NONE: fhir.CodeableConcept = {
  coding: [
    {
      system: "https://fhir.nhs.uk/CodeSystem/prescription-charge-exemption",
      code: "0001",
      display: "Patient has paid appropriate charges"
    }
  ]
}

const CODEABLE_CONCEPT_PRESCRIPTION_CHARGE_PAID: fhir.CodeableConcept = {
  coding: [
    {
      system: "https://fhir.nhs.uk/CodeSystem/DM-prescription-charge",
      code: "paid-once",
      display: "Paid Once"
    }
  ]
}

const CODEABLE_CONCEPT_PRESCRIPTION_CHARGE_NOT_PAID: fhir.CodeableConcept = {
  coding: [
    {
      system: "https://fhir.nhs.uk/CodeSystem/DM-prescription-charge",
      code: "not-paid",
      display: "Not Paid"
    }
  ]
}

export function createClaim(prescriptionOrder: fhir.Bundle, dispenseNotifications: Array<fhir.Bundle>): fhir.Claim {
  const medicationRequests = getMedicationRequestResources(prescriptionOrder)
  const medicationDispenses = dispenseNotifications.map(getMedicationDispenseResources)
    .reduce((a, b) => a.concat(b), [])
  const patients = getPatientResources(prescriptionOrder)

  const patientIdentifier = patients[0].identifier[0]

  const finalMedicationDispense = medicationDispenses[medicationDispenses.length - 1]
  const prescriptionStatusExtension = finalMedicationDispense.extension.find(
    e => e.url === "https://fhir.nhs.uk/StructureDefinition/Extension-EPS-TaskBusinessStatus"
  ) as fhir.CodingExtension

  const actors = finalMedicationDispense.performer.map(performer => performer.actor)
  const claimingPractitionerReference = actors.find(actor => actor.type === "Practitioner")
  const claimingOrganizationReference = actors.find(actor => actor.type === "Organization")

  const groupIdentifierExtension = finalMedicationDispense.authorizingPrescription[0].extension.find(
    e => e.url === "https://fhir.nhs.uk/StructureDefinition/Extension-DM-GroupIdentifier"
  ) as fhir.GroupIdentifierExtension

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
    item: [createClaimItem(prescriptionStatusExtension, medicationRequests, medicationDispenses)]
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

function createClaimPayee(claimingOrganizationReference: fhir.IdentifierReference<fhir.Organization>): fhir.ClaimPayee {
  return {
    type: CODEABLE_CONCEPT_PAYEE_TYPE_PROVIDER,
    party: claimingOrganizationReference
  }
}

function createClaimPrescription(groupIdentifierExtension: fhir.GroupIdentifierExtension): fhir.ClaimPrescription {
  return {
    extension: [groupIdentifierExtension]
  }
}

function createClaimItem(
  prescriptionStatusExtension: fhir.CodingExtension,
  medicationRequests: Array<fhir.MedicationRequest>,
  medicationDispenses: Array<fhir.MedicationDispense>
): fhir.ClaimItem {
  const lineItemIds = medicationRequests.map(getMedicationRequestLineItemId)
  return {
    extension: [prescriptionStatusExtension],
    sequence: 1,
    productOrService: CODEABLE_CONCEPT_PRESCRIPTION,
    programCode: [CODEABLE_CONCEPT_CHARGE_EXEMPTION_NONE],
    detail: lineItemIds.map((lineItemId, index) => {
      const medicationRequestForLineItem = medicationRequests.find(
        medicationRequest => getMedicationRequestLineItemId(medicationRequest) === lineItemId
      )
      const medicationDispensesForLineItem = medicationDispenses.filter(
        medicationDispense => getMedicationDispenseLineItemId(medicationDispense) === lineItemId
      )
      return createClaimItemDetail(index + 1, lineItemId, medicationRequestForLineItem, medicationDispensesForLineItem)
    })
  }
}

function createClaimItemDetail(
  sequence: number,
  lineItemId: string,
  medicationRequest: fhir.MedicationRequest,
  medicationDispenses: Array<fhir.MedicationDispense>
): fhir.ClaimItemDetail {
  const finalMedicationDispense = medicationDispenses[medicationDispenses.length - 1]
  return {
    extension: [
      createClaimSequenceIdentifierExtension(),
      createMedicationRequestReferenceExtension(lineItemId)
    ],
    sequence,
    productOrService: medicationRequest.medicationCodeableConcept,
    modifier: [finalMedicationDispense.type],
    programCode: [CODEABLE_CONCEPT_CHARGE_EXEMPTION_NONE],
    quantity: medicationRequest.dispenseRequest.quantity,
    subDetail: medicationDispenses.map((medicationDispense, index) =>
      createClaimItemSubDetail(index + 1, medicationDispense)
    )
  }
}

function createClaimSequenceIdentifierExtension(): fhir.IdentifierExtension {
  return {
    url: "https://fhir.nhs.uk/StructureDefinition/Extension-ClaimSequenceIdentifier",
    valueIdentifier: {
      system: "https://fhir.nhs.uk/Id/claim-sequence-identifier",
      value: uuid.v4()
    }
  }
}

function createMedicationRequestReferenceExtension(
  lineItemId: string
): fhir.IdentifierReferenceExtension<fhir.MedicationRequest> {
  return {
    url: "https://fhir.nhs.uk/StructureDefinition/Extension-ClaimMedicationRequestReference",
    valueReference: {
      identifier: {
        system: "https://fhir.nhs.uk/Id/prescription-order-item-number",
        value: lineItemId
      }
    }
  }
}

function createClaimItemSubDetail(sequence, medicationDispense: fhir.MedicationDispense): fhir.ClaimItemSubDetail {
  return {
    sequence,
    productOrService: medicationDispense.medicationCodeableConcept,
    quantity: medicationDispense.quantity,
    programCode: [
      sequence === 1
        ? CODEABLE_CONCEPT_PRESCRIPTION_CHARGE_PAID
        : CODEABLE_CONCEPT_PRESCRIPTION_CHARGE_NOT_PAID
    ]
  }
}

function getMedicationRequestLineItemId(medicationRequest: fhir.MedicationRequest) {
  return medicationRequest.identifier[0].value
}

function getMedicationDispenseLineItemId(medicationDispense: fhir.MedicationDispense) {
  return medicationDispense.authorizingPrescription[0].identifier.value
}
