import * as Hapi from "@hapi/hapi"
import {
  BASE_PATH,
  ContentTypes,
  createHash,
  externalValidator,
  getPayload,
  handleResponse
} from "../util"
import {fhir} from "@models"
import * as translator from "../../services/translation/request"
import {spineClient} from "../../services/communication/spine-client"
import * as taskValidator from "../../services/validation/task-validator"
import {getScope, getSdsRoleProfileId, getSdsUserUniqueId} from "../../utils/headers"
import {getStatusCode} from "../../utils/status-code"

export default [
  /*
    Send a dispense release request to SPINE
  */
  {
    method: "POST",
    path: `${BASE_PATH}/Task`,
    handler: externalValidator(
      async (request: Hapi.Request, responseToolkit: Hapi.ResponseToolkit) => {
        const logger = request.logger
        const taskPayload = getPayload(request) as fhir.Task
        request.log("audit", {"incomingMessageHash": createHash(JSON.stringify(taskPayload))})

        const scope = getScope(request.headers)
        const accessTokenSDSUserID = getSdsUserUniqueId(request.headers)
        const accessTokenSDSRoleID = getSdsRoleProfileId(request.headers)
        const issues = taskValidator.verifyTask(taskPayload, scope, accessTokenSDSUserID, accessTokenSDSRoleID)

        if (issues.length) {
          const response = fhir.createOperationOutcome(issues)
          const statusCode = getStatusCode(issues)
          return responseToolkit.response(response).code(statusCode).type(ContentTypes.FHIR)
        }

        logger.info("Building Spine return / withdraw request")
        const spineRequest = translator.convertTaskToSpineRequest(taskPayload, request.headers, logger)
        const spineResponse = await spineClient.send(spineRequest, request.logger)
        return handleResponse(request, spineResponse, responseToolkit)
      }
    )
  }
]
