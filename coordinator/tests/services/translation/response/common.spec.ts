import {
  addIdentifierToPractitionerOrRole,
  convertAddress,
  convertName,
  convertTelecom,
  generateResourceId,
  getFullUrl,
  translateAgentPerson
} from "../../../../src/services/translation/response/common"
import {fhir, hl7V3} from "@models"
import {getMedicationRequests} from "../../../../src/services/translation/common/getResourcesOfType"
import {getExtensionForUrl, resolveReference} from "../../../../src/services/translation/common"
import {clone} from "../../../resources/test-helpers"
import * as testData from "../../../resources/test-data/hl7V3"

describe("convertName", () => {
  test("converts unstructured name", () => {
    const result = convertName({
      _attributes: {use: hl7V3.NameUse.USUAL},
      _text: "Dr Jane Smith"
    })
    expect(result).toMatchObject([{
      use: "usual",
      text: "Dr Jane Smith"
    }])
  })

  test("converts structured name with multiple given, prefix, suffix", () => {
    const result = convertName({
      _attributes: {use: hl7V3.NameUse.USUAL},
      family: {_text: "Smith"},
      given: [{_text: "Jane"}, {_text: "Michael"}],
      prefix: [{_text: "Prof"}, {_text: "Dr"}],
      suffix: [{_text: "III"}, {_text: "Esq"}]
    })
    expect(result).toMatchObject([{
      use: "usual",
      family: "Smith",
      given: ["Jane", "Michael"],
      prefix: ["Prof", "Dr"],
      suffix: ["III", "Esq"]
    }])
  })

  test("converts structured name with single given, prefix, suffix", () => {
    const result = convertName({
      _attributes: {use: hl7V3.NameUse.ALIAS},
      family: {_text: "Wilson"},
      given: [{_text: "Bob"}],
      prefix: [{_text: "Father"}],
      suffix: [{_text: "Sr"}]
    })
    expect(result).toMatchObject([{
      use: "temp",
      family: "Wilson",
      given: ["Bob"],
      prefix: ["Father"],
      suffix: ["Sr"]
    }])
  })

  test("converts multiple names", () => {
    const result = convertName([
      {
        _attributes: {use: hl7V3.NameUse.USUAL},
        family: {_text: "Smith"},
        given: [{_text: "Jane"}, {_text: "Michael"}],
        prefix: [{_text: "Prof"}, {_text: "Dr"}],
        suffix: [{_text: "III"}, {_text: "Esq"}]
      },
      {
        _attributes: {use: hl7V3.NameUse.ALIAS},
        family: {_text: "Wilson"},
        given: [{_text: "Bob"}],
        prefix: [{_text: "Father"}],
        suffix: [{_text: "Sr"}]
      }
    ])
    expect(result).toMatchObject([
      {
        use: "usual",
        family: "Smith",
        given: ["Jane", "Michael"],
        prefix: ["Prof", "Dr"],
        suffix: ["III", "Esq"]
      },
      {
        use: "temp",
        family: "Wilson",
        given: ["Bob"],
        prefix: ["Father"],
        suffix: ["Sr"]
      }
    ])
  })

  const unstructuredNameAllFields = {
    _attributes: {use: hl7V3.NameUse.USUAL},
    _text: "Dr Jane Smith"
  }
  test.each(Object.keys(unstructuredNameAllFields))(
    "handles unstructured name without %s key",
    (key: keyof typeof unstructuredNameAllFields) => {
      const nameShallowCopy = {...unstructuredNameAllFields}
      delete nameShallowCopy[key]
      expect(() => convertName(nameShallowCopy)).not.toThrow()
    }
  )

  const structuredNameAllFields = {
    _attributes: {use: hl7V3.NameUse.USUAL},
    family: {_text: "Smith"},
    given: [{_text: "Jane"}, {_text: "Michael"}],
    prefix: [{_text: "Prof"}, {_text: "Dr"}],
    suffix: [{_text: "III"}, {_text: "Esq"}]
  }
  test.each(Object.keys(structuredNameAllFields))(
    "handles structured name without %s key",
    (key: keyof typeof structuredNameAllFields) => {
      const nameShallowCopy = {...structuredNameAllFields}
      delete nameShallowCopy[key]
      expect(() => convertName(nameShallowCopy)).not.toThrow()
    }
  )
})

