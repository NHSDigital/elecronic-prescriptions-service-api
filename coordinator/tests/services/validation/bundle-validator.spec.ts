import * as validator from "../../../src/services/validation/bundle-validator"
import * as TestResources from "../../resources/test-resources"
import {clone} from "../../resources/test-helpers"
import {getMedicationRequests, getPractitionerRoles} from "../../../src/services/translation/common/getResourcesOfType"
import {getExtensionForUrl, isTruthy} from "../../../src/services/translation/common"
import {fhir, validationErrors as errors} from "@models"
import {
  DISPENSING_APP_SCOPE,
  DISPENSING_USER_SCOPE,
  PRESCRIBING_APP_SCOPE,
  PRESCRIBING_USER_SCOPE
} from "../../../src/services/validation/prescribing-dispensing-tracker"
import {
  getOrganisationPerformer,
  getPrescriptionStatus
} from "../../../src/services/translation/request/dispense/dispense-notification"

function validateValidationErrors (validationErrors: Array<fhir.OperationOutcomeIssue>) {
  expect(validationErrors).toHaveLength(1)
  const validationError = validationErrors[0]
  expect(validationError.code).toEqual(fhir.IssueCodes.VALUE)
  expect(validationError.severity).toEqual("error")
}

describe("Bundle checks", () => {

  afterEach(() => {
    process.env.PRESCRIBE_ENABLED = "true"
    process.env.DISPENSE_ENABLED = "true"
  })

  test("rejects bundle with unsupported message type", () => {
    const messageHeader: fhir.MessageHeader = {
      resourceType: "MessageHeader",
      eventCoding: {
        system: undefined,
        code: "garbage-message-type" as fhir.EventCodingCode
      },
      focus: undefined, sender: undefined, source: undefined
    }
    const bundle: fhir.Bundle = {
      resourceType: "Bundle",
      id: "test-bundle",
      entry: [
        {
          resource: messageHeader
        }
      ]
    }
    const result = validator.verifyBundle(bundle as fhir.Bundle, PRESCRIBING_USER_SCOPE)
    expect(result).toContainEqual(errors.messageTypeIssue)
  })

  test("verifyBundle rejects a prescribe message when prescribe is disabled", () => {
    process.env.PRESCRIBE_ENABLED = "false"
    const result = validator.verifyBundle(
      TestResources.examplePrescription1.fhirMessageUnsigned,
      PRESCRIBING_USER_SCOPE
    )
    expect(result).toEqual([errors.createDisabledFeatureIssue("Prescribing")])
  })

  test("verifyBundle rejects a dispense message when dispensing is disabled", () => {
    process.env.DISPENSE_ENABLED = "false"
    const result = validator.verifyBundle(TestResources.examplePrescription3.fhirMessageDispense, DISPENSING_USER_SCOPE)
    expect(result).toEqual([errors.createDisabledFeatureIssue("Dispensing")])
  })

  test("verifyBundle accepts a dispense message when prescribe is disabled", () => {
    process.env.PRESCRIBE_ENABLED = "false"
    const result = validator.verifyBundle(TestResources.examplePrescription3.fhirMessageDispense, DISPENSING_USER_SCOPE)
    expect(result).toEqual([])
  })

  test("verifyBundle accepts a dispense message when dispense is disabled", () => {
    process.env.DISPENSE_ENABLED = "false"
    const result = validator.verifyBundle(
      TestResources.examplePrescription1.fhirMessageUnsigned,
      PRESCRIBING_USER_SCOPE
    )
    expect(result).toEqual([])
  })

  test("verifyBundle accepts a prescribe message when only prescribing user scope present", () => {
    const result = validator.verifyBundle(
      TestResources.examplePrescription1.fhirMessageUnsigned,
      PRESCRIBING_USER_SCOPE
    )
    expect(result).toEqual([])
  })

  test("verifyBundle rejects a prescribe message when only prescribing app scope present", () => {
    const result = validator.verifyBundle(TestResources.examplePrescription1.fhirMessageUnsigned, PRESCRIBING_APP_SCOPE)
    expect(result).toEqual([errors.createUserRestrictedOnlyScopeIssue("Prescribing")])
  })

  test("verifyBundle rejects a prescribe message when only dispensing user scope present", () => {
    const result = validator.verifyBundle(TestResources.examplePrescription1.fhirMessageUnsigned, DISPENSING_USER_SCOPE)
    expect(result).toEqual([errors.createMissingScopeIssue("Prescribing")])
  })

  test("verifyBundle accepts a dispense message when only dispensing user scope present", () => {
    const result = validator.verifyBundle(TestResources.examplePrescription3.fhirMessageDispense, DISPENSING_USER_SCOPE)
    expect(result).toEqual([])
  })

  test("verifyBundle accepts a dispense message when only dispensing app scope present", () => {
    const result = validator.verifyBundle(TestResources.examplePrescription3.fhirMessageDispense, DISPENSING_APP_SCOPE)
    expect(result).toEqual([])
  })

  test("verifyBundle rejects a dispense message when only prescribing user scope present", () => {
    const result = validator.verifyBundle(
      TestResources.examplePrescription3.fhirMessageDispense,
      PRESCRIBING_USER_SCOPE
    )
    expect(result).toEqual([errors.createMissingScopeIssue("Dispensing")])
  })

  test("verifyBundle accepts a message when multiple scopes are present, one of which is valid", () => {
    const result = validator.verifyBundle(
      TestResources.examplePrescription1.fhirMessageUnsigned,
      `fake-testing-scope ${PRESCRIBING_APP_SCOPE} ${PRESCRIBING_USER_SCOPE}`
    )
    expect(result).toEqual([])
  })
})

