import {spine} from "@models"
import axios, {AxiosError, AxiosResponse, RawAxiosRequestHeaders} from "axios"
import pino from "pino"
import {serviceHealthCheck, StatusCheckResponse} from "../../utils/status"
import {addEbXmlWrapper} from "./ebxml-request-builder"
import {SpineClient} from "./spine-client"

const SPINE_URL_SCHEME = "https"
const SPINE_ENDPOINT = process.env.SPINE_URL
const SPINE_PATH = "Prescription"
const BASE_PATH = process.env.BASE_PATH

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

export class LiveSpineClient implements SpineClient {
  private readonly spineEndpoint: string
  private readonly spinePath: string
  private readonly ebXMLBuilder: (spineRequest: spine.SpineRequest) => string

  constructor(
    spineEndpoint: string = null,
    spinePath: string = null,
    ebXMLBuilder: (spineRequest: spine.SpineRequest) => string = null
  ) {
    this.spineEndpoint = spineEndpoint || SPINE_ENDPOINT
    this.spinePath = spinePath || SPINE_PATH
    this.ebXMLBuilder = ebXMLBuilder || addEbXmlWrapper
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
      logger.info(`Attempting to send message to ${address}`)

      const response = await axios.post<string>(
        address,
        body,
        {
          headers: headers
        }
      )
      return LiveSpineClient.handlePollableOrImmediateResponse(response, logger)
    } catch (error) {
      // todo: this log line is req.name for tracker request but not for spine client request
      // to work out how to log both, request.name maps to the wrong object
      //logger.error(`Failed post request for ${request.name}. Error: ${error}`)
      let responseToLog
      if (error.response) {
        responseToLog = {
          data: error.response.data,
          status: error.response.status,
          headers: error.response.headers
        }
      }
      logger.error({error, response: responseToLog}, `Failed post request for spine client send. Error: ${error}`)
      return LiveSpineClient.handleError(error)
    }
  }

  async poll(path: string, fromAsid: string, logger: pino.Logger): Promise<spine.SpineResponse<unknown>> {
    const address = this.getSpineUrlForPolling(path)

    logger.info(`Attempting to send polling message to ${address}`)

    try {
      const result = await axios.get<string>(
        address,
        {
          headers: {
            "nhsd-asid": fromAsid
          }
        }
      )
      return LiveSpineClient.handlePollableOrImmediateResponse(result, logger, `/_poll/${path}`)
    } catch (error) {
      let responseToLog
      if (error.response) {
        responseToLog = {
          data: error.response.data,
          status: error.response.status,
          headers: error.response.headers
        }
      }
      if (error.response.status === 500) {
        // treat a 500 response as a 202 response
        logger.warn({response: responseToLog}, `500 response received from polling path ${path}`)
        return LiveSpineClient.handlePollableOrImmediateResponse({
          data: {},
          status: 202,
          statusText: "Accepted",
          headers: {},
          config: error.response.config
        }, logger, `/_poll/${path}`)
      }
      logger.error({error, response: responseToLog}, `Failed polling request for polling path ${path}. Error: ${error}`)
      return LiveSpineClient.handleError(error)
    }
  }

  private static handlePollableOrImmediateResponse(
    result: AxiosResponse,
    logger: pino.Logger,
    previousPollingUrl?: string
  ) {
    if (result.status === 200) {
      return this.handleImmediateResponse(result, logger)
    }

    if (result.status === 202) {
      logger.info("Successful request, returning SpinePollableResponse")
      const contentLocation = result.headers["content-location"]
      const relativePollingUrl = contentLocation ? contentLocation : previousPollingUrl
      logger.info(`Got content location ${contentLocation}. Using polling URL ${relativePollingUrl}`)
      return {
        pollingUrl: `${BASE_PATH}${relativePollingUrl}`,
        statusCode: result.status
      }
    }

    logger.error(`Got the following response from spine:\n${result.data}`)
    throw Error(`Unsupported status, expected 200 or 202, got ${result.status}`)
  }

  private static handleImmediateResponse(
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
    return `${SPINE_URL_SCHEME}://${this.spineEndpoint}/${requestPath}`
  }

  private getSpineUrlForPrescription() {
    return this.getSpineEndpoint(this.spinePath)
  }

  private getSpineUrlForTracker() {
    return this.getSpineEndpoint("syncservice-mm/mm")
  }

  private getSpineUrlForPolling(path: string) {
    return this.getSpineEndpoint(`_poll/${path}`)
  }

  async getStatus(logger: pino.Logger): Promise<StatusCheckResponse> {
    const url = this.getSpineEndpoint(`healthcheck`)
    return serviceHealthCheck(url, logger, undefined)
  }
}
