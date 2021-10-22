import * as uuid from "uuid"
import axios, {AxiosRequestHeaders, AxiosResponse} from "axios"
import {Bundle, OperationOutcome, Parameters} from "fhir/r4"
import {EpsClient, EpsSendReponse} from "./eps-client"

export class LiveEpsClient implements EpsClient {
  private accessToken: string

  constructor(accessToken: string) {
    this.accessToken = accessToken
  }

  async makePrepareRequest(body: Bundle): Promise<Parameters> {
    return await (await this.makeApiCall("$prepare", body)).data as Parameters
  }

  async makeSendRequest(body: Bundle): Promise<EpsSendReponse> {
    const requestId = uuid.v4()
    // todo: investigate potential eps spike arrest issue preventing
    // 2 requests in quick succession
    // const rawResponseHeaders = {
    //   "x-raw-response": "true"
    // }
    const response = await this.makeApiCall("$process-message", body, requestId)
    const statusCode = response.status
    const fhirResponse = await response.data as OperationOutcome
    const spineResponse = "" /*await (await this.makeApiCall("$process-message", body, requestId, rawResponseHeaders)).data as string*/
    return {statusCode, fhirResponse, spineResponse}
  }

  async makeConvertRequest(body: unknown): Promise<string> {
    return await (await this.makeApiCall("$convert", body)).data as string
  }

  private async makeApiCall(endpoint: string, body?: unknown, requestId?: string, additionalHeaders?: AxiosRequestHeaders): Promise<AxiosResponse> {
    const url = `https://${process.env.APIGEE_DOMAIN_NAME}/electronic-prescriptions/FHIR/R4/${endpoint}`
    let headers: AxiosRequestHeaders = {
      "Authorization": `Bearer ${this.accessToken}`,
      "x-request-id": requestId ?? uuid.v4(),
      "x-correlation-id": uuid.v4()
    }
    if (additionalHeaders) {
      headers = {
        ...headers,
        ...additionalHeaders
      }
    }
    if (body) {
      return await axios.post(url, body, {headers: headers})
    }

    return await axios.get(url, {headers: headers})
  }
}