describe("verifyCommonBundle", () => {
  let bundle: fhir.Bundle
  let medicationRequests: Array<fhir.MedicationRequest>
  let practitionerRoles: Array<fhir.PractitionerRole>

  beforeEach(() => {
    bundle = clone(TestResources.examplePrescription1.fhirMessageUnsigned)
    medicationRequests = getMedicationRequests(bundle)
    practitionerRoles = getPractitionerRoles(bundle)
  })

  test("Should accept a prescription-order message where all MedicationRequests have intent order", () => {
    const validationErrors = validator.verifyCommonBundle(bundle)
    expect(validationErrors).toHaveLength(0)
  })

  test("Should reject a message where one MedicationRequest has intent plan", () => {
    medicationRequests[0].intent = fhir.MedicationRequestIntent.PLAN
    const validationErrors = validator.verifyCommonBundle(bundle)
    expect(validationErrors).toHaveLength(1)
    expect(validationErrors[0].expression).toContainEqual("Bundle.entry.resource.ofType(MedicationRequest).intent")
  })

  test("Should reject a message where all MedicationRequests have intent plan", () => {
    medicationRequests.forEach(medicationRequest => medicationRequest.intent = fhir.MedicationRequestIntent.PLAN)
    const validationErrors = validator.verifyCommonBundle(bundle)
    expect(validationErrors).toHaveLength(1)
    expect(validationErrors[0].expression).toContainEqual("Bundle.entry.resource.ofType(MedicationRequest).intent")
  })

  test("Should reject a message where a MedicationRequest has both codeableConcept and reference", () => {
    const testCodeableConcept: fhir.CodeableConcept = {
      coding: []
    }
    const testReference: fhir.Reference<fhir.Medication> = {
      reference: "urn:uuid:test"
    }
    medicationRequests[0].medicationCodeableConcept = testCodeableConcept
    medicationRequests[0].medicationReference = testReference
    const validationErrors = validator.verifyCommonBundle(bundle)
    expect(validationErrors).toHaveLength(1)
  })

  test("Should reject a message where True feature flag doesn't match PractitionerRole", () => {
    process.env.REFACTOR_ENABLED = "true"
    const testReference: fhir.Reference<fhir.Practitioner> = {
      reference: "urn:uuid:test"
    }
    practitionerRoles[0].practitioner = testReference
    practitionerRoles[0].organization = testReference
    practitionerRoles[0].healthcareService = [testReference]

    const validationErrors = validator.verifyCommonBundle(bundle)
    expect(validationErrors).toHaveLength(3)
  })

  test("Should reject a message where False feature flag doesn't match PractitionerRole", () => {
    process.env.REFACTOR_ENABLED = "false"
    const testReference: fhir.IdentifierReference<fhir.Practitioner> = {
      identifier: {
        value: "test"
      }
    }
    practitionerRoles[0].practitioner = testReference
    practitionerRoles[0].organization = testReference
    practitionerRoles[0].healthcareService = [testReference]

    const validationErrors = validator.verifyCommonBundle(bundle)
    expect(validationErrors).toHaveLength(3)
  })
})

