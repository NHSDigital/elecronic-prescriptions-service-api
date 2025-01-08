import {fhir, spine} from "@models"
import axios, {AxiosError, AxiosResponse, RawAxiosRequestHeaders} from "axios"
import pino from "pino"
import {serviceHealthCheck, StatusCheckResponse} from "../../utils/status"
import {addEbXmlWrapper} from "./ebxml-request-builder"
import {SpineClient} from "./spine-client"
import {Agent} from "https"

const SPINE_URL_SCHEME = "https"
const SPINE_ENDPOINT = process.env.TARGET_SPINE_SERVER
const SPINE_PATH = "Prescription"

const getClientRequestHeaders = (interactionId: string, messageId: string) => {
  return {
    "Content-Type": "multipart/related;" +
      " boundary=\"--=_MIME-Boundary\";" +
      " type=text/xml;" +
      " start=ebXMLHeader@spine.nhs.uk",
    "SOAPAction": `urn:nhs:names:services:mm/${interactionId}`,
    "NHSD-Request-ID": messageId
  }
}

export class MtlsSpineClient implements SpineClient {
  private readonly spineEndpoint: string
  private readonly spinePath: string
  private readonly ebXMLBuilder: (spineRequest: spine.SpineRequest) => string
  private httpsAgent: Agent

  constructor(
    spineEndpoint: string = null,
    spinePath: string = null,
    ebXMLBuilder: (spineRequest: spine.SpineRequest) => string = null
  ) {
    this.spineEndpoint = spineEndpoint || SPINE_ENDPOINT
    this.spinePath = spinePath || SPINE_PATH
    this.ebXMLBuilder = ebXMLBuilder || addEbXmlWrapper

    this.initHttpsAgent()
  }

  private initHttpsAgent() {
    const privateKey = process.env.SpinePrivateKey
    const publicCert = process.env.SpinePublicCertificate
    const caChain = process.env.SpineCAChain

    this.httpsAgent = new Agent({
      key: privateKey,
      cert: publicCert,
      ca: caChain,
      rejectUnauthorized: true
    })
  }

  private prepareSpineRequest(req: spine.ClientRequest): {
    address: string,
    body: string,
    headers: RawAxiosRequestHeaders
  } {
    if (spine.isTrackerRequest(req)) {
      return {
        address: this.getSpineUrlForTracker(),
        body: req.body,
        headers: req.headers
      }
    } else {
      return {
        address: this.getSpineUrlForPrescription(),
        body: this.ebXMLBuilder(req),
        headers: getClientRequestHeaders(req.interactionId, req.messageId)
      }
    }
  }

