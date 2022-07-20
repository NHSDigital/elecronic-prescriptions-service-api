import axios, {AxiosError, AxiosResponse} from "axios"
import pino from "pino"
import {spine} from "@models"
import {addEbXmlWrapper} from "./ebxml-request-builder"
import {SpineClient} from "./spine-client"
import {serviceHealthCheck, StatusCheckResponse} from "../../utils/status"
import Mustache from "mustache"
import * as fs from "fs"
import path from "path"

const SPINE_URL_SCHEME = "https"
const SPINE_ENDPOINT = process.env.SPINE_URL
const SPINE_PATH = "Prescription"
const BASE_PATH = process.env.BASE_PATH

const trackerRequestTemplate = fs.readFileSync(
  path.join(__dirname, "../../resources/tracker_request.mustache"),
  "utf-8"
).replace(/\n/g, "\r\n")

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

  async send(spineRequest: spine.SpineRequest, logger: pino.Logger): Promise<spine.SpineResponse<unknown>> {
    logger.info("Building EBXML wrapper for SpineRequest")
    const wrappedMessage = this.ebXMLBuilder(spineRequest)
    const address = this.getSpineUrlForPrescription()

    logger.info(`Attempting to send message to ${address}`)
    try {
      const result = await axios.post<string>(
        address,
        wrappedMessage,
        {
          headers: {
            "Content-Type": "multipart/related;" +
              " boundary=\"--=_MIME-Boundary\";" +
              " type=text/xml;" +
              " start=ebXMLHeader@spine.nhs.uk",
            "SOAPAction": `urn:nhs:names:services:mm/${spineRequest.interactionId}`,
            "NHSD-Request-ID": spineRequest.messageId
          }
        }
      )
      return LiveSpineClient.handlePollableOrImmediateResponse(result, logger)
    } catch (error) {
      logger.error(`Failed post request for prescription message. Error: ${error}`)
      return LiveSpineClient.handleError(error)
    }
  }

  async track(trackerRequest: spine.TrackerRequest, logger: pino.Logger): Promise<string> {
    const address = this.getSpineUrlForTracker()
    const spineRequest = Mustache.render(trackerRequestTemplate, trackerRequest)

    logger.info(`Attempting to send message to ${address}`)

    logger.info(`Built tracker request:\n${spineRequest}`)

    try {
      const result = await axios.post<string>(
        address,
        spineRequest,
        {
          headers: {
            "SOAPAction": `urn:nhs:names:services:mmquery/QURX_IN000005UK99`
          }
        }
      )

      return result.data
    } catch (error) {
      logger.error(`Failed post request for tracker message. Error: ${error}`)
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
      logger.error(`Failed polling request for polling path ${path}. Error: ${error}`)
      return LiveSpineClient.handleError(error)
    }
  }

  private static handlePollableOrImmediateResponse(
    result: AxiosResponse,
    logger: pino.Logger,
    previousPollingUrl?: string
  ) {
    if (result.status === 200) {
      logger.info("Successful request, returning SpineDirectResponse")
      return {
        body: result.data,
        statusCode: result.status
      }
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

  private static handleError(error: Error): spine.SpineResponse<unknown> {
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

  private getSpineUrlForPrescription() {
    return `${SPINE_URL_SCHEME}://${this.spineEndpoint}/${this.spinePath}`
  }

  private getSpineUrlForTracker() {
    return `${SPINE_URL_SCHEME}://${this.spineEndpoint}/syncservice-mm/mm`
  }

  private getSpineUrlForPolling(path: string) {
    return `${SPINE_URL_SCHEME}://${this.spineEndpoint}/_poll/${path}`
  }

  async getStatus(logger: pino.Logger): Promise<StatusCheckResponse> {
    return serviceHealthCheck(`${SPINE_URL_SCHEME}://${this.spineEndpoint}/healthcheck`, logger)
  }
}