describe("verifyPrescriptionBundle status check", () => {
  let bundle: fhir.Bundle
  let medicationRequests: Array<fhir.MedicationRequest>

  beforeEach(() => {
    bundle = clone(TestResources.examplePrescription1.fhirMessageUnsigned)
    medicationRequests = getMedicationRequests(bundle)
  })

  test("Should accept a message where all MedicationRequests have status active", () => {
    const validationErrors = validator.verifyPrescriptionBundle(bundle)
    expect(validationErrors).toHaveLength(0)
  })

  test("Should reject a message where one MedicationRequest has status cancelled", () => {
    medicationRequests[0].status = fhir.MedicationRequestStatus.CANCELLED
    const validationErrors = validator.verifyPrescriptionBundle(bundle)
    expect(validationErrors).toHaveLength(1)
    expect(validationErrors[0].expression).toContainEqual("Bundle.entry.resource.ofType(MedicationRequest).status")
  })

  test("Should reject a message where all MedicationRequests have status cancelled", () => {
    medicationRequests.forEach(medicationRequest => medicationRequest.status = fhir.MedicationRequestStatus.CANCELLED)
    const validationErrors = validator.verifyPrescriptionBundle(bundle)
    expect(validationErrors).toHaveLength(1)
    expect(validationErrors[0].expression).toContainEqual("Bundle.entry.resource.ofType(MedicationRequest).status")
  })
})