  async send(req: spine.ClientRequest, fromAsid: string, logger: pino.Logger): Promise<spine.SpineResponse<unknown>> {
    const {address, body, headers} = this.prepareSpineRequest(req)

    try {
      logger.info({headers}, `Attempting to send message to ${address}`)

      const response = await axios.post<string>(
        address,
        body,
        {
          headers: headers,
          httpsAgent: this.httpsAgent
        }
      )
      return await this.handlePollableOrImmediateResponse(response, logger, fromAsid, 0)
    } catch (error) {
      let responseToLog
      if (error.response) {
        responseToLog = {
          data: error.response.data,
          status: error.response.status,
          headers: error.response.headers
        }
      }
      logger.error({error, response: responseToLog}, `Failed post request for spine client send. Error: ${error}`)
      return MtlsSpineClient.handleError(error)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async poll(path: string, fromAsid: string, logger: pino.Logger): Promise<spine.SpineResponse<unknown>> {
    return notSupportedOperationOutcomePromise()
  }

  private async handlePollableResponse(
    path: string,
    fromAsid: string,
    pollCount: number,
    logger: pino.Logger): Promise<spine.SpineResponse<unknown>> {
    const address = this.getSpineUrlForPolling(path)

    logger.info(`Attempting to send polling message to ${address}`)

    try {
      const result = await axios.get<string>(
        address,
        {
          headers: {
            "nhsd-asid": fromAsid
          },
          httpsAgent: this.httpsAgent
        }
      )
      return await this.handlePollableOrImmediateResponse(result, logger, fromAsid, pollCount + 1, path)
    } catch (error) {
      let responseToLog
      if (error.response) {
        responseToLog = {
          data: error.response.data,
          status: error.response.status,
          headers: error.response.headers
        }
      }
      logger.error({error, response: responseToLog}, `Failed polling request for polling path ${path}. Error: ${error}`)
      return MtlsSpineClient.handleError(error)
    }
  }

  private async handlePollableOrImmediateResponse(
    result: AxiosResponse,
    logger: pino.Logger,
    fromAsid: string,
    pollCount: number,
    previousPollingUrl?: string
  ) {
    if (result.status === 200) {
      return this.handleImmediateResponse(result, logger)
    }

    if (result.status === 202) {
      if (pollCount > 6) {
        const errorMessage = "No response to poll after 6 attempts"
        logger.error(errorMessage)
        return {
          body: timeoutOperationOutcome,
          statusCode: 500
        }
      }
      logger.info("Received pollable response")
      const contentLocation = result.headers["content-location"]
      const relativePollingUrl = contentLocation ? contentLocation : previousPollingUrl
      logger.info(`Got content location ${contentLocation}. Calling polling URL ${relativePollingUrl}`)
      if (previousPollingUrl) {
        logger.info(`Waiting 5 seconds before polling again. Attempt ${pollCount}`)
        await delay(5000)
      } else {
        logger.info("First call so delay 0.5 seconds before checking result")
        await delay(500)
      }
      return await this.handlePollableResponse(relativePollingUrl, fromAsid, pollCount, logger)
    }

    logger.error({
      result: {headers: result.headers, data: result.data}
    }, "Received unexpected result from spine")
    throw Error(`Unsupported status, expected 200 or 202, got ${result.status}`)
  }

  private handleImmediateResponse(
    result: AxiosResponse,
    logger: pino.Logger
  ) {
    logger.info("Successful request, returning SpineDirectResponse")
    return {
      body: result.data,
      statusCode: result.status
    }
  }

  private static handleError(error: Error): spine.SpineDirectResponse<unknown> {
    const axiosError = error as AxiosError
    if (axiosError.response) {
      return {
        body: axiosError.response.data,
        statusCode: axiosError.response.status
      }
    } else {
      return {
        body: axiosError.message,
        statusCode: 500
      }
    }
  }

  private getSpineEndpoint(requestPath?: string) {
    const sanitizedPath = requestPath ? encodeURIComponent(requestPath) : ""
    return `${SPINE_URL_SCHEME}://${this.spineEndpoint}/${sanitizedPath}`
  }

  private getSpineUrlForPrescription() {
    return this.getSpineEndpoint(this.spinePath)
  }

  private getSpineUrlForTracker() {
    return this.getSpineEndpoint("syncservice-mm/mm")
  }

  private getSpineUrlForPolling(requestPath: string) {
    return `${SPINE_URL_SCHEME}://${this.spineEndpoint}${requestPath}`
  }

  async getStatus(logger: pino.Logger): Promise<StatusCheckResponse> {
    const url = this.getSpineEndpoint(`healthcheck`)
    return serviceHealthCheck(url, logger, this.httpsAgent)
  }
}

function delay(ms: number) {
  return new Promise( resolve => setTimeout(resolve, ms) )
}

const notSupportedOperationOutcome: fhir.OperationOutcome = {
  resourceType: "OperationOutcome",
  issue: [
    {
      code: fhir.IssueCodes.INFORMATIONAL,
      severity: "information",
      details: {
        coding: [
          {
            code: "INTERACTION_NOT_SUPPORTED_BY_MTLS_CLIENT",
            display: "Interaction not supported by mtls client",
            system: "https://fhir.nhs.uk/R4/CodeSystem/Spine-ErrorOrWarningCode",
            version: "1"
          }
        ]
      }
    }
  ]
}

const timeoutOperationOutcome: fhir.OperationOutcome = {
  resourceType: "OperationOutcome",
  issue: [
    {
      code: fhir.IssueCodes.EXCEPTION,
      severity: "error",
      details: {
        coding: [
          {
            code: "TIMEOUT",
            display: "Timeout waiting for response",
            system: "https://fhir.nhs.uk/R4/CodeSystem/Spine-ErrorOrWarningCode",
            version: "1"
          }
        ]
      }
    }
  ]
}
function notSupportedOperationOutcomePromise(): Promise<spine.SpineResponse<fhir.OperationOutcome>> {
  return Promise.resolve({
    statusCode: 400,
    body: notSupportedOperationOutcome
  })
}
