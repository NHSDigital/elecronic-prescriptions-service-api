import Hapi from "@hapi/hapi"
import * as fhir from "fhir/r4"
import {getEpsClient} from "../../services/communication/eps-client"
import {getApigeeAccessTokenFromSession} from "../../services/session"

export default [
  {
    method: "POST",
    path: "/api/convert",
    handler: async (request: Hapi.Request, responseToolkit: Hapi.ResponseToolkit): Promise<Hapi.ResponseObject> => {
      const resource = request.payload as fhir.FhirResource

      const accessToken = getApigeeAccessTokenFromSession(request)
      const epsClient = getEpsClient(accessToken, request)

      request.logger.debug(`Received Resource with id: ${resource.id}. Sending to Convert.`)
      const convertedResource = await epsClient.makeConvertRequest(resource)
      request.logger.debug(`Converted ${resource.id}`)

      return responseToolkit.response(convertedResource).code(200)
    }
  }
]
