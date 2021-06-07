import {Request} from "@hapi/hapi"
import Hapi from "@hapi/hapi"
import {spineClient} from "../../services/communication/spine-client"
import {handleResponse} from "../util"
import {getAsid} from "../../services/headers"

export default [{
  method: "GET",
  path: "/_poll/{poll_path}",
  handler: async (request: Request, responseToolkit: Hapi.ResponseToolkit): Promise<Hapi.ResponseObject> => {
    const spineResponse = await spineClient.poll(
      request.params.poll_path,
      getAsid(request.headers),
      request.logger
    )
    return handleResponse(request, spineResponse, responseToolkit)
  }
}]
