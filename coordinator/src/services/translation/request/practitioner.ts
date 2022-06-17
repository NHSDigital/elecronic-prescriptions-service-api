import {convertName, convertTelecom} from "./demographics"
import {
  getCodeableConceptCodingForSystem,
  getExtensionForUrlOrNull,
  getIdentifierValueForSystem,
  getIdentifierValueOrNullForSystem,
  identifyMessageType,
  onlyElement,
  onlyElementOrNull,
  resolveHealthcareService,
  resolveOrganization,
  resolvePractitioner,
  resolveReference
} from "../common"
import * as XmlJs from "xml-js"
import {convertOrganizationAndProviderLicense} from "./organization"
import {getProvenances} from "../common/getResourcesOfType"
import {hl7V3, fhir, processingErrors as errors} from "@models"
import moment from "moment"
import {convertIsoDateTimeStringToHl7V3DateTime, convertMomentToHl7V3DateTime} from "../common/dateTime"

export function convertAuthor(
  bundle: fhir.Bundle,
  firstMedicationRequest: fhir.MedicationRequest
): hl7V3.PrescriptionAuthor {
  const author = new hl7V3.PrescriptionAuthor()
  if (identifyMessageType(bundle) !== fhir.EventCodingCode.CANCELLATION) {
    const requesterSignature = findRequesterSignature(bundle, firstMedicationRequest.requester)
    setSignatureTimeAndText(author, requesterSignature)
  }
  const requesterPractitionerRole = resolveReference(bundle, firstMedicationRequest.requester)
  author.AgentPerson = convertPractitionerRole(bundle, requesterPractitionerRole)
  return author
}

function setSignatureTimeAndText(author: hl7V3.PrescriptionAuthor, requesterSignature?: fhir.Signature) {
  if (requesterSignature) {
    author.time = convertIsoDateTimeStringToHl7V3DateTime(requesterSignature.when, "Provenance.signature.when")
    try {
      const decodedSignatureData = Buffer.from(requesterSignature.data, "base64").toString("utf-8")
      author.signatureText = XmlJs.xml2js(decodedSignatureData, {compact: true})
    } catch (e) {
      throw new errors.InvalidValueError("Invalid signature format.", "Provenance.signature.data")
    }
  } else {
    author.time = convertMomentToHl7V3DateTime(moment.utc())
    author.signatureText = hl7V3.Null.NOT_APPLICABLE
  }
}

export function convertResponsibleParty(
  bundle: fhir.Bundle,
  medicationRequest: fhir.MedicationRequest,
  convertPractitionerRoleFn = convertPractitionerRole,
  convertAgentPersonPersonFn = convertAgentPersonPerson,
  getAgentPersonPersonIdFn = getAgentPersonPersonIdForResponsibleParty
): hl7V3.PrescriptionResponsibleParty {
  const responsibleParty = new hl7V3.PrescriptionResponsibleParty()

  const responsiblePartyExtension = getExtensionForUrlOrNull(
    medicationRequest.extension,
    "https://fhir.nhs.uk/StructureDefinition/Extension-DM-ResponsiblePractitioner",
    "MedicationRequest.extension"
  ) as fhir.ReferenceExtension<fhir.PractitionerRole>

  const responsiblePartyReference = responsiblePartyExtension
    ? responsiblePartyExtension.valueReference
    : medicationRequest.requester

  const responsiblePartyPractitionerRole = resolveReference(bundle, responsiblePartyReference)

  responsibleParty.AgentPerson = convertPractitionerRoleFn(
    bundle,
    responsiblePartyPractitionerRole,
    convertAgentPersonPersonFn,
    getAgentPersonPersonIdFn
  )

  return responsibleParty
}

