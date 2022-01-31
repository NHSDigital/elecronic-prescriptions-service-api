import {
  createCommunicationRequest,
  createList,
  parseAdditionalInstructions,
  translateAdditionalInstructions
} from "../../../../../src/services/translation/response/release/additional-instructions"
import {fhir} from "@models"

describe("parseAdditionalInstructions", () => {
  test("handles empty", () => {
    const thing = parseAdditionalInstructions(
      ""
    )
    expect(thing.medication).toEqual([])
    expect(thing.patientInfo).toEqual([])
    expect(thing.controlledDrugWords).toEqual("")
    expect(thing.additionalInstructions).toEqual("")
  })

  test("handles single patientInfo", () => {
    const thing = parseAdditionalInstructions(
      "<patientInfo>Patient info</patientInfo>"
    )
    expect(thing.medication).toEqual([])
    expect(thing.patientInfo).toEqual(["Patient info"])
    expect(thing.controlledDrugWords).toEqual("")
    expect(thing.additionalInstructions).toEqual("")
  })

  test("handles multiple patientInfo", () => {
    const thing = parseAdditionalInstructions(
      "<patientInfo>Patient info 1</patientInfo><patientInfo>Patient info 2</patientInfo>"
    )
    expect(thing.medication).toEqual([])
    expect(thing.patientInfo).toEqual(["Patient info 1", "Patient info 2"])
    expect(thing.controlledDrugWords).toEqual("")
    expect(thing.additionalInstructions).toEqual("")
  })

  test("handles single medication", () => {
    const thing = parseAdditionalInstructions(
      "<medication>Medication</medication>"
    )
    expect(thing.medication).toEqual(["Medication"])
    expect(thing.patientInfo).toEqual([])
    expect(thing.controlledDrugWords).toEqual("")
    expect(thing.additionalInstructions).toEqual("")
  })

  test("handles multiple medication", () => {
    const thing = parseAdditionalInstructions(
      "<medication>Medication 1</medication><medication>Medication 2</medication>"
    )
    expect(thing.medication).toEqual(["Medication 1", "Medication 2"])
    expect(thing.patientInfo).toEqual([])
    expect(thing.controlledDrugWords).toEqual("")
    expect(thing.additionalInstructions).toEqual("")
  })

  test("handles medication and patient info", () => {
    const thing = parseAdditionalInstructions(
      "<medication>Medication</medication><patientInfo>Patient info</patientInfo>"
    )
    expect(thing.medication).toEqual(["Medication"])
    expect(thing.patientInfo).toEqual(["Patient info"])
    expect(thing.controlledDrugWords).toEqual("")
    expect(thing.additionalInstructions).toEqual("")
  })

  test("handles medication and patient info in other order", () => {
    const thing = parseAdditionalInstructions(
      "<patientInfo>Patient info</patientInfo><medication>Medication</medication>"
    )
    expect(thing.medication).toEqual(["Medication"])
    expect(thing.patientInfo).toEqual(["Patient info"])
    expect(thing.controlledDrugWords).toEqual("")
    expect(thing.additionalInstructions).toEqual("")
  })

  test("handles interleaved medication and patient info", () => {
    const thing = parseAdditionalInstructions(
      // eslint-disable-next-line max-len
      "<patientInfo>Patient info 1</patientInfo><medication>Medication 1</medication><patientInfo>Patient info 2</patientInfo><medication>Medication 2</medication>"
    )
    expect(thing.medication).toEqual(["Medication 1", "Medication 2"])
    expect(thing.patientInfo).toEqual(["Patient info 1", "Patient info 2"])
    expect(thing.controlledDrugWords).toEqual("")
    expect(thing.additionalInstructions).toEqual("")
  })

  test("handles controlled drug words", () => {
    const thing = parseAdditionalInstructions(
      "CD: twenty eight"
    )
    expect(thing.medication).toEqual([])
    expect(thing.patientInfo).toEqual([])
    expect(thing.controlledDrugWords).toEqual("twenty eight")
    expect(thing.additionalInstructions).toEqual("")
  })

  test("handles additional instructions", () => {
    const thing = parseAdditionalInstructions(
      "Additional instructions"
    )
    expect(thing.medication).toEqual([])
    expect(thing.patientInfo).toEqual([])
    expect(thing.controlledDrugWords).toEqual("")
    expect(thing.additionalInstructions).toEqual("Additional instructions")
  })

  test("handles controlled drug words and other instructions", () => {
    const thing = parseAdditionalInstructions(
      "CD: twenty eight\nAdditional instructions"
    )
    expect(thing.medication).toEqual([])
    expect(thing.patientInfo).toEqual([])
    expect(thing.controlledDrugWords).toEqual("twenty eight")
    expect(thing.additionalInstructions).toEqual("Additional instructions")
  })

  test("handles multiline additional instructions", () => {
    const thing = parseAdditionalInstructions(
      "Additional instructions line 1\nAdditional instructions line 2"
    )
    expect(thing.medication).toEqual([])
    expect(thing.patientInfo).toEqual([])
    expect(thing.controlledDrugWords).toEqual("")
    expect(thing.additionalInstructions).toEqual("Additional instructions line 1\nAdditional instructions line 2")
  })

  test("handles controlled drug words and multiline additional instructions", () => {
    const thing = parseAdditionalInstructions(
      "CD: twenty eight\nAdditional instructions line 1\nAdditional instructions line 2"
    )
    expect(thing.medication).toEqual([])
    expect(thing.patientInfo).toEqual([])
    expect(thing.controlledDrugWords).toEqual("twenty eight")
    expect(thing.additionalInstructions).toEqual("Additional instructions line 1\nAdditional instructions line 2")
  })

  test("handles XML chars in additional instructions", () => {
    const thing = parseAdditionalInstructions(
      "<medication>Medication</medication>Line < 2\nLine > 1"
    )
    expect(thing.medication).toEqual(["Medication"])
    expect(thing.patientInfo).toEqual([])
    expect(thing.controlledDrugWords).toEqual("")
    expect(thing.additionalInstructions).toEqual("Line < 2\nLine > 1")
  })

  test("handles all fields", () => {
    const thing = parseAdditionalInstructions(
      // eslint-disable-next-line max-len
      "<medication>Medication</medication><patientInfo>Patient info</patientInfo>CD: twenty eight\nAdditional instructions"
    )
    expect(thing.medication).toEqual(["Medication"])
    expect(thing.patientInfo).toEqual(["Patient info"])
    expect(thing.controlledDrugWords).toEqual("twenty eight")
    expect(thing.additionalInstructions).toEqual("Additional instructions")
  })
})

