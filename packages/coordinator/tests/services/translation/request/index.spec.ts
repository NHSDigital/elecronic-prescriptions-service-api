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
import {fhir, hl7V3, processingErrors as errors} from "@models"
import {PayloadContent, SendMessagePayloadFactory} from "../../../../src/services/translation/request/payload/factory"

const logger = pino()

const actualMoment = jest.requireActual("moment")
const mockTime = {value: "2020-12-18T12:34:34Z"}
jest.mock("moment", () => ({
  utc: (input?: MomentInput, format?: MomentFormatSpecification) => actualMoment.utc(input || mockTime.value, format)
}))

function isParentPrescription(content: PayloadContent): content is hl7V3.ParentPrescriptionRoot {
  return (content as hl7V3.ParentPrescriptionRoot).ParentPrescription !== undefined
}

function isCancellationRequest(content: PayloadContent): content is hl7V3.CancellationRequestRoot {
  return (content as hl7V3.CancellationRequestRoot).CancellationRequest !== undefined
}

function getPayloadSubjectIdentifier(subject: PayloadContent) {
  if (isParentPrescription(subject)) {
    return subject.ParentPrescription.id._attributes.root
  } else if (isCancellationRequest(subject)) {
    return subject.CancellationRequest.id._attributes.root
  } else {
    throw new Error("Invalid payload subject type")
  }
}

describe("convertFhirMessageToSignedInfoMessage", () => {
  const cases = TestResources.specification.map((example) => [
    example.description,
    example.fhirMessageUnsigned,
    example.fhirMessageDigest
  ])

  test.each(cases)("accepts %s", async (desc: string, message: fhir.Bundle) => {
    await expect(convertFhirMessageToSignedInfoMessage(message, "fakeApplicationId", logger)).resolves.not.toThrow()
  })

  test("rejects a cancellation message", async () => {
    const cancellationMessage = TestResources.specification.map((s) => s.fhirMessageCancel).filter(isTruthy)[0]
    await expect(() => convertFhirMessageToSignedInfoMessage(cancellationMessage, "fakeApplicationId", logger))
      .rejects.toThrow(errors.InvalidValueError)
  })

  test.each(cases)(
    "produces expected result for %s",
    async (desc: string, message: fhir.Bundle, expectedParameters: fhir.Parameters) => {
      mockTime.value = getStringParameterByName(expectedParameters.parameter, "timestamp").valueString
      const actualParameters = await convertFhirMessageToSignedInfoMessage(message, "fakeApplicationId", logger)
      expect(actualParameters).toEqual(expectedParameters)
    }
  )
})

describe("convertFhirMessageToHl7V3ParentPrescriptionMessage", () => {
  const cases = TestResources.specification.map((example) => [
    example.description,
    example.fhirMessageSigned,
    example.hl7V3Message
  ])

  test.each(cases)("accepts %s", (desc: string, message: fhir.Bundle) => {
    expect(
      async () => await translator.convertBundleToSpineRequest(message, TestResources.validTestHeaders, logger)
    ).not.toThrow()
  })

  test.each(cases)(
    "produces expected result for %s",
    (desc: string, message: fhir.Bundle, expectedOutput: ElementCompact) => {
      mockTime.value = convertHL7V3DateTimeToIsoDateTimeString(expectedOutput.PORX_IN020101SM31.creationTime)
      const payloadFactory = SendMessagePayloadFactory.forBundle()
      const actualMessage = payloadFactory.createSendMessagePayload(message, TestResources.validTestHeaders, logger)

      xmlTest(actualMessage, expectedOutput.PORX_IN020101SM31)()
    }
  )

  test("produces result with no lower case UUIDs", async () => {
    const messageWithLowercaseUUIDs = getMessageWithLowercaseUUIDs()

    const translatedMessage = (
      await translator.convertBundleToSpineRequest(messageWithLowercaseUUIDs, TestResources.validTestHeaders, logger)
    ).message

    const allNonUpperCaseUUIDS = getAllUUIDsNotUpperCase(translatedMessage)
    expect(allNonUpperCaseUUIDS.length).toBe(0)
  })

  test.each(cases)(
    "maps FHIR resource identifier.value to message and payload identifier for %s",
    (desc: string, message: fhir.Bundle, expectedOutput: ElementCompact) => {
      mockTime.value = convertHL7V3DateTimeToIsoDateTimeString(expectedOutput.PORX_IN020101SM31.creationTime)
      const payloadFactory = SendMessagePayloadFactory.forBundle()
      const actualMessage = payloadFactory.createSendMessagePayload(message, TestResources.validTestHeaders, logger)
      const expectedPayloadIdentifier = message.identifier.value.toUpperCase()

      // Ideally, the top level identifier, within the HL7 v3 message, should be the same as the X-Request-ID,
      // so that the payload will contain both the request and the payload identifiers. Unfortunately,
      // doing so seems to result in Spine not logging either of the two identifiers; this is why
      // we're mapping the payload id to both fields.
      const messageIdentifier = actualMessage.id._attributes.root
      expect(messageIdentifier).toBe(expectedPayloadIdentifier)

      const payloadIdentifier = getPayloadSubjectIdentifier(actualMessage.ControlActEvent.subject)
      expect(payloadIdentifier).toBe(expectedPayloadIdentifier)
    }
  )
})

function getMessageWithLowercaseUUIDs(): fhir.Bundle {
  const re = /[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}/g
  let messageStr = LosslessJson.stringify(TestResources.specification[0].fhirMessageUnsigned)
  messageStr = messageStr.replace(re, (uuid) => uuid.toLowerCase())
  return LosslessJson.parse(messageStr) as fhir.Bundle
}

function getAllUUIDsNotUpperCase(translatedMessage: string) {
  const caseInsensitiveRe = /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi
  const allUUIDS = translatedMessage.match(caseInsensitiveRe)
  const uppercaseUUIDRe = /[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}/g
  const allUpperUUIDS = translatedMessage.match(uppercaseUUIDRe)
  return allUUIDS.filter((uuid) => !allUpperUUIDS.includes(uuid))
}