describe("MedicationRequest consistency checks", () => {
  let bundle: fhir.Bundle
  let medicationRequests: Array<fhir.MedicationRequest>

  beforeEach(() => {
    bundle = clone(TestResources.examplePrescription1.fhirMessageUnsigned)
    medicationRequests = getMedicationRequests(bundle)
  })

  test("Should cater for optional/missing extensions for MedicationRequests in consistency check", () => {
    medicationRequests.forEach(medicationRequest => medicationRequest.dispenseRequest.extension = [])

    const returnedError = validator.verifyIdenticalForAllMedicationRequests(
      bundle,
      medicationRequests,
      'dispenseRequest.extension("https://fhir.nhs.uk/StructureDefinition/Extension-DM-PerformerSiteType")')

    expect(returnedError).toBe(null)
  })

  test("Should reject message where MedicationRequests have different authoredOn", () => {
    const defaultAuthoredOn = "2020-01-02T00:00:00.000Z"
    medicationRequests.forEach(medicationRequest => medicationRequest.authoredOn = defaultAuthoredOn)
    const differentAuthoredOn = "2020-01-01T00:00:00.000Z"
    medicationRequests[0].authoredOn = differentAuthoredOn

    const validationErrors = validator.verifyPrescriptionBundle(bundle)

    validateValidationErrors(validationErrors)
    expect(
      validationErrors
    ).toContainEqual(
      errors.createMedicationRequestInconsistentValueIssue(
        "authoredOn",
        [differentAuthoredOn, defaultAuthoredOn]
      )
    )
  })

  test("Should reject message where MedicationRequests have different dispenseRequest.performer", () => {
    const performerExtension: fhir.ReferenceExtension<fhir.PractitionerRole> = {
      valueReference: {reference: ""},
      url: ""
    }
    const performer: fhir.Performer = {
      identifier: {
        system: "system",
        value: "value"
      },
      extension: [performerExtension]
    }
    const performerDiff: fhir.Performer = {
      identifier: {
        system: "system2",
        value: "value2"
      },
      extension: [performerExtension]
    }

    medicationRequests.forEach(medicationRequest => medicationRequest.dispenseRequest.performer = performer)
    medicationRequests[3].dispenseRequest.performer = performerDiff

    const validationErrors = validator.verifyPrescriptionBundle(bundle)

    validateValidationErrors(validationErrors)
    expect(
      validationErrors
    ).toContainEqual(
      errors.createMedicationRequestInconsistentValueIssue(
        "dispenseRequest.performer",
        [performer, performerDiff]
      )
    )
  })

  test("Null should contribute to the count of unique values", () => {
    medicationRequests[0].groupIdentifier = null

    const validationErrors = validator.verifyPrescriptionBundle(bundle)

    validateValidationErrors(validationErrors)
  })

  test("Undefined should contribute to the count of unique values", () => {
    medicationRequests[0].groupIdentifier = undefined

    const validationErrors = validator.verifyPrescriptionBundle(bundle)

    validateValidationErrors(validationErrors)
  })

  test("Should reject message where 2 or more medication requests share an identifier", () => {
    const identifier: Array<fhir.Identifier> = [
      {
        "system": "https://fhir.nhs.uk/Id/prescription-order-item-number",
        "value": "a54219b8-f741-4c47-b662-e4f8dfa49ab5"
      }
    ]

    medicationRequests.forEach(medicationRequest => medicationRequest.identifier = identifier)

    const validationErrors = validator.verifyPrescriptionBundle(bundle)

    validateValidationErrors(validationErrors)
    expect(
      validationErrors
    ).toContainEqual(
      errors.medicationRequestDuplicateIdentifierIssue
    )
  })
})

describe("verifyRepeatDispensingPrescription", () => {
  let bundle: fhir.Bundle
  let medicationRequests: Array<fhir.MedicationRequest>
  let firstMedicationRequest: fhir.MedicationRequest

  beforeEach(() => {
    bundle = clone(TestResources.examplePrescription1.fhirMessageUnsigned)
    medicationRequests = getMedicationRequests(bundle)
    medicationRequests.forEach(
      req => req.courseOfTherapyType.coding[0].code = fhir.CourseOfTherapyTypeCode.CONTINUOUS_REPEAT_DISPENSING
    )
    firstMedicationRequest = medicationRequests[0]
  })

  test("Acute prescription gets no additional errors added", () => {
    medicationRequests.forEach(
      req => {
        req.courseOfTherapyType.coding[0].code = fhir.CourseOfTherapyTypeCode.ACUTE
        delete req.dispenseRequest.validityPeriod
        delete req.dispenseRequest.expectedSupplyDuration
      }
    )

    const returnedErrors = validator.verifyPrescriptionBundle(bundle)
    expect(returnedErrors.length).toBe(0)
  })

  test("Repeat prescription with no dispenseRequest.validityPeriod adds an error", () => {
    delete firstMedicationRequest.dispenseRequest.validityPeriod
    const returnedErrors = validator.verifyRepeatDispensingPrescription(medicationRequests)
    expect(returnedErrors.length).toBe(1)
  })

  test("Repeat prescription with no dispenseRequest.expectedSupplyDuration adds an error", () => {
    delete firstMedicationRequest.dispenseRequest.expectedSupplyDuration
    const returnedErrors = validator.verifyRepeatDispensingPrescription(medicationRequests)
    expect(returnedErrors.length).toBe(1)
  })

  test("Repeat prescription with no extension adds an error", () => {
    const extensionToRemove = getExtensionForUrl(
      firstMedicationRequest.extension,
      "https://fhir.hl7.org.uk/StructureDefinition/Extension-UKCore-MedicationRepeatInformation",
      "bluh"
    )
    firstMedicationRequest.extension.remove(extensionToRemove as fhir.RepeatInformationExtension)
    const returnedErrors = validator.verifyRepeatDispensingPrescription(medicationRequests)
    expect(returnedErrors.length).toBe(1)
  })
})

