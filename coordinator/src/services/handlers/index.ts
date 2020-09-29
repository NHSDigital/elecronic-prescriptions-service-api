import {LiveRequestHandler} from "./spine-handler"
import {SandboxRequestHandler} from "./sandbox-handler"
import {SpineRequest,SpineResponse} from "../../models/spine"

export interface RequestHandler {
  send(spineRequest: SpineRequest): Promise<SpineResponse<unknown>>
  poll(path: string): Promise<SpineResponse<unknown>>
}

function getHandler(liveMode: boolean): RequestHandler {
  return liveMode
    ? new LiveRequestHandler()
    : new SandboxRequestHandler()
}

export const requestHandler = getHandler(process.env.SANDBOX !== "1")