describe("convertAddress", () => {
  test("converts unstructured address", () => {
    const result = convertAddress({
      _attributes: {use: hl7V3.AddressUse.HOME},
      _text: "1 Abbey Rd, Kirkstall, Leeds, LS5 3EH"
    })
    expect(result).toMatchObject([{
      use: "home",
      text: "1 Abbey Rd, Kirkstall, Leeds, LS5 3EH"
    }])
  })

  test("converts single address with multiple streetAddressLine", () => {
    const result = convertAddress({
      _attributes: {use: hl7V3.AddressUse.HOME},
      streetAddressLine: [{_text: "1 Abbey Rd"}, {_text: "Kirkstall"}, {_text: "Leeds"}],
      postalCode: {_text: "LS5 3EH"}
    })
    expect(result).toMatchObject([{
      use: "home",
      line: ["1 Abbey Rd", "Kirkstall", "Leeds"],
      postalCode: "LS5 3EH"
    }])
  })

  test("converts single address with single streetAddressLine", () => {
    const result = convertAddress({
      _attributes: {use: hl7V3.AddressUse.WORK},
      streetAddressLine: [{_text: "141 Beckett St"}],
      postalCode: {_text: "LS9 7LN"}
    })
    expect(result).toMatchObject([{
      use: "work",
      line: ["141 Beckett St"],
      postalCode: "LS9 7LN"
    }])
  })

  test("converts multiple addresses", () => {
    const result = convertAddress([
      {
        _attributes: {use: hl7V3.AddressUse.HOME},
        streetAddressLine: [{_text: "1 Abbey Rd"}, {_text: "Kirkstall"}, {_text: "Leeds"}],
        postalCode: {_text: "LS5 3EH"}
      },
      {
        _attributes: {use: hl7V3.AddressUse.WORK},
        streetAddressLine: [{_text: "141 Beckett St"}],
        postalCode: {_text: "LS9 7LN"}
      }
    ])
    expect(result).toMatchObject([
      {
        use: "home",
        line: ["1 Abbey Rd", "Kirkstall", "Leeds"],
        postalCode: "LS5 3EH"
      },
      {
        use: "work",
        line: ["141 Beckett St"],
        postalCode: "LS9 7LN"
      }
    ])
  })

  const unstructuredAddressAllFields = {
    _attributes: {use: hl7V3.AddressUse.HOME},
    _text: "1 Abbey Rd, Kirkstall, Leeds, LS5 3EH"
  }
  test.each(Object.keys(unstructuredAddressAllFields))(
    "handles unstructured address without %s key",
    (key: keyof typeof unstructuredAddressAllFields) => {
      const addressShallowCopy = {...unstructuredAddressAllFields}
      delete addressShallowCopy[key]
      expect(() => convertAddress(addressShallowCopy)).not.toThrow()
    }
  )

  const structuredAddressAllFields = {
    _attributes: {use: hl7V3.AddressUse.HOME},
    streetAddressLine: [{_text: "1 Abbey Rd"}, {_text: "Kirkstall"}, {_text: "Leeds"}],
    postalCode: {_text: "LS5 3EH"}
  }
  test.each(Object.keys(structuredAddressAllFields))(
    "handles structured address without %s key",
    (key: keyof typeof structuredAddressAllFields) => {
      const addressShallowCopy = {...structuredAddressAllFields}
      delete addressShallowCopy[key]
      expect(() => convertAddress(addressShallowCopy)).not.toThrow()
    }
  )
})

describe("convertTelecom", () => {
  test("converts single telecom with single colon", () => {
    const result = convertTelecom({
      _attributes: {
        use: hl7V3.TelecomUse.HOME,
        value: "tel:123412341234"
      }
    })
    expect(result).toMatchObject([{
      use: "home",
      value: "123412341234"
    }])
  })

  test("converts single telecom with multiple colons", () => {
    const result = convertTelecom({
      _attributes: {
        use: hl7V3.TelecomUse.HOME,
        value: "tel:123412341234:1"
      }
    })
    expect(result).toMatchObject([{
      use: "home",
      value: "123412341234:1"
    }])
  })

  test("converts single telecom without colon", () => {
    const result = convertTelecom({
      _attributes: {
        use: hl7V3.TelecomUse.HOME,
        value: "123412341234"
      }
    })
    expect(result).toMatchObject([{
      use: "home",
      value: "123412341234"
    }])
  })

  const telecomAllFields = {
    _attributes: {
      use: hl7V3.TelecomUse.HOME,
      value: "123412341234"
    }
  }
  test.each(Object.keys(telecomAllFields._attributes))(
    "handles telecom without %s attribute",
    (attributeKey: keyof typeof telecomAllFields._attributes) => {
      const attributesShallowCopy = {...telecomAllFields._attributes}
      delete attributesShallowCopy[attributeKey]
      expect(() => convertTelecom({_attributes: attributesShallowCopy}))
    }
  )
})

describe("convertNameUse", () => {
  test("doesn't display a use key if no use passed in", () => {
    const actual = convertName({
      _attributes: {},
      prefix: [{_text: "prefix"}],
      given: {_text: "given"},
      family: {_text: "last"}
    })
    expect(actual).toEqual([{"family": "last", "given": ["given"], "prefix": ["prefix"]}])
  })
})

describe("resourceId", () => {
  const UUID_REGEX = /[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}/
  test("generate", () => {
    const resourceId = generateResourceId()
    expect(UUID_REGEX.test(resourceId)).toBeTruthy()
  })

  test("getFullUrl", () => {
    const resourceId = generateResourceId()
    const fullUrl = getFullUrl(resourceId)
    expect(fullUrl).toBe(`urn:uuid:${resourceId}`)
  })
})

