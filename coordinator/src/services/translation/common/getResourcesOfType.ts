import {fhir} from "@models"
import {onlyElement} from "./index"

export function getResourcesOfType<T extends fhir.Resource>(bundle: fhir.Bundle, resourceType: string): Array<T> {
  return bundle.entry
    .map(entry => entry.resource)
    .filter(resource => resource.resourceType === resourceType) as Array<T>
}

export function getMessageHeader(bundle: fhir.Bundle): fhir.MessageHeader {
  return onlyElement(
    getResourcesOfType<fhir.MessageHeader>(bundle, "MessageHeader"),
    "Bundle.entry",
    "resource.resourceType == 'MessageHeader'"
  )
}

export function getMedicationRequests(bundle: fhir.Bundle): Array<fhir.MedicationRequest> {
  return getResourcesOfType<fhir.MedicationRequest>(bundle, "MedicationRequest")
}

export function getMedicationDispenses(bundle: fhir.Bundle): Array<fhir.MedicationDispense> {
  return getResourcesOfType<fhir.MedicationDispense>(bundle, "MedicationDispense")
}

export function getClaim(bundle: fhir.Bundle): fhir.Claim {
  return onlyElement(
    getResourcesOfType<fhir.Claim>(bundle, "Claim"),
    "Bundle.entry",
    "resource.resourceType == 'Claim'"
  )
}

export function getCommunicationRequests(bundle: fhir.Bundle): Array<fhir.CommunicationRequest> {
  return getResourcesOfType<fhir.CommunicationRequest>(bundle, "CommunicationRequest")
}

export function getLists(bundle: fhir.Bundle): Array<fhir.List> {
  return getResourcesOfType<fhir.List>(bundle, "List")
}

export function getPatient(bundle: fhir.Bundle): fhir.Patient {
  return onlyElement(
    getResourcesOfType<fhir.Patient>(bundle, "Patient"),
    "Bundle.entry",
    "resource.resourceType == 'Patient'"
  )
}

export function getPatientOrNull(bundle: fhir.Bundle): fhir.Patient {
  const patients = getResourcesOfType<fhir.Patient>(bundle, "Patient")
  if (patients.length === 1) {
    return patients[0]
  }
  return null
}

export function getOrganizations(bundle: fhir.Bundle): Array<fhir.Organization> {
  return getResourcesOfType<fhir.Organization>(bundle, "Organization")
}

export function getPractitioners(bundle: fhir.Bundle): Array<fhir.Practitioner> {
  return getResourcesOfType<fhir.Practitioner>(bundle, "Practitioner")
}

export function getPractitionerRoles(bundle: fhir.Bundle): Array<fhir.PractitionerRole> {
  return getResourcesOfType<fhir.PractitionerRole>(bundle, "PractitionerRole")
}

export function getProvenances(bundle: fhir.Bundle): Array<fhir.Provenance> {
  return getResourcesOfType<fhir.Provenance>(bundle, "Provenance")
}

export function getHealthcareServices(bundle: fhir.Bundle): Array<fhir.HealthcareService> {
  return getResourcesOfType<fhir.HealthcareService>(bundle, "HealthcareService")
}

export function getLocations(bundle: fhir.Bundle): Array<fhir.Location> {
  return getResourcesOfType<fhir.Location>(bundle, "Location")
}
