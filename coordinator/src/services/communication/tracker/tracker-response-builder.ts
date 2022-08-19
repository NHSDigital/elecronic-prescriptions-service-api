import {hl7V3} from "@models"
import pino from "pino"
import {SpineDirectResponse} from "../../../../../models/spine"
import {
  extractHl7v3PrescriptionFromMessage,
  extractSpineErrorDescription
} from "./tracker-response-parser"

enum TrackerErrorCode {
  FAILED_TRACKER_REQUEST = "Failed to retrieve prescription from Spine",
  FAILED_PRESCRIPTION_EXTRACT = "Failed to extract prescription from Spine response",
  FAILED_PRESCRIPTION_VERIFY = "Failed to verify prescription from Spine"
}

interface TrackerError {
  errorCode: string
  errorMessage: string
  errorMessageDetails: Array<string>
}

interface TrackerResponse {
  statusCode: number
  prescription?: hl7V3.ParentPrescription
  error?: TrackerError
}

type PrescriptionOrError = hl7V3.ParentPrescription | TrackerError
const isError = (data: PrescriptionOrError): data is TrackerError => {
  return (data as TrackerError).errorMessage !== undefined
}

const createTrackerError = (
  errorCode: TrackerErrorCode,
  message: string,
  details?: string | Array<string>
): TrackerError => {
  const messageDetails = details
    ? Array.isArray(details) ? details : [details]
    : []

  return {
    errorCode: errorCode,
    errorMessage: message,
    errorMessageDetails: messageDetails
  }
}

const extractPrescription = (responseBody: string, logger: pino.Logger): PrescriptionOrError => {
  try {
    return extractHl7v3PrescriptionFromMessage(responseBody, logger)
  } catch (error) {
    return createTrackerError(
      TrackerErrorCode.FAILED_PRESCRIPTION_EXTRACT,
      "Failed to extract prescription from Spine response.",
      error
    )
  }
}

const tryExtractErrorMessage = (responseBody: string, logger: pino.Logger): string => {
  try {
    return extractSpineErrorDescription(responseBody)
  } catch (error) {
    logger.warn(`Could not extract error details from Spine response: ${error}`)
    return null
  }
}

const createTrackerResponse = (spineResponse: SpineDirectResponse<string>, logger: pino.Logger): TrackerResponse => {
  const prescription = extractPrescription(spineResponse.body, logger)
  if (isError(prescription)) {
    const failureDescription = tryExtractErrorMessage(spineResponse.body, logger) ?? prescription.errorMessageDetails
    logger.error(`Failed to extract prescription from Spine response: ${failureDescription}`)

    return {
      statusCode: 500,
      error: prescription
    }
  }

  logger.info(`Successfully extracted prescription ${prescription.id}`)
  return {
    statusCode: 200,
    prescription: prescription
  }
}

export {
  TrackerError,
  TrackerErrorCode,
  TrackerResponse,
  createTrackerResponse,
  createTrackerError
}
