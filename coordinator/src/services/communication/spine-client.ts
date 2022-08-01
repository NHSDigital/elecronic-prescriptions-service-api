import {spine} from "@models"
import pino from "pino"
import {StatusCheckResponse} from "../../utils/status"
import {LiveSpineClient} from "./live-spine-client"
import {SandboxSpineClient} from "./sandbox-spine-client"

export interface SpineClient {
  send(request: spine.SpineRequest, logger: pino.BaseLogger): Promise<spine.SpineResponse<unknown>>
  sendSpineRequest(request: spine.HttpRequest, logger: pino.BaseLogger): Promise<spine.SpineDirectResponse<string>>
  poll(path: string, fromAsid: string, logger: pino.BaseLogger): Promise<spine.SpineResponse<unknown>>
  getStatus(logger: pino.BaseLogger): Promise<StatusCheckResponse>
}

function getSpineClient(liveMode: boolean): SpineClient {
  return liveMode
    ? new LiveSpineClient()
    : new SandboxSpineClient()
}

export const spineClient = getSpineClient(process.env.SANDBOX !== "1")
