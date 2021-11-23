import * as TestResources from "../../../resources/test-resources"
import {createPatient} from "../../../../src/services/translation/response/patient"
import {UNKNOWN_GP_ODS_CODE} from "../../../../src/services/translation/common"
import {clone} from "../../../resources/test-helpers"
import {getCancellationResponse} from "../common/test-helpers"
import {hl7V3, fhir} from "@models"

describe("createPatient", () => {
  const cancellationResponse = getCancellationResponse(TestResources.spineResponses.cancellationNotFoundError)
  let hl7Patient: hl7V3.Patient
  let fhirPatient: fhir.Patient

  beforeEach(() => {
    hl7Patient = clone(cancellationResponse.recordTarget.Patient)
    fhirPatient = createPatient(hl7Patient)
  })

  test("returned patient has an identifier block with correct NHS number", () => {
    expect(fhirPatient.identifier).not.toBeUndefined()
    const nhsNumber = fhirPatient.identifier[0].value
    expect(nhsNumber).toBe("9449304122")
  })

  test("returned patient has correct name use", () => {
    expect(fhirPatient.name).not.toBeUndefined()
    expect(fhirPatient.name[0].use).toBe("usual")
  })

  test("returned patient has correct family and given names, and prefix", () => {
    expect(fhirPatient.name).not.toBeUndefined()
    expect(fhirPatient.name[0].family).toBe("FORREST")
    expect(fhirPatient.name[0].given[0]).toBe("LILAC")
    expect(fhirPatient.name[0].prefix[0]).toBe("MS")
  })

  test("returned patient has correct gender", () => {
    expect(fhirPatient.gender).not.toBeUndefined()
    expect(fhirPatient.gender).toBe("female")
  })

  test("returned patient has correct birthdate", () => {
    expect(fhirPatient.birthDate).not.toBeUndefined()
    expect(fhirPatient.birthDate).toBe("2011-03-30")
  })

  test("returned patient has unknown gp code when passed nullFlavor of 'UNK", () => {
    const subjectOf = hl7Patient.patientPerson.playedProviderPatient.subjectOf
    subjectOf.patientCareProvision.responsibleParty.healthCareProvider.id = hl7V3.Null.UNKNOWN
    hl7Patient.patientPerson.playedProviderPatient.subjectOf = subjectOf

    fhirPatient = createPatient(hl7Patient)
    expect(fhirPatient.generalPractitioner).not.toBeUndefined()
    expect(fhirPatient.generalPractitioner[0].identifier.value).toBe(UNKNOWN_GP_ODS_CODE)
  })

  test("returned patient has correct GP", () => {
    expect(fhirPatient.generalPractitioner).not.toBeUndefined()
    expect(fhirPatient.generalPractitioner[0].identifier.value).toBe("B81001")
  })

  test("returned patient has correct address use", () => {
    expect(fhirPatient.address).not.toBeUndefined()
    expect(fhirPatient.address[0].use).toBe("home")
  })

  test("returned patient has correct address", () => {
    expect(fhirPatient.address[0].postalCode).toBe("KT11 2QX")
    expect(fhirPatient.address[0].line.length).toBe(3)
    expect(fhirPatient.address[0].line[0]).toBe("10 HAWKHURST")
    expect(fhirPatient.address[0].line[1]).toBe("COBHAM")
    expect(fhirPatient.address[0].line[2]).toBe("SURREY")
  })
})
