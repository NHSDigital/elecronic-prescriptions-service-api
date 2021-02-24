import {readXml} from "../../serialisation/xml"
import {SpineDirectResponse} from "../../../models/spine"
import {translateSpineCancelResponseIntoBundle} from "./cancellation/cancellation-response"
import {toArray} from "../common"
import * as hl7V3 from "../../../models/hl7-v3"
import * as fhir from "../../../models/fhir"

const SYNC_SPINE_RESPONSE_MCCI_REGEX = /(?=<MCCI_IN010000UK13>)([\s\S]*)(?<=<\/MCCI_IN010000UK13>)/i
const ASYNC_SPINE_RESPONSE_MCCI_REGEX = /(?=<hl7:MCCI_IN010000UK13[\s\S]*>)([\s\S]*)(?<=<\/hl7:MCCI_IN010000UK13>)/i
// eslint-disable-next-line max-len
export const SPINE_CANCELLATION_ERROR_RESPONSE_REGEX = /(?=<hl7:PORX_IN050101UK31[\s\S]*>)([\s\S]*)(?<=<\/hl7:PORX_IN050101UK31>)/i

interface TranslatedSpineResponse {
  fhirResponse: fhir.OperationOutcome | fhir.Bundle
  statusCode: number
}

function isBundle(body: unknown): body is fhir.Bundle {
  return typeof body === "object"
    && "resourceType" in body
    && (body as fhir.Resource).resourceType === "Bundle"
}
export function translateToFhir<T>(hl7Message: SpineDirectResponse<T>): TranslatedSpineResponse {
  const bodyString = hl7Message.body.toString()

  const cancelResponse = SPINE_CANCELLATION_ERROR_RESPONSE_REGEX.exec(bodyString)
  if (cancelResponse) {
    return getCancellationResponseAndErrorCodes(cancelResponse)
  }
  const asyncMCCI = ASYNC_SPINE_RESPONSE_MCCI_REGEX.exec(bodyString)
  if (asyncMCCI) {
    return getAsyncResponseAndErrorCodes(asyncMCCI)
  }
  const syncMCCI = SYNC_SPINE_RESPONSE_MCCI_REGEX.exec(bodyString)
  if (syncMCCI) {
    return getSyncResponseAndErrorCodes(syncMCCI)
  }

  if(isBundle(hl7Message.body)){
    return {
      statusCode: 200,
      fhirResponse: hl7Message.body
    }
  } else return {
    statusCode: 400,
    fhirResponse: {
      resourceType: "OperationOutcome",
      issue: [createOperationOutcomeIssue(400)]
    }
  }
}

function getCancellationResponseAndErrorCodes(cancelResponse: RegExpExecArray) {
  const parsedMsg = readXml(cancelResponse[0]) as hl7V3.PORX50101
  const actEvent = parsedMsg["hl7:PORX_IN050101UK31"]["hl7:ControlActEvent"]
  const cancellationResponse = actEvent["hl7:subject"].CancellationResponse
  return {
    statusCode: translateAcknowledgementTypeCodeToStatusCode(getCancelResponseTypeCode(parsedMsg)),
    fhirResponse: translateSpineCancelResponseIntoBundle(cancellationResponse)
  }
}

function getAsyncResponseAndErrorCodes(asyncMCCI: RegExpExecArray) {
  return getFhirResponseAndErrorCodes<hl7V3.AsyncMCCI>(
    readXml(asyncMCCI[0]) as hl7V3.AsyncMCCI,
    getAsyncAcknowledgementTypeCode,
    translateAsyncSpineResponseErrorCodes
  )
}

function getSyncResponseAndErrorCodes(syncMCCI: RegExpExecArray) {
  return getFhirResponseAndErrorCodes<hl7V3.SyncMCCI>(
    readXml(syncMCCI[0]) as hl7V3.SyncMCCI,
    getSyncAcknowledgementTypeCode,
    translateSyncSpineResponseErrorCodes
  )
}

