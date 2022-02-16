import * as uuid from "uuid"
import axios from "axios"
import {Parameters} from "fhir/r4"
import jwt from "jsonwebtoken"
import {SigningClient} from "./signing-client"
import {CONFIG} from "../../config"
import Hapi from "@hapi/hapi"
import {getSessionValue} from "../session"
import {isDev} from "../environment"
import {getPrNumber} from "../../routes/helpers"
import {Ping} from "../../routes/health/get-status"

export class LiveSigningClient implements SigningClient {
  private request: Hapi.Request
  private accessToken: string

  constructor(request: Hapi.Request, accessToken: string) {
    this.request = request
    this.accessToken = accessToken
  }

  async uploadSignatureRequest(prepareResponses: Parameters[]): Promise<any> {
    const baseUrl = this.getBaseUrl()
    const stateJson = {prNumber: getPrNumber(CONFIG.basePath)}
    const stateString = JSON.stringify(stateJson)
    const state = Buffer.from(stateString, "utf-8").toString("base64")
    const url = `${baseUrl}/signaturerequest?state=${state}`
    const headers = {
      "Authorization": `Bearer ${this.accessToken}`,
      "Content-Type": "text/plain",
      "x-request-id": uuid.v4(),
      "x-correlation-id": uuid.v4()
    }

    const payload = {
      payloads: prepareResponses.map(pr => {
        return {
          id: uuid.v4(),
          payload: pr.parameter?.find(p => p.name === "digest")?.valueString
        }
      }),
      algorithm: prepareResponses[0].parameter?.find(p => p.name === "algorithm")?.valueString
    }

    const body = jwt.sign(payload, LiveSigningClient.getPrivateKey(CONFIG.privateKey), {
      algorithm: "RS512",
      keyid: CONFIG.keyId,
      issuer: CONFIG.clientId,
      subject: CONFIG.subject,
      audience: this.getBaseUrl(true),
      expiresIn: 600
    })

    return (await axios.post(url, body, {headers: headers})).data
  }

  async makeSignatureDownloadRequest(token: string): Promise<any> {
    const baseUrl = this.getBaseUrl()
    const url = `${baseUrl}/signatureresponse/${token}`
    const headers = {
      "Authorization": `Bearer ${this.accessToken}`,
      "x-request-id": uuid.v4(),
      "x-correlation-id": uuid.v4()
    }
    return (await axios.get(url, {
      headers: headers
    })).data
  }

  async makePingRequest(): Promise<Ping> {
    const baseUrl = this.getBaseUrl()
    const url = `${baseUrl}/_ping`
    return (await axios.get<Ping>(url)).data
  }

  private static getPrivateKey(private_key_secret: string) {
    while (private_key_secret.length % 4 !== 0) {
      private_key_secret += "="
    }
    return Buffer.from(private_key_secret, "base64").toString("utf-8")
  }

  private getBaseUrl(isPublic = false) {
    const apigeeUrl = isPublic ? CONFIG.publicApigeeUrl : CONFIG.privateApigeeUrl
    const signingPrNumber = isDev(CONFIG.environment) ? getSessionValue("signing_pr_number", this.request) : undefined
    const signingBasePath = signingPrNumber ? `signing-service-pr-${signingPrNumber}` : "signing-service"
    return `${apigeeUrl}/${signingBasePath}`
  }
}
