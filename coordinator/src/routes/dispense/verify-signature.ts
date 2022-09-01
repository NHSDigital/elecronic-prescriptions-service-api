import Hapi from "@hapi/hapi"
import pino from "pino"
import {
  BASE_PATH,
  ContentTypes,
  externalValidator,
  getPayload
} from "../util"
import {fhir, validationErrors as errors, common} from "@models"
import {getRequestId} from "../../utils/headers"
import {isBundle} from "../../utils/type-guards"
import {verifySignature} from "../../services/verification/signature-verification"
import {buildVerificationResultParameter} from "../../utils/build-verification-result-parameter"
import {trackerClient} from "../../services/communication/tracker/tracker-client"
import {toArray} from "../../services/translation/common"
import {createBundle} from "../../services/translation/common/response-bundles"

// todo:
// 1. Test cases
//  1a. HL7v3 Acute/Repeat Prescribing/Repeat Dispensing prescriptions
//  1b. FHIR Acute/Repeat Prescribing/Repeat Dispensing prescriptions
//  1c. No prescription in tracker for prescription id(s) in request
// 2. Error handling for no prescription found in tracker

const verifyPrescription = async (
  fhirPrescriptionFromRequest: fhir.Bundle,
  requestId: string,
  logger: pino.Logger
): Promise<Array<string>> => {
  const fhirPathBuilder = new common.FhirPathBuilder()
  const fhirPathReader = new common.FhirPathReader(fhirPrescriptionFromRequest)
  const medicationRequest = fhirPathBuilder.bundle().medicationRequest()
  const prescriptionId = fhirPathReader.read(medicationRequest.prescriptionShortFormId())
  const repeatNumber = getRepeatNumber(fhirPathReader.read(medicationRequest.repeatsIssued()))
  const trackerResponse = await trackerClient.track(
    requestId,
    prescriptionId,
    repeatNumber,
    logger
  )
  // todo: handle errors inc. no prescription returned
  const hl7v3PrescriptionFromTracker = trackerResponse.prescription
  const fhirPrescriptionTranslatedFromHl7v3 = createBundle(hl7v3PrescriptionFromTracker, "")
  const prescriptionFromTracker = common.buildPrescription(fhirPrescriptionTranslatedFromHl7v3)
  const prescriptionFromRequest = common.buildPrescription(fhirPrescriptionFromRequest)
  const errors = [
    ...verifySignature(hl7v3PrescriptionFromTracker),
    ...comparePrescriptions(prescriptionFromTracker, prescriptionFromRequest)
  ]
  return errors
}

const createVerificationResponse = async (
  fhirPrescriptionFromRequest: Array<fhir.Bundle>,
  requestId: string,
  logger: pino.Logger
): Promise<Array<fhir.MultiPartParameter>> => {
  const parameters = await Promise.all(
    fhirPrescriptionFromRequest.map(async(prescription: fhir.Bundle, index: number) => {
      const verificationErrors = await verifyPrescription(prescription, requestId, logger)
      return createFhirMultiPartParameter(index, prescription, verificationErrors)
    })
  )
  return parameters
}

export default [
  {
    method: "POST",
    path: `${BASE_PATH}/$verify-signature`,
    handler: externalValidator(
      async (request: Hapi.Request, responseToolkit: Hapi.ResponseToolkit): Promise<Hapi.ResponseObject> => {
        const bundle = getPayload(request) as fhir.Resource
        if (!isBundle(bundle)) {
          const operationOutcome = fhir.createOperationOutcome([
            errors.createResourceTypeIssue("Bundle")
          ])
          return responseToolkit.response(operationOutcome).code(400).type(ContentTypes.FHIR)
        }

        const prescriptions = isReleaseResponse(bundle)
          ? getBundlesFromReleaseResponse(bundle)
          : isBundle(bundle)
            ? toArray(bundle)
            : null

        const logger = request.logger

        if (prescriptions === null) {
          logger.error("Did not receive a release response or FHIR bundle prescription")
          // todo: return error response
        }

        logger.info("Verifying prescription(s)")

        const requestId = getRequestId(request.headers)
        const parameters = await createVerificationResponse(prescriptions, requestId, logger)

        const response: fhir.Parameters = {
          resourceType: "Parameters",
          parameter: parameters
        }
        return responseToolkit.response(response).code(200).type(ContentTypes.FHIR)
      }
    )
  }
]

export function comparePrescriptions(p1: common.Prescription, p2: common.Prescription): Array<string> {
  // TODO: AEA-2645 + AEA-2524 - Add key fields to be compared
  const p1KeyValues = Object.entries(p1)
  const p2KeyValues = Object.entries(p2)
  return p1KeyValues.map((keyValue, index) => {
    if (keyValue[1] !== p2KeyValues[index][1]) {
      const camelCaseName = `${keyValue[0]}`
      const firstLetterUpperCase = camelCaseName.substring(0, 1).toUpperCase()
      const allOtherLetters = camelCaseName.substring(1)
      const pascalCaseName = `${firstLetterUpperCase}${allOtherLetters}`
      const titleCaseName = pascalCaseName.replace(/([A-Z])/g, " $1").trim()
      return `${titleCaseName} does not match`
    }
  }).filter(Boolean)
}

function getBundlesFromReleaseResponse(bundle: fhir.Bundle) {
  return bundle.entry
    .map(entry => entry.resource)
    .filter(isBundle)
}

function isReleaseResponse(bundle: fhir.Bundle) {
  return bundle.entry.some(entry => isBundle(entry.resource))
}

function createFhirMultiPartParameter(
  index: number,
  prescription: fhir.Bundle,
  errors: Array<string>
): fhir.MultiPartParameter {
  if (errors.length) {
    const issue = errors.map(e => createInvalidSignatureIssue(e))
    return buildVerificationResultParameter(prescription, issue, index)
  }
  const issue: Array<fhir.OperationOutcomeIssue> = [{
    severity: "information",
    code: fhir.IssueCodes.INFORMATIONAL
  }]
  return buildVerificationResultParameter(prescription, issue, index)
}
function createInvalidSignatureIssue(display: string): fhir.OperationOutcomeIssue {
  return {
    severity: "error",
    code: fhir.IssueCodes.INVALID,
    details: {
      coding: [{
        system: "https://fhir.nhs.uk/CodeSystem/Spine-ErrorOrWarningCode",
        code: "INVALID",
        display
      }]
    },
    expression: ["Provenance.signature.data"]
  }
}

function getRepeatNumber(repeatsIssued: string) {
  return (
    (
      repeatsIssued
        ? parseInt(repeatsIssued)
        : 0
    )
    + 1)
    .toString()
}