function getFhirResponseAndErrorCodes<T extends hl7V3.AsyncMCCI | hl7V3.SyncMCCI>(
  MCCIWrapper: T,
  getStatusCodeFn: (wrapper: T) => hl7V3.AcknowledgementTypeCode,
  getErrorCodes: (wrapper: T) => Array<fhir.CodeableConcept>
): TranslatedSpineResponse {
  const statusCode = translateAcknowledgementTypeCodeToStatusCode(getStatusCodeFn(MCCIWrapper))
  const errorCodes = getErrorCodes(MCCIWrapper)
  const operationOutcomeIssues = errorCodes.length
    ? errorCodes.map(errorCode => createOperationOutcomeIssue(statusCode, errorCode))
    : [createOperationOutcomeIssue(statusCode)]
  return {
    statusCode: statusCode,
    fhirResponse: {
      resourceType: "OperationOutcome",
      issue: operationOutcomeIssues
    }
  }
}

export function createOperationOutcomeIssue(
  statusCode: number,
  details?: fhir.CodeableConcept
): fhir.OperationOutcomeIssue {
  const successfulMessage = statusCode <= 299
  return {
    code: successfulMessage ? "informational" : "invalid",
    severity: successfulMessage ? "information" : "error",
    details: details
  }
}

function getSyncAcknowledgementTypeCode(syncWrapper: hl7V3.SyncMCCI): hl7V3.AcknowledgementTypeCode {
  const acknowledgementElm = syncWrapper.MCCI_IN010000UK13.acknowledgement
  return acknowledgementElm._attributes.typeCode
}

function getAsyncAcknowledgementTypeCode(asyncWrapper: hl7V3.AsyncMCCI): hl7V3.AcknowledgementTypeCode {
  const acknowledgementElm = asyncWrapper["hl7:MCCI_IN010000UK13"]["hl7:acknowledgement"]
  return acknowledgementElm._attributes.typeCode
}

function getCancelResponseTypeCode(parsedMsg: hl7V3.PORX50101) {
  const parsedMsgAcknowledgement = parsedMsg["hl7:PORX_IN050101UK31"]["hl7:acknowledgement"]
  return parsedMsgAcknowledgement._attributes.typeCode
}

function translateAcknowledgementTypeCodeToStatusCode(acknowledgementTypeCode: hl7V3.AcknowledgementTypeCode): number {
  switch (acknowledgementTypeCode) {
    case hl7V3.AcknowledgementTypeCode.ACKNOWLEDGED:
      return 200
    case hl7V3.AcknowledgementTypeCode.ERROR:
    case hl7V3.AcknowledgementTypeCode.REJECTED:
    default:
      return 400
  }
}

function translateSyncSpineResponseErrorCodes(syncWrapper: hl7V3.SyncMCCI): Array<fhir.CodeableConcept> {
  const acknowledgementDetailElm = syncWrapper.MCCI_IN010000UK13.acknowledgement.acknowledgementDetail
  if (!acknowledgementDetailElm) {
    return []
  }

  const acknowledgementDetailArray = toArray(acknowledgementDetailElm)
  return acknowledgementDetailArray.map(acknowledgementDetail => {
    return {
      coding: [{
        code: acknowledgementDetail.code._attributes.code,
        display: acknowledgementDetail.code._attributes.displayName
      }]
    }
  })
}

function translateAsyncSpineResponseErrorCodes(asyncWrapper: hl7V3.AsyncMCCI): Array<fhir.CodeableConcept> {
  const reasonElm = asyncWrapper["hl7:MCCI_IN010000UK13"]["hl7:ControlActEvent"]["hl7:reason"]
  if (!reasonElm) {
    return []
  }

  const reasonArray = toArray(reasonElm)
  return reasonArray.map(reason => ({
    coding: [{
      code: reason["hl7:justifyingDetectedIssueEvent"]["hl7:code"]._attributes.code,
      display: reason["hl7:justifyingDetectedIssueEvent"]["hl7:code"]._attributes.displayName
    }]
  }))
}
