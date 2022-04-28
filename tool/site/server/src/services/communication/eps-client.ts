import * as uuid from "uuid"
import {Bundle, Claim, FhirResource, OperationOutcome, Parameters, Task} from "fhir/r4"
import {isLocal} from "../environment"
import {URLSearchParams} from "url"
import axios, {AxiosRequestHeaders, AxiosResponse} from "axios"
import {CONFIG} from "../../config"
import * as Hapi from "@hapi/hapi"
import {getSessionValue} from "../session"
import {Ping} from "../../routes/health/get-status"
import {DosageTranslationArray} from "../../routes/dose-to-text"

interface EpsResponse<T> {
  statusCode: number,
  fhirResponse: T
  spineResponse?: string
}

class EpsClient {
  async makeGetTrackerRequest(query: Record<string, string | Array<string>>): Promise<Bundle | OperationOutcome> {
    const urlSearchParams = new URLSearchParams()
    Object.keys(query).forEach(key => {
      const valueOrValues = query[key]
      if (typeof valueOrValues === "string") {
        urlSearchParams.append(key, valueOrValues)
      } else {
        valueOrValues.forEach(value => urlSearchParams.append(key, value))
      }
    })
    return (await this.makeApiCall<Bundle | OperationOutcome>("Task", undefined, urlSearchParams)).data
  }

  async makePrepareRequest(body: Bundle): Promise<Parameters | OperationOutcome> {
    return (await this.makeApiCall<Parameters | OperationOutcome>("$prepare", body)).data
  }

  async makeSendRequest(body: Bundle): Promise<EpsResponse<OperationOutcome>> {
    return await this.getEpsResponse("$process-message", body)
  }

  async makeReleaseRequest(body: Parameters): Promise<EpsResponse<Bundle | OperationOutcome>> {
    return await this.getEpsResponse("Task/$release", body)
  }

  async makeVerifyRequest(body: Bundle): Promise<EpsResponse<Parameters | OperationOutcome>> {
    return await this.getEpsResponse("$verify-signature", body)
  }

  async makeReturnRequest(body: Task): Promise<EpsResponse<OperationOutcome>> {
    return await this.getEpsResponse("Task", body)
  }

  async makeWithdrawRequest(body: Task): Promise<EpsResponse<OperationOutcome>> {
    return await this.getEpsResponse("Task", body)
  }

  async makeClaimRequest(body: Claim): Promise<EpsResponse<OperationOutcome>> {
    return await this.getEpsResponse("Claim", body)
  }

  async makePingRequest(): Promise<Ping> {
    const basePath = this.getBasePath()
    const url = `${CONFIG.privateApigeeUrl}/${basePath}/_ping`
    return (await axios.get<Ping>(url)).data
  }

  async makeValidateRequest(body: FhirResource): Promise<EpsResponse<OperationOutcome>> {
    const requestId = uuid.v4()
    const response = await this.makeApiCall<OperationOutcome>("$validate", body, undefined, requestId, {"x-show-validation-warnings": "true"})
    const statusCode = response.status
    const fhirResponse = response.data
    return {statusCode, fhirResponse}
  }

  async makeConvertRequest(body: FhirResource): Promise<string> {
    const response = (await this.makeApiCall<string | OperationOutcome>("$convert", body)).data
    return typeof response === "string" ? response : JSON.stringify(response, null, 2)
  }

  async makeDoseToTextRequest(body: FhirResource): Promise<EpsResponse<DosageTranslationArray>> {
    const requestId = uuid.v4()
    const response = await this.makeApiCall<DosageTranslationArray>("$dose-to-text", body, undefined, requestId)
    const statusCode = response.status
    const doseToTextResponse = response.data
    return {statusCode, fhirResponse: doseToTextResponse}
  }

  private async getEpsResponse<T>(endpoint: string, body: FhirResource) {
    const requestId = uuid.v4()
    const response = await this.makeApiCall<T>(endpoint, body, undefined, requestId)
    const statusCode = response.status
    const fhirResponse = response.data
    const spineResponse = (await this.makeApiCall<string | OperationOutcome>(endpoint, body, undefined, requestId, {"x-raw-response": "true"})).data
    return {statusCode, fhirResponse, spineResponse: this.asString(spineResponse)}
  }

  private async makeApiCall<T>(
    path: string,
    body?: unknown,
    params?: URLSearchParams,
    requestId?: string,
    additionalHeaders?: AxiosRequestHeaders
  ): Promise<AxiosResponse<T>> {
    const basePath = this.getBasePath()
    const url = `${CONFIG.privateApigeeUrl}/${basePath}/FHIR/R4/${path}`
    const headers: AxiosRequestHeaders = this.getHeaders(requestId)
    if (additionalHeaders) {
      Object.assign(headers, additionalHeaders)
    }

    return axios.request({
      url,
      method: body ? "POST" : "GET",
      headers,
      data: body,
      params
    })
  }

  protected getBasePath() {
    return `${CONFIG.basePath}`.replace("eps-api-tool", "electronic-prescriptions")
  }

  protected getHeaders(requestId: string | undefined): AxiosRequestHeaders {
    return {
      "x-request-id": requestId ?? uuid.v4(),
      "x-correlation-id": uuid.v4()
    }
  }

  private asString(response: string | OperationOutcome): string {
    return typeof response === "string" ? response : JSON.stringify(response, null, 2)
  }
}

// Note derived classes cannot be in separate files due to circular reference issues with typescript
// See these GitHub issues: https://github.com/Microsoft/TypeScript/issues/20361, #4149, #10712
class SandboxEpsClient extends EpsClient {
  constructor() {
    super()
  }

  override makePingRequest(): Promise<Ping> {
    return Promise.resolve({
      commitId: "",
      releaseId: "",
      revision: "",
      version: "internal-dev-sandbox"
    })
  }
}

class LiveEpsClient extends EpsClient {
  private accessToken: string
  private request: Hapi.Request

  constructor(accessToken: string, request: Hapi.Request) {
    super()
    this.accessToken = accessToken
    this.request = request
  }

  protected override getBasePath(): string {
    const prNumber = getSessionValue("eps_pr_number", this.request)
    return prNumber
      ? `electronic-prescriptions-pr-${prNumber}`
      : `${CONFIG.basePath}`.replace("eps-api-tool", "electronic-prescriptions")
  }

  protected override getHeaders(requestId: string | undefined): AxiosRequestHeaders {
    return {
      "Authorization": `Bearer ${this.accessToken}`,
      "x-request-id": requestId ?? uuid.v4(),
      "x-correlation-id": uuid.v4()
    }
  }
}

export function getEpsClient(accessToken: string, request: Hapi.Request): EpsClient {
  return isLocal(CONFIG.environment)
    ? new SandboxEpsClient()
    : new LiveEpsClient(accessToken, request)
}
