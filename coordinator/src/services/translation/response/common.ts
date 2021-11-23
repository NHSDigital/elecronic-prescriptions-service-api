import * as uuid from "uuid"
import {getCodeableConceptCodingForSystem, toArray} from "../common"
import {fhir, hl7V3, processingErrors as errors} from "@models"
import {createPractitioner} from "./practitioner"
import {
  createHealthcareService,
  createLocations,
  createOrganization,
  getOrganizationCodeIdentifier
} from "./organization"
import {createPractitionerRole, createRefactoredPractitionerRole} from "./practitioner-role"
import {createPractitionerOrRoleIdentifier} from "./identifiers"
import {prescriptionRefactorEnabled} from "../../../utils/feature-flags"
import {odsClient} from "../../communication/ods-client"
import pino from "pino"
import {createIdentifierReference} from "../../../../../models/fhir"

export function convertName(names: Array<hl7V3.Name> | hl7V3.Name): Array<fhir.HumanName> {
  const nameArray = toArray(names)
  return nameArray.map(name => {
    const convertedName: fhir.HumanName = {}
    if (name._attributes?.use) {
      convertedName.use = convertNameUse(name._attributes.use)
    }

    if (name._text) {
      convertedName.text = name._text
      return convertedName
    }

    if (name.family) {
      convertedName.family = name.family._text
    }
    if (name.given) {
      convertedName.given = toArray(name.given).map(given => given._text)
    }
    if (name.prefix) {
      convertedName.prefix = toArray(name.prefix).map(prefix => prefix._text)
    }
    if (name.suffix) {
      convertedName.suffix = toArray(name.suffix).map(suffix => suffix._text)
    }
    return convertedName
  })
}

export function humanNameArrayToString(names: Array<fhir.HumanName>): string {
  return names.map(name => {
    if (name.text) {
      return name.text
    } else {
      return `${name.prefix || ""} ${name.given || ""} ${name.family || ""} ${name.suffix || ""}`
    }
  }).join(" ")
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
      throw new errors.InvalidValueError(`Unhandled name use '${hl7NameUse}'.`)
  }
}

export function convertAddress(addresses: Array<hl7V3.Address> | hl7V3.Address): Array<fhir.Address> {
  const addressArray = toArray(addresses)
  return addressArray.map(address => {
    const convertedAddress: fhir.Address = {}
    if (address._attributes?.use) {
      convertedAddress.use = convertAddressUse(address._attributes.use)
    }

    if (address._text) {
      convertedAddress.text = address._text
      return convertedAddress
    }

    if (address.streetAddressLine) {
      convertedAddress.line = address.streetAddressLine.map(addressLine => addressLine._text)
    }
    if (address.postalCode) {
      convertedAddress.postalCode = address.postalCode._text
    }
    return convertedAddress
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
      throw new errors.InvalidValueError(`Unhandled address use '${addressUse}'.`)
  }
}

export function convertTelecom(telecoms: Array<hl7V3.Telecom> | hl7V3.Telecom): Array<fhir.ContactPoint> {
  const telecomArray = toArray(telecoms)
  return telecomArray.map(telecom => {
    const convertedTelecom: fhir.ContactPoint = {
      system: "phone"
    }
    if (telecom._attributes?.use) {
      convertedTelecom.use = convertTelecomUse(telecom._attributes.use)
    }
    if (telecom._attributes?.value) {
      const prefixedValue = telecom._attributes.value
      const colonIndex = prefixedValue.indexOf(":")
      convertedTelecom.value = prefixedValue.substring(colonIndex + 1)
    }
    return convertedTelecom
  })
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
      throw new errors.InvalidValueError(`Unhandled telecom use '${telecomUse}'.`)
  }
}

export function generateResourceId(): string {
  return uuid.v4()
}

export function getFullUrl(uuid: string): string {
  return `urn:uuid:${uuid}`
}

export function convertResourceToBundleEntry(resource: fhir.Resource): fhir.BundleEntry {
  if (resource.id) {
    return {
      resource,
      fullUrl: getFullUrl(resource.id)
    }
  }
  return {
    resource
  }
}

export interface TranslatedAgentPerson {
  practitionerRole: fhir.PractitionerRole
  practitioner?: fhir.Practitioner
  healthcareService?: fhir.HealthcareService
  locations?: Array<fhir.Location>
  organization?: fhir.Organization
}

export function roleProfileIdIdentical(agentPerson1: hl7V3.AgentPerson, agentPerson2: hl7V3.AgentPerson): boolean {
  return agentPerson1.id._attributes.extension === agentPerson2.id._attributes.extension
}

const costCentreCodes = new Set<string>([
  "72", "80", "82", "177", "246", "247", "249", "250",
  "251", "252", "255", "256", "257", "258", "259", "260"
])

function isCostCentre(organizationRole: fhir.Coding) {
  return costCentreCodes.has(organizationRole.code)
}

