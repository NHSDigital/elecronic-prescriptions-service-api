import * as uuid from "uuid"
import axios from "axios"
import {Bundle, Parameters} from "fhir/r4"
import {EpsClient} from "./eps-client"

export class LiveEpsClient implements EpsClient {
  private accessToken = ""

  setAccessToken(accessToken: string): void {
    this.accessToken = accessToken
  }

  async makePrepareRequest(body: Bundle): Promise<Parameters> {
    return await this.makeApiCall("$prepare", body)
  }

  private async makeApiCall(endpoint: string, body?: unknown): Promise<any> {
    const url = `https://${process.env.APIGEE_DOMAIN_NAME}/electronic-prescriptions/FHIR/R4/${endpoint}`
    const headers = {
      "Authorization": `Bearer ${this.accessToken}`,
      "Content-Type": "application/fhir+json; fhirVersion=4.0",
      "x-request-id": uuid.v4(),
      "x-correlation-id": uuid.v4()
    }
    if (body) {
      return (await axios.post(url, body, {headers: headers})).data
    }

    return (await axios.get(url, {headers: headers})).data
  }
}