describe("verifyCancellationBundle", () => {
  let bundle: fhir.Bundle

  beforeEach(() => {
    const cancelExample = TestResources.specification.map(s => s.fhirMessageCancel).filter(isTruthy)[0]
    bundle = clone(cancelExample)
  })

  test("accepts a valid cancel request", () => {
    const returnedErrors = validator.verifyCancellationBundle(bundle)
    expect(returnedErrors.length).toBe(0)
  })

  test("returns an error when passed more than 1 MedicationRequest", () => {
    const medicationRequestEntry = bundle.entry.filter(entry => entry.resource.resourceType === "MedicationRequest")[0]
    bundle.entry.push(medicationRequestEntry)
    const returnedErrors = validator.verifyCancellationBundle(bundle)
    expect(returnedErrors.length).toBe(1)
    expect(returnedErrors[0]).toEqual(errors.medicationRequestNumberIssue)
  })

  test("returns an error when status is not cancelled", () => {
    const medicationRequest = getMedicationRequests(bundle)[0]
    medicationRequest.status = fhir.MedicationRequestStatus.ACTIVE
    const returnedErrors = validator.verifyCancellationBundle(bundle)
    expect(returnedErrors.length).toBe(1)
    expect(returnedErrors[0].expression).toContainEqual("Bundle.entry.resource.ofType(MedicationRequest).status")
  })

  test("returns an error when MedicationRequest doesn't have a statusReason", () => {
    const medicationRequest = getMedicationRequests(bundle)[0]
    delete medicationRequest.statusReason
    const returnedErrors = validator.verifyCancellationBundle(bundle)
    expect(returnedErrors.length).toBe(1)
    expect(returnedErrors[0].expression).toContainEqual("Bundle.entry.resource.ofType(MedicationRequest).statusReason")
  })
})