describe("additionalInstructions", () => {
  test("handles single patient info", () => {
    const translatedAgentPerson = translateAdditionalInstructions(
      "patientId",
      undefined,
      undefined,
      [],
      ["Patient info"]
    )
    const list = translatedAgentPerson.list
    expect(list).toBeFalsy()

    const communicationRequest = translatedAgentPerson.communicationRequest
    expect(communicationRequest).toMatchObject<Partial<fhir.CommunicationRequest>>({
      payload: [{
        contentString: "Patient info"
      }]
    })
  })

  test("handles multiple patient info", () => {
    const translatedAgentPerson = translateAdditionalInstructions(
      "patientId",
      undefined,
      undefined,
      [],
      ["Patient info 1", "Patient info 2"]
    )
    const list = translatedAgentPerson.list
    expect(list).toBeFalsy()

    const communicationRequest = translatedAgentPerson.communicationRequest
    expect(communicationRequest).toMatchObject<Partial<fhir.CommunicationRequest>>({
      payload: [
        {
          contentString: "Patient info 1"
        },
        {
          contentString: "Patient info 2"
        }
      ]
    })
  })

  test("handles single medication", () => {
    const translatedAgentPerson = translateAdditionalInstructions(
      "patientId",
      undefined,
      undefined,
      ["Medication"],
      []
    )
    const list = translatedAgentPerson.list
    expect(list).toMatchObject<Partial<fhir.List>>({
      entry: [{
        item: {
          display: "Medication"
        }
      }]
    })

    const communicationRequest = translatedAgentPerson.communicationRequest
    expect(communicationRequest).toMatchObject<Partial<fhir.CommunicationRequest>>({
      payload: [{
        contentReference: {
          reference: `urn:uuid:${list.id}`
        }
      }]
    })
  })

  test("handles multiple medication", () => {
    const translatedAgentPerson = translateAdditionalInstructions(
      "patientId",
      undefined,
      undefined,
      ["Medication 1", "Medication 2"],
      []
    )
    const list = translatedAgentPerson.list
    expect(list).toMatchObject<Partial<fhir.List>>({
      entry: [
        {
          item: {
            display: "Medication 1"
          }
        },
        {
          item: {
            display: "Medication 2"
          }
        }
      ]
    })

    const communicationRequest = translatedAgentPerson.communicationRequest
    expect(communicationRequest).toMatchObject<Partial<fhir.CommunicationRequest>>({
      payload: [{
        contentReference: {
          reference: `urn:uuid:${list.id}`
        }
      }]
    })
  })
})

describe("communication request", () => {
  const communicationRequest = createCommunicationRequest(
    "f8d8f3b2-f7dc-4c51-a57a-592c03d08dbd",
    [{
      contentString: "Here is some text"
    }],
    fhir.createIdentifier("https://fhir.nhs.uk/Id/ods-organization-code", "A83008"),
    fhir.createIdentifier("https://fhir.nhs.uk/Id/nhs-number", "9990548609")
  )

  test("contains id", () => {
    expect(communicationRequest.id).toBeTruthy()
  })

  test("expected fields are populated", () => {
    expect(communicationRequest).toMatchObject<Partial<fhir.CommunicationRequest>>({
      status: "unknown",
      subject: {
        reference: "urn:uuid:f8d8f3b2-f7dc-4c51-a57a-592c03d08dbd"
      },
      payload: [{
        contentString: "Here is some text"
      }],
      requester: {
        identifier: {
          system: "https://fhir.nhs.uk/Id/ods-organization-code",
          value: "A83008"
        }
      },
      recipient: [{
        identifier: {
          system: "https://fhir.nhs.uk/Id/nhs-number",
          value: "9990548609"
        }
      }]
    })
  })
})

describe("list", () => {
  test("contains id", () => {
    const list = createList(["Item"])
    expect(list.id).toBeTruthy()
    expect(list.status).toBe("current")
    expect(list.mode).toBe("snapshot")
  })

  test("handles single entry", () => {
    const list = createList(["Item"])
    expect(list).toMatchObject<Partial<fhir.List>>({
      entry: [{
        item: {
          display: "Item"
        }
      }]
    })
  })

  test("handles multiple entries", () => {
    const list = createList(["Item 1", "Item 2"])
    expect(list).toMatchObject<Partial<fhir.List>>({
      entry: [
        {
          item: {
            display: "Item 1"
          }
        },
        {
          item: {
            display: "Item 2"
          }
        }
      ]
    })
  })
})
