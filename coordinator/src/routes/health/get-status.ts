import Hapi from "@hapi/hapi"
import axios, {AxiosError} from "axios"
import {VALIDATOR_HOST} from "../util"
import {spineClient} from "../../services/communication/spine-client"
import {odsClient} from "../../services/communication/ods-client"
import pino from "pino"

export interface StatusCheckResponse {
  status: "pass" | "warn" | "error"
  timeout: "true" | "false"
  responseCode: number
  outcome?: string
  links?: string
}

export async function serviceHealthCheck(url: string, logger: pino.Logger): Promise<StatusCheckResponse> {
  try {
    const response = await axios.get<string>(url, {timeout: 20000})
    return {
      status: response.status === 200 ? "pass" : "error",
      timeout: "false",
      responseCode: response.status,
      outcome: response.data,
      links: url
    }
  } catch (error) {
    logger.error("Error calling external service for status check: " + error.message)
    const axiosError = error as AxiosError
    return {
      status: "error",
      timeout: axiosError.code === "ECONNABORTED" ? "true" : "false",
      responseCode: axiosError.response?.status,
      outcome: axiosError.response?.data,
      links: url
    }
  }
}

function createStatusResponse(
  errorStatusCode: number, checks: Record<string, Array<StatusCheckResponse>>, h: Hapi.ResponseToolkit
) {
  let responseStatus = "pass"
  let responseCode = 200
  const allChecks = Object.values(checks).flat()
  if (allChecks.find(check => check.status === "warn")) {
    responseStatus = "warn"
    responseCode = errorStatusCode
  }
  if (allChecks.find(check => check.status === "error")) {
    responseStatus = "error"
    responseCode = errorStatusCode
  }

  return h.response({
    status: responseStatus,
    commitId: process.env.COMMIT_ID,
    checks: checks
  }).code(responseCode)
}

export default [
  {
    method: "GET",
    path: "/_status",
    handler: async (request: Hapi.Request, h: Hapi.ResponseToolkit): Promise<Hapi.ResponseObject> => {
      return createStatusResponse(200, {
        "validator:status": [await serviceHealthCheck(`${VALIDATOR_HOST}/_status`, request.logger)],
        "ods:status": [await odsClient.getStatus(request.logger)],
        "spine:status": [await spineClient.getStatus(request.logger)]
      }, h)
    }
  },
  {
    method: "GET",
    path: "/_healthcheck",
    handler: async (request: Hapi.Request, h: Hapi.ResponseToolkit): Promise<Hapi.ResponseObject> => {
      return createStatusResponse(500, {
        "validator:status": [await serviceHealthCheck(`${VALIDATOR_HOST}/_status`, request.logger)]
      }, h)
    }
  },
  {
    method: "GET",
    path: "/_validatormetrics/{path*}",
    handler: async (request: Hapi.Request, h: Hapi.ResponseToolkit): Promise<Hapi.ResponseObject> => {
      try {
        const url = `${VALIDATOR_HOST}/actuator/metrics/${request.params.path ?? ""}${request.url.search ?? ""}`
        request.logger.info(`Getting validator metrics at ${url}`)

        const response = await axios.get<string>(url, {timeout: 2000})

        if (response.status < 400) {
          return h.response(response.data)
        } else {
          return h.response("Could not get metrics")
        }
      } catch (err) {
        request.logger.error(`Got error when making request for validator metrics: ${err}`)
      }
    }
  }
]
