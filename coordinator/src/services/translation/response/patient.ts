import {hl7V3, fhir, processingErrors as errors} from "@models"
import {convertAddress, convertName, generateResourceId} from "./common"
import {UNKNOWN_GP_ODS_CODE} from "../common"
import {convertHL7V3DateToIsoDateString} from "../common/dateTime"

export function createPatient(patient: hl7V3.Patient): fhir.Patient {
  return {
    resourceType: "Patient",
    id: generateResourceId(),
    identifier: createNhsNumberIdentifier(patient.id._attributes.extension),
    name: convertName(patient.patientPerson.name),
    gender: convertGender(patient.patientPerson.administrativeGenderCode),
    birthDate: convertHL7V3DateToIsoDateString(patient.patientPerson.birthTime),
    address: convertAddress(patient.addr),
    generalPractitioner: createGeneralPractitioner(patient)
  }
}

function createNhsNumberIdentifier(nhsNumber: string): Array<fhir.PatientIdentifier> {
  return [
    {
      extension: [
        {
          url: "https://fhir.hl7.org.uk/StructureDefinition/Extension-UKCore-NHSNumberVerificationStatus",
          valueCodeableConcept: {
            coding: [
              {
                system: "https://fhir.hl7.org.uk/CodeSystem/UKCore-NHSNumberVerificationStatus",
                code: "number-present-and-verified",
                display: "Number present and verified"
              }
            ]
          }
        }
      ],
      system: "https://fhir.nhs.uk/Id/nhs-number",
      value: nhsNumber
    }
  ]
}

export function convertGender(hl7Gender: hl7V3.SexCode): string {
  switch (hl7Gender._attributes.code) {
    case hl7V3.SexCode.MALE._attributes.code:
      return "male"
    case hl7V3.SexCode.FEMALE._attributes.code:
      return "female"
    case hl7V3.SexCode.INDETERMINATE._attributes.code:
      return "other"
    case hl7V3.SexCode.UNKNOWN._attributes.code:
      return "unknown"
    default:
      throw new errors.InvalidValueError(`Unhandled gender '${hl7Gender}'.`)
  }
}

function createGeneralPractitioner(patient: hl7V3.Patient): Array<fhir.IdentifierReference<fhir.Organization>> {
  const patientCareProvision = patient.patientPerson.playedProviderPatient.subjectOf.patientCareProvision
  const healthCareProviderId = patientCareProvision.responsibleParty.healthCareProvider.id
  const odsCode = isNullFlavor(healthCareProviderId)
    ? UNKNOWN_GP_ODS_CODE
    : healthCareProviderId._attributes.extension
  return [{identifier: fhir.createIdentifier("https://fhir.nhs.uk/Id/ods-organization-code", odsCode)}]
}

function isNullFlavor(value: unknown): value is hl7V3.Null {
  return (value as hl7V3.Null)._attributes.nullFlavor !== undefined
}
