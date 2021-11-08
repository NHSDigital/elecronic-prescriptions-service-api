import Hapi from "@hapi/hapi"
import {fhir} from "@models"
import {BASE_PATH, ContentTypes} from "../util"
import {getStatusCode} from "../../utils/status-code"
import {trackerClient} from "../../services/communication/tracker"
import {convertSpineResponseToFhir} from "../../services/translation/response/tracker/translation"
import {RequestHeaders} from "../../utils/headers"
import * as LosslessJson from "lossless-json"
import {isBundle, isTask} from "../../utils/type-guards"
import {validateQueryParameters} from "../../services/validation/query-validator"

export enum QueryParam {
  IDENTIFIER = "identifier",
  FOCUS_IDENTIFIER = "focus:identifier",
  PATIENT_IDENTIFIER = "patient:identifier"
}

export type ValidQuery = Partial<Record<QueryParam, string>>

export const queryParamMetadata = new Map([
  [QueryParam.FOCUS_IDENTIFIER, {
    system: "https://fhir.nhs.uk/Id/prescription-order-number",
    getTaskField: (task: fhir.Task) => task.focus.identifier
  }],
  [QueryParam.IDENTIFIER, {
    system: "https://fhir.nhs.uk/Id/prescription-order-number",
    getTaskField: task => task.focus.identifier
  }],
  [QueryParam.PATIENT_IDENTIFIER, {
    system: "https://fhir.nhs.uk/Id/nhs-number",
    getTaskField: task => task.for.identifier
  }]
])

export default [{
  method: "GET",
  path: `${BASE_PATH}/Task`,
  handler: async (
    request: Hapi.Request, responseToolkit: Hapi.ResponseToolkit
  ): Promise<Hapi.Lifecycle.ReturnValue> => {
    const query = request.query
    const issues = validateQueryParameters(query)
    if (issues.length) {
      const response = fhir.createOperationOutcome(issues)
      const statusCode = getStatusCode(issues)
      return responseToolkit.response(response).code(statusCode).type(ContentTypes.FHIR)
    }

    const validQuery = query as ValidQuery
    const spineResponse = await makeSpineRequest(validQuery, request)

    if (request.headers[RequestHeaders.RAW_RESPONSE]) {
      return responseToolkit
        .response(JSON.stringify(spineResponse))
        .code(200)
        .type(ContentTypes.JSON)
    }

    const result = convertSpineResponseToFhir(spineResponse)
    if (isBundle(result)) {
      filterBundleEntries(result, validQuery)
    }
    return responseToolkit
      .response(LosslessJson.stringify(result))
      .code(200)
      .type(ContentTypes.FHIR)
  }
}]

async function makeSpineRequest(validQuery: ValidQuery, request: Hapi.Request) {
  const prescriptionIdentifier = getValue(validQuery, QueryParam.FOCUS_IDENTIFIER)
    || getValue(validQuery, QueryParam.IDENTIFIER)
  if (prescriptionIdentifier) {
    return await trackerClient.getPrescription(prescriptionIdentifier, request.headers, request.logger)
  }

  const patientIdentifier = getValue(validQuery, QueryParam.PATIENT_IDENTIFIER)
  if (patientIdentifier) {
    return await trackerClient.getPrescriptions(patientIdentifier, request.headers, request.logger)
  }
}

function getValue(query: ValidQuery, param: QueryParam): string {
  const rawValue = query[param]
  if (!rawValue) {
    return rawValue
  }

  const systemPrefix = queryParamMetadata.get(param) + "|"
  if (rawValue.startsWith(systemPrefix)) {
    return rawValue.substring(systemPrefix.length)
  }

  return rawValue
}

function filterBundleEntries(result: fhir.Bundle, queryParams: ValidQuery) {
  result.entry = result.entry.filter(entry => isTask(entry.resource) && filterTask(entry.resource, queryParams))
}

function filterTask(task: fhir.Task, queryParams: ValidQuery) {
  queryParamMetadata.forEach((metadata, queryParam) => {
    const queryParamValue = getValue(queryParams, queryParam)
    if (queryParamValue && metadata.getTaskField(task) !== queryParamValue) {
      return false
    }
  })
  return true
}
