import {fhir} from "@models"

describe("Patient", () => {
  it("should default generalPractitioner to unknownGPPractice when not provided", () => {
    const patient = new fhir.Patient()
    expect(patient.generalPractitioner).toHaveLength(1)
    expect(patient.generalPractitioner[0].identifier.system)
      .toBe("https://fhir.nhs.uk/Id/ods-organization-code")
    expect(patient.generalPractitioner[0].identifier.value).toBe("V81999")
  })

  it("should default generalPractitioner to unknownGPPractice when provided as empty array", () => {
    const patient = new fhir.Patient({generalPractitioner: []})
    expect(patient.generalPractitioner).toHaveLength(1)
    expect(patient.generalPractitioner[0].identifier.value).toBe("V81999")
  })

  it("should not overwrite generalPractitioner if it is provided", () => {
    const customGp = {
      identifier: {
        system: "https://fhir.nhs.uk/Id/ods-organization-code",
        value: "G999999"
      }
    }
    const patient = new fhir.Patient({generalPractitioner: [customGp]})
    expect(patient.generalPractitioner).toHaveLength(1)
    expect(patient.generalPractitioner[0].identifier.value).toBe("G999999")
  })
})
