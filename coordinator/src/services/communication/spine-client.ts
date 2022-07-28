import {spine} from "@models"
import pino from "pino"
import {StatusCheckResponse} from "../../utils/status"
import {LiveSpineClient} from "./live-spine-client"
import {SandboxSpineClient} from "./sandbox-spine-client"

export interface SpineClient {
  send(request: spine.SpineRequest, logger: pino.Logger): Promise<spine.SpineResponse<unknown>>
  poll(path: string, fromAsid: string, logger: pino.Logger): Promise<spine.SpineResponse<unknown>>
  getStatus(logger: pino.Logger): Promise<StatusCheckResponse>

  // eslint-disable-next-line max-len
  getPrescriptionDocument(request: spine.PrescriptionDocumentRequest, logger: pino.Logger): Promise<spine.SpineDirectResponse<string>>
  // eslint-disable-next-line max-len
  getPrescriptionMetadata(request: spine.PrescriptionMetadataRequest, logger: pino.Logger): Promise<spine.SpineDirectResponse<string>>
}

function getSpineClient(liveMode: boolean): SpineClient {
  return liveMode
    ? new LiveSpineClient()
    : new SandboxSpineClient()
}

export const spineClient = getSpineClient(process.env.SANDBOX !== "1")