describe("addIdentifierToPractitionerOrRole", () => {
  let practitionerRole: fhir.PractitionerRole
  let practitioner: fhir.Practitioner
  beforeEach(() => {
    practitionerRole = {
      resourceType: "PractitionerRole",
      identifier: [],
      telecom: [{
        system: "phone",
        value: "0800123456"
      }]
    }
    practitioner = {
      resourceType: "Practitioner",
      identifier: []
    }
  })

  test("adds spurious code identifier to PractitionerRole", () => {
    const spuriousCodeIdentifier = {
      system: "https://fhir.hl7.org.uk/Id/nhsbsa-spurious-code",
      value: "6123456"
    }
    addIdentifierToPractitionerOrRole(practitionerRole, practitioner, spuriousCodeIdentifier)
    expect(practitionerRole.identifier).toMatchObject([spuriousCodeIdentifier])
    expect(practitioner.identifier).toMatchObject([])
  })

  test("does not add duplicate identifier to PractitionerRole", () => {
    const spuriousCodeIdentifier = {
      system: "https://fhir.hl7.org.uk/Id/nhsbsa-spurious-code",
      value: "6123456"
    }
    practitionerRole.identifier.push(clone(spuriousCodeIdentifier))
    addIdentifierToPractitionerOrRole(practitionerRole, practitioner, spuriousCodeIdentifier)
    expect(practitionerRole.identifier).toMatchObject([spuriousCodeIdentifier])
  })

  test("adds GMP number identifier to Practitioner", () => {
    const gmpNumberIdentifier = {
      system: "https://fhir.hl7.org.uk/Id/gmp-number",
      value: "G1234567"
    }
    addIdentifierToPractitionerOrRole(practitionerRole, practitioner, gmpNumberIdentifier)
    expect(practitionerRole.identifier).toMatchObject([])
    expect(practitioner.identifier).toMatchObject([gmpNumberIdentifier])
  })

  test("does not add duplicate identifier to Practitioner", () => {
    const gmpNumberIdentifier = {
      system: "https://fhir.hl7.org.uk/Id/gmp-number",
      value: "G1234567"
    }
    practitioner.identifier.push(clone(gmpNumberIdentifier))
    addIdentifierToPractitionerOrRole(practitionerRole, practitioner, gmpNumberIdentifier)
    expect(practitioner.identifier).toMatchObject([gmpNumberIdentifier])
  })
})

describe("translateAgentPerson", () => {
  test("Prescription is Primary Care, PrescriptionType starts with 01", () => {
    const translatedAgentPerson = translateAgentPerson(testData.agentPerson, "0101")
    expect(translatedAgentPerson.healthcareService).toBeNull()
    expect(translatedAgentPerson.organization.partOf).toBeTruthy()

  })

  test("Prescription is Secondary Care, PrescriptionType starts with 1", () => {
    const translatedAgentPerson = translateAgentPerson(testData.agentPerson, "1010")
    expect(translatedAgentPerson.healthcareService).toBeTruthy()
    expect(translatedAgentPerson.organization.partOf).toBeUndefined()

  })

  test("Prescription is cancelled, PrescriptionType is empty", () => {
    const translatedAgentPerson = translateAgentPerson(testData.agentPerson)
    expect(translatedAgentPerson.healthcareService).toBeTruthy()
    expect(translatedAgentPerson.organization.partOf).toBeUndefined()

  })
})

export function getRequester(bundle: fhir.Bundle): fhir.PractitionerRole {
  const medicationRequests = getMedicationRequests(bundle)
  const medicationRequest = medicationRequests[0]
  const requesterReference = medicationRequest.requester
  return resolveReference(bundle, requesterReference)
}

export function getResponsiblePractitioner(bundle: fhir.Bundle): fhir.PractitionerRole {
  const medicationRequests = getMedicationRequests(bundle)
  const medicationRequest = medicationRequests[0]
  const responsiblePractitionerExtension = getExtensionForUrl(
    medicationRequest.extension,
    "https://fhir.nhs.uk/StructureDefinition/Extension-DM-ResponsiblePractitioner",
    "MedicationRequest.extension"
  ) as fhir.ReferenceExtension<fhir.PractitionerRole>
  const responsiblePractitionerReference = responsiblePractitionerExtension.valueReference
  return resolveReference(bundle, responsiblePractitionerReference)
}

export function getPerformer(bundle: fhir.Bundle): fhir.PractitionerRole {
  const medicationRequests = getMedicationRequests(bundle)
  const medicationRequest = medicationRequests[0]
  const dispensingPerformerExtension = getExtensionForUrl(
    medicationRequest.dispenseRequest.performer.extension,
    "https://fhir.nhs.uk/StructureDefinition/Extension-DM-DispensingPerformer",
    "MedicationRequest.dispenseRequest.performer.extension"
  ) as fhir.ReferenceExtension<fhir.PractitionerRole>
  const performerReference = dispensingPerformerExtension.valueReference
  return resolveReference(bundle, performerReference)
}
