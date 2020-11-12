import {convertPatient} from "../../../src/services/translation/prescription/patient"
import {Bundle, Patient} from "../../../src/models/fhir/fhir-resources"
import {clone} from "../../resources/test-helpers"
import * as TestResources from "../../resources/test-resources"
import {getPatient} from "../../../src/services/translation/common/getResourcesOfType"
import {TooManyValuesError} from "../../../src/models/errors/processing-errors"

describe("convertPatient", () => {
  let bundle: Bundle
  let fhirPatient: Patient

  beforeEach(() => {
    bundle = clone(TestResources.examplePrescription1.fhirMessageUnsigned)
    fhirPatient = getPatient(bundle)
  })

  test("Throws TooManyValuesUserFacingError when passed multiple copies of identifier", () => {
    fhirPatient.identifier.push(fhirPatient.identifier[0])
    expect(() => convertPatient(bundle, fhirPatient)).toThrow(TooManyValuesError)
  })

  test("ID gets put in correct field", () => {
    const idValue = "exampleId"
    fhirPatient.identifier[0].value = idValue

    const actual = convertPatient(bundle, fhirPatient).id._attributes.extension

    expect(actual).toBe(idValue)
  })

  test("If there is a patient.telecom, it gets put in the right place", () => {
    fhirPatient.telecom = [{use: "home", value: "0123456789"}]

    const actual = convertPatient(bundle, fhirPatient).telecom[0]._attributes

    expect(actual).toEqual({use: "HP", value: "tel:0123456789"})
  })

  test("If there isn't a patient.telecom, leave it off", () => {
    delete fhirPatient.telecom

    const actual = convertPatient(bundle, fhirPatient).telecom

    expect(actual).toEqual(undefined)
  })
})
