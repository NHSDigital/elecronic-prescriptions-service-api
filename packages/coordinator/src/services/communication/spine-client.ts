import {spine} from "@models"
import pino from "pino"
import {StatusCheckResponse} from "../../utils/status"
import {LiveSpineClient} from "./live-spine-client"
import {SandboxSpineClient} from "./sandbox-spine-client"
import {MtlsSpineClient} from "./mtls-spine-client"
import {isEpsHostedContainer, isSandbox} from "../../utils/feature-flags"

export interface SpineClient {
  send(request: spine.ClientRequest, fromAsid: string, logger: pino.Logger): Promise<spine.SpineResponse<unknown>>
  poll(path: string, fromAsid: string, logger: pino.Logger): Promise<spine.SpineResponse<unknown>>
  getStatus(logger: pino.Logger): Promise<StatusCheckResponse>
}

export function getSpineClient(): SpineClient {
  if (isEpsHostedContainer()) {
    return new MtlsSpineClient()
  }

  return isSandbox() ? new SandboxSpineClient(): new LiveSpineClient()
}

export const spineClient = getSpineClient()
