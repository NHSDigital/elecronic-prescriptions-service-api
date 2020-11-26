import * as TestResources from "../../../resources/test-resources"
import {
  SPINE_CANCELLATION_ERROR_RESPONSE_REGEX
} from "../../../../src/services/translation/common"
import {readXml} from "../../../../src/services/serialisation/xml"
import {SpineCancellationResponse} from "../../../../src/models/hl7-v3/hl7-v3-spine-response"
import {createPatient} from "../../../../src/services/translation/cancellation/cancellation-patient"

describe("createPatient", () => {
  const actualError = TestResources.spineResponses.cancellationError
  const cancelResponse = SPINE_CANCELLATION_ERROR_RESPONSE_REGEX.exec(actualError.response.body)[0]
  const patient = createPatient(readXml(cancelResponse) as SpineCancellationResponse)

  test("returned patient has an identifier block with corect NHS number", ()=> {
    expect(patient.identifier).not.toBeUndefined()
    const nhsNumber = patient.identifier[0].value
    expect(nhsNumber).toBe("9453740519")
  })

  test("returned patient has correct gender", () => {
    expect(patient.gender).not.toBeUndefined()
    expect(patient.gender).toBe("female")
  })

  test("returned patient has correct birthdate", () => {
    expect(patient.birthDate).not.toBeUndefined()
    expect(patient.birthDate).toBe("1999-01-04")
  })

  test("returned patient has correct GP", () => {
    expect(patient.generalPractitioner).not.toBeUndefined()
    expect(patient.generalPractitioner[0].identifier.value).toBe("B81001")
  })
})