describe("verifyDispenseNotificationBundle", () => {
  let bundle: fhir.Bundle

  beforeEach(() => {
    const dispenseExample = TestResources.specification.map(s => s.fhirMessageDispense).filter(isTruthy)[0]
    bundle = clone(dispenseExample)
  })

  test("accepts a valid dispense request", () => {
    const returnedErrors = validator.verifyDispenseBundle(bundle)
    expect(returnedErrors.length).toBe(0)
  })

  test("returns an error when MedicationDispenses have different prescription statuses", () => {
    const medicationDispenseEntry =
      bundle.entry.filter(entry => entry.resource.resourceType === "MedicationDispense")[0]

    const medicationDispense1 = medicationDispenseEntry.resource as fhir.MedicationDispense
    const prescriptionStatus1 = getPrescriptionStatus(medicationDispense1)
    prescriptionStatus1.valueCoding.code = "0001"

    const medicationDispenseEntry2 = clone(medicationDispenseEntry)
    const medicationDispense2 = medicationDispenseEntry.resource as fhir.MedicationDispense
    const prescriptionStatus2 = getPrescriptionStatus(medicationDispense2)
    prescriptionStatus2.valueCoding.code = "0003"
    bundle.entry.push(medicationDispenseEntry2)

    const returnedErrors = validator.verifyDispenseBundle(bundle)
    expect(returnedErrors.length).toBe(1)
    expect(returnedErrors[0].expression)
      // eslint-disable-next-line max-len
      .toContainEqual("Bundle.entry.resource.ofType(MedicationDispense).extension(\"https://fhir.nhs.uk/StructureDefinition/Extension-EPS-TaskBusinessStatus\")")
  })

  test("returns an error when MedicationDispenses have different whenPrepared timestamps", () => {
    const medicationDispenseEntry =
      bundle.entry.filter(entry => entry.resource.resourceType === "MedicationDispense")[0]

    const medicationDispense1 = medicationDispenseEntry.resource as fhir.MedicationDispense
    medicationDispense1.whenPrepared = "2009-09-21T09:24:20+00:00"

    const medicationDispenseEntry2 = clone(medicationDispenseEntry)
    const medicationDispense2 = medicationDispenseEntry.resource as fhir.MedicationDispense
    medicationDispense2.whenPrepared = "1600-09-21T09:24:20+00:00"
    bundle.entry.push(medicationDispenseEntry2)

    const returnedErrors = validator.verifyDispenseBundle(bundle)
    expect(returnedErrors.length).toBe(1)
    expect(returnedErrors[0].expression).toContainEqual("Bundle.entry.resource.ofType(MedicationDispense).whenPrepared")
  })

  test("returns an error when MedicationDispenses have different performer values per type", () => {
    const medicationDispenseEntry =
      clone(bundle.entry.filter(entry => entry.resource.resourceType === "MedicationDispense")[0])

    const medicationDispense = medicationDispenseEntry.resource as fhir.MedicationDispense
    medicationDispense.performer = [
      {
        actor: {
          type: "Practitioner",
          identifier: {value: "DIFFERENT_FROM_EXISTING"}
        }
      },
      medicationDispense.performer.find(p => p.actor.type === "Organization")
    ]

    bundle.entry.push(medicationDispenseEntry)

    const returnedErrors = validator.verifyDispenseBundle(bundle)
    expect(returnedErrors.length).toBe(1)
    expect(returnedErrors[0].expression)
      .toContainEqual("Bundle.entry.resource.ofType(MedicationDispense).performer")
  })

  test("returns an error when MedicationDispenses have different nhs-numbers", () => {
    const medicationDispenseEntry =
      bundle.entry.filter(entry => entry.resource.resourceType === "MedicationDispense")[0]

    const medicationDispense1 = medicationDispenseEntry.resource as fhir.MedicationDispense
    medicationDispense1.subject.identifier.value = "123456789"

    const medicationDispenseEntry2 = clone(medicationDispenseEntry)
    const medicationDispense2 = medicationDispenseEntry.resource as fhir.MedicationDispense
    medicationDispense2.subject.identifier.value = "987654321"
    bundle.entry.push(medicationDispenseEntry2)

    const returnedErrors = validator.verifyDispenseBundle(bundle)
    expect(returnedErrors.length).toBe(1)
    expect(returnedErrors[0].expression)
      .toContainEqual("Bundle.entry.resource.ofType(MedicationDispense).subject.identifier.value")
  })

  test("returns an error when a MedicationDispense has no organisation", () => {
    const medicationDispenseEntry =
      bundle.entry.filter(entry => entry.resource.resourceType === "MedicationDispense")[0]

    const medicationDispense = medicationDispenseEntry.resource as fhir.MedicationDispense
    const organisationPerformer = getOrganisationPerformer(medicationDispense)
    medicationDispense.performer.remove(organisationPerformer)

    const returnedErrors = validator.verifyDispenseBundle(bundle)
    expect(returnedErrors.length).toBe(1)
    expect(returnedErrors[0].expression)
      .toContainEqual("Bundle.entry.resource.ofType(MedicationDispense).performer.actor.ofType(Organization)")
  })

  test("returns an error when a MedicationDispense has both codeableConcept and reference", () => {
    const medicationDispenseEntry =
      bundle.entry.filter(entry => entry.resource.resourceType === "MedicationDispense")[0]

    const medicationDispense = medicationDispenseEntry.resource as fhir.MedicationDispense
    const testCodeableConcept: fhir.CodeableConcept = {
      coding: []
    }
    const testReference: fhir.Reference<fhir.Medication> = {
      reference: "urn:uuid:test"
    }
    medicationDispense.medicationCodeableConcept = testCodeableConcept
    medicationDispense.medicationReference = testReference
    const returnedErrors = validator.verifyDispenseBundle(bundle)
    expect(returnedErrors.length).toBe(1)
  })
})
