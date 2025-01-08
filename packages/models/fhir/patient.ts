import * as demographics from "./demographics"
import * as practitionerRole from "./practitioner-role"
import * as common from "./common"

const GP_PRACTICE_CODE_NOT_KNOWN = "V81999"

function unknownGPPractice(): common.IdentifierReference<practitionerRole.Organization> {
  return {
    identifier: {
      system: "https://fhir.nhs.uk/Id/ods-organization-code",
      value: GP_PRACTICE_CODE_NOT_KNOWN
    }
  }
}

export class Patient extends common.Resource {
  readonly resourceType = "Patient"
  identifier?: Array<PatientIdentifier>
  name?: Array<demographics.HumanName>
  telecom?: Array<demographics.ContactPoint>
  gender?: string
  birthDate?: string
  address?: Array<demographics.Address>
  generalPractitioner?: Array<common.IdentifierReference<practitionerRole.Organization>>

  constructor(data?: Partial<Patient>) {
    super()
    // Default behaviour
    Object.assign(this, data)

    // If generalPractitioner is undefined or empty, default to unknownGPPractice().
    if (!this.generalPractitioner || this.generalPractitioner.length === 0) {
      this.generalPractitioner = [unknownGPPractice()]
    }
  }
}

export type PatientIdentifier = common.Identifier
