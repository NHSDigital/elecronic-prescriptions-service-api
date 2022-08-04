import * as Hapi from "@hapi/hapi"
import {
  BASE_PATH,
  ContentTypes,
  externalValidator,
  getPayload,
  handleResponse
} from "../util"
import {fhir} from "@models"
import * as translator from "../../services/translation/request"
import {spineClient} from "../../services/communication/spine-client"
import * as parametersValidator from "../../services/validation/parameters-validator"
import {getScope, getSdsRoleProfileId, getSdsUserUniqueId} from "../../utils/headers"
import {getStatusCode} from "../../utils/status-code"

export default [
  /*
    Send a dispense release request to SPINE
  */
  {
    method: "POST",
    path: `${BASE_PATH}/Task/$release`,
    handler: externalValidator(
      async (request: Hapi.Request, responseToolkit: Hapi.ResponseToolkit) => {
        const parameters = getPayload(request) as fhir.Parameters
        const scope = getScope(request.headers)
        const accessTokenSDSUserID = getSdsUserUniqueId(request.headers)
        const accessTokenSDSRoleID = getSdsRoleProfileId(request.headers)
        const issues = parametersValidator.verifyParameters(
          parameters,
          scope,
          accessTokenSDSUserID,
          accessTokenSDSRoleID
        )
        if (issues.length) {
          const response = fhir.createOperationOutcome(issues)
          const statusCode = getStatusCode(issues)
          return responseToolkit.response(response).code(statusCode).type(ContentTypes.FHIR)
        }

        const logger = request.logger
        logger.info("Building Spine release request")
        const spineRequest = translator.convertParametersToSpineRequest(
          parameters,
          request.headers
        )
        const spineResponse = await spineClient.send(spineRequest, logger)
        return handleResponse(request, spineResponse, responseToolkit)
      }
    )
  }
]