export async function translateAgentPerson(
  agentPerson: hl7V3.AgentPerson,
  logger: pino.Logger
): Promise<TranslatedAgentPerson> {
  const childOrganization = agentPerson.representedOrganization
  const childOrganizationRole = await lookupRoleFromOds(childOrganization, logger)
  const childOrganizationIsHealthcareService = isCostCentre(childOrganizationRole)

  if (prescriptionRefactorEnabled()) {
    //TODO - support primary care in refactored version of the message
    const practitionerRole = createRefactoredPractitionerRole(agentPerson)
    const locations = createLocations(childOrganization)

    return {
      practitionerRole,
      locations
    }
  } else if (childOrganizationIsHealthcareService) {
    const practitioner = createPractitioner(agentPerson)
    const locations = createLocations(childOrganization)
    const healthcareService = createHealthcareService(childOrganization, locations)
    const practitionerRole = createPractitionerRole(agentPerson, practitioner.id, healthcareService.id, null)

    const translatedAgentPerson: TranslatedAgentPerson = {
      practitionerRole,
      practitioner,
      healthcareService,
      locations
    }

    const healthCareProviderLicense = childOrganization.healthCareProviderLicense
    if (healthCareProviderLicense) {
      const parentOrganization = healthCareProviderLicense.Organization
      const parentOrganizationRole = await lookupRoleFromOds(parentOrganization, logger)
      const organization = createOrganization(parentOrganization, parentOrganizationRole)
      healthcareService.providedBy = {
        identifier: organization.identifier[0],
        display: organization.name
      }
      practitionerRole.organization = fhir.createReference(organization.id)
      translatedAgentPerson.organization = organization
    }

    return translatedAgentPerson
  } else {
    const practitioner = createPractitioner(agentPerson)
    const organization = createOrganization(childOrganization, childOrganizationRole)
    const practitionerRole = createPractitionerRole(agentPerson, practitioner.id, null, organization.id)

    const translatedAgentPerson: TranslatedAgentPerson = {
      practitionerRole,
      practitioner,
      organization
    }

    const healthCareProviderLicense = childOrganization.healthCareProviderLicense
    if (healthCareProviderLicense) {
      const parentOrganization = healthCareProviderLicense.Organization
      organization.partOf = createIdentifierReference(
        getOrganizationCodeIdentifier(parentOrganization.id._attributes.extension),
        parentOrganization.name?._text
      )
    }

    return translatedAgentPerson
  }
}

async function lookupRoleFromOds(organization: hl7V3.Organization, logger: pino.Logger) {
  const organizationOdsCode = organization.id._attributes.extension
  const organizationFromOds = await odsClient.lookupOrganization(organizationOdsCode, logger)
  if (!organizationFromOds) {
    throw new Error(`Organization not found for code ${organizationOdsCode}`)
  }
  return getCodeableConceptCodingForSystem(
    organizationFromOds.type,
    "https://fhir.nhs.uk/CodeSystem/organisation-role",
    "Organization.type"
  )
}

export function addTranslatedAgentPerson(
  bundleResources: Array<fhir.Resource>,
  translatedAgentPerson: TranslatedAgentPerson
): void {
  bundleResources.push(
    translatedAgentPerson.practitionerRole,
    translatedAgentPerson.practitioner,
  )
  if (translatedAgentPerson.healthcareService) {
    bundleResources.push(
      translatedAgentPerson.healthcareService,
      ...translatedAgentPerson.locations
    )
  }
  if (translatedAgentPerson.organization) {
    bundleResources.push(translatedAgentPerson.organization)
  }
}

export function addDetailsToTranslatedAgentPerson(
  translatedAgentPerson: TranslatedAgentPerson,
  agentPerson: hl7V3.AgentPerson
): void {
  const userId = agentPerson.agentPerson.id._attributes.extension
  const identifier = createPractitionerOrRoleIdentifier(userId)
  addIdentifierToPractitionerOrRole(
    translatedAgentPerson.practitionerRole,
    translatedAgentPerson.practitioner,
    identifier
  )
}

export function addIdentifierToPractitionerOrRole(
  practitionerRole: fhir.PractitionerRole,
  practitioner: fhir.Practitioner,
  identifier: fhir.Identifier
): void {
  if (identifier.system === "https://fhir.hl7.org.uk/Id/nhsbsa-spurious-code") {
    addIdentifierIfNotPresent(practitionerRole.identifier, identifier)
  } else {
    addIdentifierIfNotPresent(practitioner.identifier, identifier)
  }
}

function addIdentifierIfNotPresent(identifiers: Array<fhir.Identifier>, identifier: fhir.Identifier) {
  if (!identifiers.find(existingIdentifier =>
    existingIdentifier.system === identifier.system
    && existingIdentifier.value === identifier.value
  )) {
    identifiers.push(identifier)
  }
}
