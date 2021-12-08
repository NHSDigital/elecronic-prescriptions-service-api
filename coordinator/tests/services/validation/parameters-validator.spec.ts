import {fhir, validationErrors as errors} from "@models"
import {verifyParameters} from "../../../src/services/validation/parameters-validator"
import {
  DISPENSING_APP_SCOPE,
  DISPENSING_USER_SCOPE,
  PRESCRIBING_APP_SCOPE,
  PRESCRIBING_USER_SCOPE
} from "../../../src/services/validation/scope-validator"

jest.spyOn(global.console, "warn").mockImplementation(() => null)

describe("verifyParameters returns errors", () => {
  const ownerParameter: fhir.IdentifierParameter = {
    name: "owner",
    valueIdentifier: {
      system: "https://fhir.nhs.uk/Id/ods-organization-code",
      value: "D7K8P"
    }
  }
  const groupIdentifierParameter: fhir.IdentifierParameter = {
    name: "group-identifier",
    valueIdentifier: {
      system: "https://fhir.nhs.uk/Id/prescription-order-number",
      value: "E99F18-A99968-BDE8EH"
    }
  }
  const validNominatedParameters: fhir.Parameters = {
    resourceType: "Parameters",
    parameter: [
      ownerParameter
    ]
  }
  const validSinglePrescriptionParameters: fhir.Parameters = {
    resourceType: "Parameters",
    parameter: [
      ownerParameter,
      groupIdentifierParameter
    ]
  }

  afterEach(() => {
    process.env.DISPENSE_ENABLED = "true"
  })

  test('rejects when resourceType not "Parameters"', () => {
    const invalidParameters = {...validSinglePrescriptionParameters, resourceType: "bluh"}
    const returnedErrors = verifyParameters(invalidParameters as fhir.Parameters, DISPENSING_APP_SCOPE, "test_ods_code")
    expect(returnedErrors).toEqual([errors.createResourceTypeIssue("Parameters")])
  })

  test("verifyParameters rejects a message when dispensing is disabled", () => {
    process.env.DISPENSE_ENABLED = "false"
    const result = verifyParameters(validSinglePrescriptionParameters, DISPENSING_APP_SCOPE, "test_ods_code")
    expect(result).toEqual([errors.createDisabledFeatureIssue("Dispensing")])
  })

  test("rejects single prescription release when only prescribing user scope present", () => {
    const result = verifyParameters(validSinglePrescriptionParameters, PRESCRIBING_USER_SCOPE, "test_ods_code")
    expect(result).toEqual([errors.createMissingScopeIssue("Dispensing")])
  })

  test("rejects single prescription release when only prescribing app scope present", () => {
    const result = verifyParameters(validSinglePrescriptionParameters, PRESCRIBING_APP_SCOPE, "test_ods_code")
    expect(result).toEqual([errors.createMissingScopeIssue("Dispensing")])
  })

  test("accepts single prescription release when only dispensing user scope present", () => {
    const result = verifyParameters(validSinglePrescriptionParameters, DISPENSING_USER_SCOPE, "test_ods_code")
    expect(result).toEqual([])
  })

  test("rejects single prescription release when only dispensing app scope present", () => {
    const result = verifyParameters(validSinglePrescriptionParameters, DISPENSING_APP_SCOPE, "test_ods_code")
    expect(result).toEqual([errors.createUserRestrictedOnlyScopeIssue("Dispensing")])
  })

  test("console warn when inconsistent accessToken and body ods codes", () => {
    verifyParameters(validSinglePrescriptionParameters, DISPENSING_APP_SCOPE, "test_ods_code")
    expect(console.warn).toHaveBeenCalled()
  })

  test("rejects nominated release when only prescribing user scope present", () => {
    const result = verifyParameters(validNominatedParameters, PRESCRIBING_USER_SCOPE, "test_ods_code")
    expect(result).toEqual([errors.createMissingScopeIssue("Dispensing")])
  })

  test("rejects nominated release when only prescribing app scope present", () => {
    const result = verifyParameters(validNominatedParameters, PRESCRIBING_APP_SCOPE, "test_ods_code")
    expect(result).toEqual([errors.createMissingScopeIssue("Dispensing")])
  })

  test("accepts nominated release when only dispensing user scope present", () => {
    const result = verifyParameters(validNominatedParameters, DISPENSING_USER_SCOPE, "test_ods_code")
    expect(result).toEqual([])
  })

  test("accepts nominated release when only dispensing app scope present", () => {
    const result = verifyParameters(validNominatedParameters, DISPENSING_APP_SCOPE, "test_ods_code")
    expect(result).toEqual([])
  })
})
