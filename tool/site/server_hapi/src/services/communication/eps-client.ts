import {MockEpsClient} from "./mock-eps-client"
import {LiveEpsClient} from "./live-eps-client"
import {Bundle, FhirResource, Parameters} from "fhir/r4"
import {isLocal} from "../environment"
import {OperationOutcome} from "fhir/r4"

export interface EpsClient {
  makeGetTrackerRequest(query: Record<string, string>): Promise<Bundle | OperationOutcome>
  makePrepareRequest(body: Bundle): Promise<Parameters | OperationOutcome>
  makeSendRequest(body: Bundle): Promise<EpsResponse<OperationOutcome>>
  makeReleaseRequest(body: Parameters): Promise<EpsResponse<Bundle | OperationOutcome>>
  makeConvertRequest(body: FhirResource): Promise<string | OperationOutcome>
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getEpsClient(accessToken: string): EpsClient {
  return isLocal()
    ? new MockEpsClient()
    : new LiveEpsClient(accessToken)
}

export interface EpsResponse<T> {
  statusCode: number,
  fhirResponse: T
  spineResponse: string | OperationOutcome
}
