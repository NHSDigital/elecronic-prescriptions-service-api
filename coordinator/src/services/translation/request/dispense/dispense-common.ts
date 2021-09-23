import {fhir, hl7V3} from "@models"

export function createAgentOrganisationFromReference(
  reference: fhir.IdentifierReference<fhir.PersonOrOrganization>
): hl7V3.AgentOrganization {
  const organisationCode = reference.identifier.value
  const organisationName = reference.display
  const hl7Organisation = createOrganisation(organisationCode, organisationName)
  return new hl7V3.AgentOrganization(hl7Organisation)
}

export function createOrganisation(organisationCode: string, organisationName: string): hl7V3.Organization {
  const organisation = new hl7V3.Organization()
  organisation.id = new hl7V3.SdsOrganizationIdentifier(organisationCode)
  organisation.code = new hl7V3.OrganizationTypeCode()
  organisation.name = new hl7V3.Text(organisationName)
  return organisation
}

export function createPriorPrescriptionReleaseEventRef(
  fhirHeader: fhir.MessageHeader
): hl7V3.PriorPrescriptionReleaseEventRef {
  return new hl7V3.PriorPrescriptionReleaseEventRef(
    new hl7V3.GlobalIdentifier(fhirHeader.response.identifier)
  )
}

