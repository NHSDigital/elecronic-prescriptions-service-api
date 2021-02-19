import * as uuid from "uuid"
import {toArray} from "../common"
import {InvalidValueError} from "../../../models/errors/processing-errors"
import {createPractitioner} from "./practitioner"
import {createHealthcareService, createLocations, createOrganization} from "./organization"
import {createPractitionerRole} from "./practitioner-role"
import {createPatient} from "./patient"
import {createReference} from "./fhir-base-types"
import * as hl7V3 from "../../../models/hl7-v3"
import * as fhir from "../../../models/fhir"

export function convertName(hl7Name: Array<hl7V3.Name> | hl7V3.Name): Array<fhir.HumanName> {
  const nameArray = toArray(hl7Name)
  return nameArray.map(name => {
    if (name._text) {
      return {text: name._text}
    }
    let convertedName = {
      given: toArray(name.given).map(given => given._text),
      prefix: toArray(name.prefix).map(prefix => prefix._text)
    } as fhir.HumanName

    convertedName = name._attributes?.use
      ? {...convertedName, use: convertNameUse(name._attributes.use)}
      : convertedName

    convertedName = name.family?._text
      ? {...convertedName, family: name.family._text}
      : convertedName

    return convertedName
  })
}

function convertNameUse(hl7NameUse: string): string {
  switch (hl7NameUse) {
    case hl7V3.NameUse.USUAL:
      return "usual"
    case hl7V3.NameUse.ALIAS:
      return "temp"
    case hl7V3.NameUse.PREFERRED:
      return "nickname"
    case hl7V3.NameUse.PREVIOUS_BIRTH:
    case hl7V3.NameUse.PREVIOUS:
      return "old"
    case hl7V3.NameUse.PREVIOUS_BACHELOR:
    case hl7V3.NameUse.PREVIOUS_MAIDEN:
      return "maiden"
    default:
      throw new InvalidValueError(`Unhandled name use '${hl7NameUse}'.`)
  }
}

export function convertAddress(hl7Address: Array<hl7V3.Address> | hl7V3.Address): Array<fhir.Address> {
  const addressArray = toArray(hl7Address)
  return addressArray.map(address => {
    if (address._text) {
      return {text: address._text}
    }
    const convertedAddress = {
      line: address.streetAddressLine.map(addressLine => addressLine._text),
      postalCode: address.postalCode._text
    }
    return address._attributes?.use
      ? {...convertedAddress, use: convertAddressUse(address._attributes.use)}
      : convertedAddress
  })
}

function convertAddressUse(addressUse: hl7V3.AddressUse): string {
  switch (addressUse) {
    case hl7V3.AddressUse.HOME:
    case hl7V3.AddressUse.PRIMARY_HOME:
      return "home"
    case hl7V3.AddressUse.WORK:
    case hl7V3.AddressUse.BUSINESS:
      return "work"
    case hl7V3.AddressUse.TEMPORARY:
      return "temp"
    case hl7V3.AddressUse.POSTAL:
      return "billing"
    case undefined:
      return undefined
    default:
      throw new InvalidValueError(`Unhandled address use '${addressUse}'.`)
  }
}

export function convertTelecom(telecom: Array<hl7V3.Telecom> | hl7V3.Telecom): Array<fhir.ContactPoint> {
  const telecomArray = toArray(telecom)
  return telecomArray.map(value => ({
    system: "phone",
    value: value._attributes.value.split(":")[1],
    use: convertTelecomUse(value._attributes.use)
  }))
}

function convertTelecomUse(telecomUse: string): string {
  switch (telecomUse) {
    case hl7V3.TelecomUse.PERMANENT_HOME:
    case hl7V3.TelecomUse.HOME:
      return "home"
    case hl7V3.TelecomUse.WORKPLACE:
      return "work"
    case hl7V3.TelecomUse.TEMPORARY:
      return "temp"
    case hl7V3.TelecomUse.MOBILE:
    case hl7V3.TelecomUse.PAGER:
      return "mobile"
      //TODO these are possible values, but we don'e know what to map them to
      // case core.TelecomUse.ANSWERING_MACHINE:
      // case core.TelecomUse.EMERGENCY_CONTACT:
      //   return "home+rank"
    default:
      throw new InvalidValueError(`Unhandled telecom use '${telecomUse}'.`)
  }
}

export function generateResourceId(): string {
  return uuid.v4()
}

export function getFullUrl(uuid: string):string {
  return `urn:uuid:${uuid}`
}

export function convertResourceToBundleEntry(resource: fhir.Resource): fhir.BundleEntry {
  return {
    resource,
    fullUrl: getFullUrl(resource.id)
  }
}

export function translateAndAddPatient(hl7Patient: hl7V3.Patient, resources: Array<fhir.Resource>): string {
  const fhirPatient = createPatient(hl7Patient)
  resources.push(fhirPatient)
  return fhirPatient.id
}

export function translateAndAddAgentPerson(hl7AgentPerson: hl7V3.AgentPerson, resources: Array<fhir.Resource>): string {
  const fhirPractitioner = createPractitioner(hl7AgentPerson)
  const fhirLocations = createLocations(hl7AgentPerson.representedOrganization)
  const fhirHealthcareService = createHealthcareService(hl7AgentPerson.representedOrganization, fhirLocations)
  const fhirPractitionerRole = createPractitionerRole(hl7AgentPerson, fhirPractitioner.id, fhirHealthcareService.id)
  resources.push(fhirPractitioner, ...fhirLocations, fhirHealthcareService, fhirPractitionerRole)

  const healthCareProviderLicense = hl7AgentPerson.representedOrganization.healthCareProviderLicense
  if (healthCareProviderLicense) {
    const fhirOrganization = createOrganization(healthCareProviderLicense.Organization)
    fhirPractitionerRole.organization = createReference(fhirOrganization.id)
    resources.push(fhirOrganization)
  }

  return fhirPractitionerRole.id
}
