import * as translationService from "../../src/services/translation-service"
import bundle from "../resources/fhir-bundle"
import * as fhir from "../../src/services/fhir-resources";

function clone(input: fhir.Resource | Array<fhir.Identifier>) {
    return JSON.parse(JSON.stringify(input))
}

test('getResourcesOfType returns correct resources', () => {
    const result = translationService.getResourcesOfType(bundle, "MedicationRequest")
    expect(result).toBeInstanceOf(Array)
    expect(result).toHaveLength(4)
    result.map(x => expect((x as fhir.Resource).resourceType).toBe("MedicationRequest"))
})

test('getResourceForFullUrl returns correct resources', () => {
    const result = translationService.getResourceForFullUrl(bundle, bundle.entry[0].fullUrl)
    expect((result as fhir.Resource).resourceType).toBe("MedicationRequest")
})

test('getResourceForFullUrl throws error when finding multiple resources', () => {
    const bundle2 = clone(bundle)
    bundle2.entry[1].fullUrl = bundle2.entry[0].fullUrl
    expect(() => translationService.getResourceForFullUrl(bundle2, bundle2.entry[0].fullUrl)).toThrow(TypeError)
})

test('getIdentifierValueForSystem returns correct value for system', () => {
    const firstEntryId = clone(bundle.entry[0].resource.groupIdentifier)
    const result = translationService.getIdentifierValueForSystem(firstEntryId, firstEntryId[0].system)
    expect(result).toBe(firstEntryId[0].value)
})

test('getIdentifierValueForSystem throws error when finding multiple values for system', () => {
    const firstEntryId = clone(bundle.entry[0].resource.groupIdentifier)
    firstEntryId[1].system = firstEntryId[0].system
    expect(() => translationService.getIdentifierValueForSystem(firstEntryId, firstEntryId[0].system)).toThrow()
})
