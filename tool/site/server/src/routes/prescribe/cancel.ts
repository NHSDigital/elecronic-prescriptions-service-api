import Hapi from "@hapi/hapi"
import {Bundle} from "fhir/r4"
import {getEpsClient} from "../../services/communication/eps-client"
import {getSessionValue} from "../../services/session"

export default [
  {
    method: "POST",
    path: "/prescribe/cancel",
    handler: async (request: Hapi.Request, responseToolkit: Hapi.ResponseToolkit): Promise<Hapi.ResponseObject> => {
      const cancelRequest = request.payload as Bundle
      const accessToken = getSessionValue("access_token", request)
      const epsClient = getEpsClient(accessToken, request)
      const cancelResponse = await epsClient.makeSendRequest(cancelRequest)
      const cancelResponseHl7 = await epsClient.makeConvertRequest(cancelRequest)
      const success = cancelResponse.statusCode === 200
      return responseToolkit.response({
        success: success,
        request_xml: cancelResponseHl7,
        request: cancelRequest,
        response: cancelResponse.fhirResponse,
        response_xml: cancelResponse.spineResponse
      }).code(200)
    }
  }
]