function convertPractitionerRole(
  bundle: fhir.Bundle,
  practitionerRole: fhir.PractitionerRole,
  convertAgentPersonPersonFn = convertAgentPersonPerson,
  getAgentPersonPersonIdFn = getAgentPersonPersonIdForAuthor
): hl7V3.AgentPerson {
  const practitioner = resolvePractitioner(bundle, practitionerRole.practitioner)

  const agentPerson = createAgentPerson(
    practitionerRole,
    practitioner,
    convertAgentPersonPersonFn,
    getAgentPersonPersonIdFn
  )

  const organization = resolveOrganization(bundle, practitionerRole)

  let healthcareService: fhir.HealthcareService
  if (practitionerRole.healthcareService) {
    healthcareService = resolveHealthcareService(bundle, practitionerRole)
  }

  agentPerson.representedOrganization = convertOrganizationAndProviderLicense(
    bundle,
    organization,
    healthcareService
  )

  return agentPerson
}

function createAgentPerson(
  practitionerRole: fhir.PractitionerRole,
  practitioner: fhir.Practitioner,
  convertAgentPersonPersonFn = convertAgentPersonPerson,
  getAgentPersonPersonIdFn = getAgentPersonPersonIdForAuthor
): hl7V3.AgentPerson {
  const agentPerson = new hl7V3.AgentPerson()

  const sdsRoleProfileIdentifier = getIdentifierValueForSystem(
    practitionerRole.identifier,
    "https://fhir.nhs.uk/Id/sds-role-profile-id",
    "PractitionerRole.identifier"
  )
  agentPerson.id = new hl7V3.SdsRoleProfileIdentifier(sdsRoleProfileIdentifier)

  const sdsJobRoleCode = getCodeableConceptCodingForSystem(
    practitionerRole.code,
    "https://fhir.hl7.org.uk/CodeSystem/UKCore-SDSJobRoleName",
    "PractitionerRole.code"
  )
  agentPerson.code = new hl7V3.SdsJobRoleCode(sdsJobRoleCode.code)

  agentPerson.telecom = getAgentPersonTelecom(practitionerRole.telecom, practitioner.telecom)

  agentPerson.agentPerson =
    convertAgentPersonPersonFn(
      practitionerRole,
      practitioner,
      getAgentPersonPersonIdFn)

  return agentPerson
}

export function getAgentPersonTelecom(
  practitionerRoleContactPoints: Array<fhir.ContactPoint>,
  practitionerContactPoints: Array<fhir.ContactPoint>
): Array<hl7V3.Telecom> {
  if (practitionerRoleContactPoints !== undefined) {
    return practitionerRoleContactPoints.map(telecom => convertTelecom(telecom, "PractitionerRole.telecom"))
  } else if (practitionerContactPoints !== undefined) {
    return practitionerContactPoints.map(telecom => convertTelecom(telecom, "Practitioner.telecom"))
  }
}

function convertAgentPersonPerson(
  practitionerRole: fhir.PractitionerRole,
  practitioner: fhir.Practitioner,
  getAgentPersonPersonIdFn = getAgentPersonPersonIdForAuthor
) {
  const id = getAgentPersonPersonIdFn(practitioner.identifier, practitionerRole.identifier)
  const agentPersonPerson = new hl7V3.AgentPersonPerson(id)
  if (practitioner.name !== undefined) {
    agentPersonPerson.name = convertName(
      onlyElement(practitioner.name, "Practitioner.name"),
      "Practitioner.name"
    )
  }
  return agentPersonPerson
}

