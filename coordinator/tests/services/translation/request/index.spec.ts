import pino from "pino"
import * as translator from "../../../../src/services/translation/request"
import {convertFhirMessageToSignedInfoMessage} from "../../../../src/services/translation/request"
import * as TestResources from "../../../resources/test-resources"
import * as LosslessJson from "lossless-json"
import {getStringParameterByName, isTruthy} from "../../../../src/services/translation/common"
import {MomentFormatSpecification, MomentInput} from "moment"
import {xmlTest} from "../../../resources/test-helpers"
import {ElementCompact} from "xml-js"
import {convertHL7V3DateTimeToIsoDateTimeString} from "../../../../src/services/translation/common/dateTime"
import {fhir, processingErrors as errors} from "@models"
import {PayloadFactory} from "../../../../src/services/translation/request/common/PayloadFactory"

const logger = pino()

const actualMoment = jest.requireActual("moment")
const mockTime = {value: "2020-12-18T12:34:34Z"}
jest.mock("moment", () => ({
  utc: (input?: MomentInput, format?: MomentFormatSpecification) => actualMoment.utc(input || mockTime.value, format)
}))

describe("convertFhirMessageToSignedInfoMessage", () => {
  const cases = TestResources.specification.map(example => [
    example.description,
    example.fhirMessageUnsigned,
    example.fhirMessageDigest
  ])

  test.each(cases)("accepts %s", (desc: string, message: fhir.Bundle) => {
    expect(() => convertFhirMessageToSignedInfoMessage(message, logger)).not.toThrow()
  })

  test("rejects a cancellation message", () => {
    const cancellationMessage = TestResources.specification.map(s => s.fhirMessageCancel).filter(isTruthy)[0]
    expect(() => convertFhirMessageToSignedInfoMessage(cancellationMessage, logger)).toThrow(errors.InvalidValueError)
  })

  test.each(cases)(
    "produces expected result for %s",
    (desc: string, message: fhir.Bundle, expectedParameters: fhir.Parameters) => {
      mockTime.value = getStringParameterByName(expectedParameters.parameter, "timestamp").valueString
      const actualParameters = convertFhirMessageToSignedInfoMessage(message, logger)
      expect(actualParameters).toEqual(expectedParameters)
    }
  )
})

describe("convertFhirMessageToHl7V3ParentPrescriptionMessage", () => {
  const cases = TestResources.specification.map(example => [
    example.description,
    example.fhirMessageSigned,
    example.hl7V3Message
  ])

  test.each(cases)("accepts %s", (desc: string, message: fhir.Bundle) => {
    expect(async () =>
      await translator.convertBundleToSpineRequest(message, TestResources.validTestHeaders, logger)
    ).not.toThrow()
  })

  test.each(cases)(
    "produces expected result for %s",
    (desc: string, message: fhir.Bundle, expectedOutput: ElementCompact) => {
      mockTime.value = convertHL7V3DateTimeToIsoDateTimeString(expectedOutput.PORX_IN020101SM31.creationTime)
      const payloadFactory = PayloadFactory.forBundle()
      const actualMessage = payloadFactory.makeSendMessagePayload(
        message,
        TestResources.validTestHeaders,
        logger
      )

      expect(actualMessage.id._attributes.root).not.toBeNull()
      actualMessage.id._attributes.root = expectedOutput.PORX_IN020101SM31.id._attributes.root

      xmlTest(actualMessage, expectedOutput.PORX_IN020101SM31)()
    }
  )

  test("produces result with no lower case UUIDs", async() => {
    const messageWithLowercaseUUIDs = getMessageWithLowercaseUUIDs()

    const translatedMessage = (
      await translator.convertBundleToSpineRequest(messageWithLowercaseUUIDs, TestResources.validTestHeaders, logger)
    ).message

    const allNonUpperCaseUUIDS = getAllUUIDsNotUpperCase(translatedMessage)
    expect(allNonUpperCaseUUIDS.length).toBe(0)
  })
})

function getMessageWithLowercaseUUIDs() {
  const re = /[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}/g
  let messageStr = LosslessJson.stringify(TestResources.examplePrescription1.fhirMessageUnsigned)
  messageStr = messageStr.replace(re, (uuid) => uuid.toLowerCase())
  return LosslessJson.parse(messageStr)
}

function getAllUUIDsNotUpperCase(translatedMessage: string) {
  const caseInsensitiveRe = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi
  const allUUIDS = translatedMessage.match(caseInsensitiveRe)
  const uppercaseUUIDRe = /[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}/g
  const allUpperUUIDS = translatedMessage.match(uppercaseUUIDRe)
  return allUUIDS.filter(uuid => !allUpperUUIDS.includes(uuid))
}
