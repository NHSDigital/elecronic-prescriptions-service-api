import Hapi from "@hapi/hapi"
import {CONFIG} from "../../config"
import {isDev, isLocal} from "../../services/environment"
import {setSessionValue} from "../../services/session"

export default {
  method: "POST",
  path: "/config",
  handler: async (request: Hapi.Request, h: Hapi.ResponseToolkit): Promise<Hapi.ResponseObject> => {
    if (!isLocal(CONFIG.environment) && !isDev(CONFIG.environment)) {
      return h.response({}).code(400)
    }
    const payload = request.payload as {useSigningMock: boolean, signingPrNumber: string}
    setSessionValue("use_signing_mock", payload.useSigningMock, request)
    setSessionValue("signing_pr_number", payload.signingPrNumber, request)
    return h.response({}).code(200)
  }
}