export function getAgentPersonPersonIdForAuthor(
  fhirPractitionerIdentifier: Array<fhir.Identifier>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fhirPractitionerRoleIdentifier: Array<fhir.Identifier> = []
): hl7V3.PrescriptionAuthorId {
  const professionalCode: Array<hl7V3.ProfessionalCode> = []

  const gmcCode = getIdentifierValueOrNullForSystem(
    fhirPractitionerIdentifier,
    "https://fhir.hl7.org.uk/Id/gmc-number",
    "Practitioner.identifier"
  )
  if (gmcCode) {
    professionalCode.push(new hl7V3.ProfessionalCode(gmcCode))
  }

  const gmpCode = getIdentifierValueOrNullForSystem(
    fhirPractitionerIdentifier,
    "https://fhir.hl7.org.uk/Id/gmp-number",
    "Practitioner.identifier"
  )
  if (gmpCode) {
    professionalCode.push(new hl7V3.ProfessionalCode(gmpCode))
  }

  const nmcCode = getIdentifierValueOrNullForSystem(
    fhirPractitionerIdentifier,
    "https://fhir.hl7.org.uk/Id/nmc-number",
    "Practitioner.identifier"
  )
  if (nmcCode) {
    professionalCode.push(new hl7V3.ProfessionalCode(nmcCode))
  }

  const gphcCode = getIdentifierValueOrNullForSystem(
    fhirPractitionerIdentifier,
    "https://fhir.hl7.org.uk/Id/gphc-number",
    "Practitioner.identifier"
  )
  if (gphcCode) {
    professionalCode.push(new hl7V3.ProfessionalCode(gphcCode))
  }

  const hcpcCode = getIdentifierValueOrNullForSystem(
    fhirPractitionerIdentifier,
    "https://fhir.hl7.org.uk/Id/hcpc-number",
    "Practitioner.identifier"
  )
  if (hcpcCode) {
    professionalCode.push(new hl7V3.ProfessionalCode(hcpcCode))
  }

  const unknownCode = getIdentifierValueOrNullForSystem(
    fhirPractitionerIdentifier,
    "https://fhir.hl7.org.uk/Id/professional-code",
    "Practitioner.identifier"
  )
  if (unknownCode) {
    professionalCode.push(new hl7V3.ProfessionalCode(unknownCode))
  }

  if (professionalCode.length === 1) {
    return professionalCode[0]
  }

  const error = "Expected exactly one professional code. One of GMC|GMP|NMC|GPhC|HCPC|unknown"
  const errorAdditionalContext = professionalCode.map(code => code._attributes.extension).join(", ")
  const errorMessage = `${error}. ${errorAdditionalContext.length > 0 ? "But got: " + errorAdditionalContext : ""}`
  const errorPath = "Practitioner.identifier"

  throw professionalCode.length > 1
    ? new errors.TooManyValuesError(errorMessage, errorPath)
    : new errors.TooFewValuesError(errorMessage, errorPath)
}

export function getAgentPersonPersonIdForResponsibleParty(
  fhirPractitionerIdentifier: Array<fhir.Identifier>,
  fhirPractitionerRoleIdentifier: Array<fhir.Identifier>
): hl7V3.PrescriptionAuthorId {
  const spuriousCode = getIdentifierValueOrNullForSystem(
    fhirPractitionerRoleIdentifier,
    "https://fhir.hl7.org.uk/Id/nhsbsa-spurious-code",
    "PractitionerRole.identifier"
  )
  if (spuriousCode) {
    return new hl7V3.PrescribingCode(spuriousCode)
  }

  const dinCode = getIdentifierValueOrNullForSystem(
    fhirPractitionerIdentifier,
    "https://fhir.hl7.org.uk/Id/din-number",
    "Practitioner.identifier"
  )
  if (dinCode) {
    return new hl7V3.PrescribingCode(dinCode)
  }

  return getAgentPersonPersonIdForAuthor(fhirPractitionerIdentifier)
}

function findRequesterSignature(
  bundle: fhir.Bundle,
  signatory: fhir.Reference<fhir.PractitionerRole>
) {
  const provenances = getProvenances(bundle)
  const requesterSignatures = provenances.flatMap(provenance => provenance.signature)
    .filter(signature => signature.who.reference === signatory.reference)
  return onlyElementOrNull(
    requesterSignatures,
    "Provenance.signature",
    `who.reference == '${signatory.reference}'`
  )
}
