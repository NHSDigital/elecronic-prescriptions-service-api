import * as TestResources from "../../../resources/test-resources"
import {getIdentifierValueForSystem} from "../../../../src/services/translation/common"
import {createPractitioner} from "../../../../src/services/translation/cancellation/cancellation-practitioner"
import {SPINE_CANCELLATION_ERROR_RESPONSE_REGEX} from "../../../../src/services/translation/spine-response"
import {readXml} from "../../../../src/services/serialisation/xml"

describe("createPractitioner", () => {
  const actualError = TestResources.spineResponses.cancellationError
  const preParsedMsg = SPINE_CANCELLATION_ERROR_RESPONSE_REGEX.exec(actualError.response.body)[0]
  const parsedMsg = readXml(preParsedMsg)
  const actEvent = parsedMsg["hl7:PORX_IN050101UK31"]["hl7:ControlActEvent"]
  const cancellationResponse = actEvent["hl7:subject"].CancellationResponse
  const author = createPractitioner(cancellationResponse.author.AgentPerson)

  test("returned practitioner has an identifier with correct SDS user id", () => {
    expect(author.identifier).not.toBeUndefined()
    expect(author.identifier.length).toBe(1)
    const sdsIdentifier = getIdentifierValueForSystem(
      author.identifier,
      "https://fhir.hl7.org.uk/Id/gphc-number",
      "author.identifier")
    expect(sdsIdentifier).toBe("4428981")
  })

  test("returned practitioner has correct family and given names, and prefix", () => {
    expect(author.name).not.toBeUndefined()
    expect(author.name[0].family).toBe("Edwards")
    expect(author.name[0].given[0]).toBe("Thomas")
    expect(author.name[0].prefix[0]).toBe("DR")
  })
})
