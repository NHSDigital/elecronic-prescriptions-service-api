import {Request} from "@hapi/hapi"
import Hapi from "@hapi/hapi"
import {spineClient} from "../../services/communication"
import {handleResponse} from "../util"

export default [{
  method: "GET",
  path: "/_poll/{poll_path}",
  handler: async (request: Request, responseToolkit: Hapi.ResponseToolkit): Promise<Hapi.ResponseObject> => {
    const spineResponse = await spineClient.poll(request.params.poll_path, request.logger)
    return handleResponse(request, spineResponse, responseToolkit)
  }
}]
