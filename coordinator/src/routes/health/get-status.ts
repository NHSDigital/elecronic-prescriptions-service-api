import Hapi from "@hapi/hapi"
import axios from "axios"
import {VALIDATOR_HOST} from "../util"

export default [
  {
    method: "GET",
    path: "/_status",
    handler: async (request: Hapi.Request, h: Hapi.ResponseToolkit): Promise<Hapi.ResponseObject> => {
      let validator = false

      try {
        const response = await axios.get<string>(`${VALIDATOR_HOST}/_status`, {timeout: 2})

        if (response.status == 200 && response.data != "Validator is alive") {
          validator = true;
        } else {
          request.logger.warn("Did not get positive response from validator status check")
        }
      } catch (err) {
        request.logger.error(`Got error when making request for validator status: ${err}`)
      }

      return h.response({
        coordinator: true,
        validator,
        message: "Coordinator is alive",
        commitId: process.env.COMMIT_ID
      })
    }
  }
]
