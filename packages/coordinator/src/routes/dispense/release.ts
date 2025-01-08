import * as Hapi from "@hapi/hapi"
import {
  BASE_PATH,
  ContentTypes,
  externalValidator,
  getPayload,
  handleResponse
} from "../util"
import {createHash} from "../create-hash"
import {fhir} from "@models"
import * as translator from "../../services/translation/request"
import {spineClient} from "../../services/communication/spine-client"
import * as parametersValidator from "../../services/validation/parameters-validator"
import {
  getAsid,
  getScope,
  getSdsRoleProfileId,
  getSdsUserUniqueId
} from "../../utils/headers"
import {getStatusCode} from "../../utils/status-code"
import {HashingAlgorithm} from "../../services/translation/common/hashingAlgorithm"
import {RouteDefMethods} from "@hapi/hapi"

export default [
  /*
    Send a dispense release request to SPINE
  */
  {
    method: "POST" as RouteDefMethods,
    path: `${BASE_PATH}/Task/$release`,
    handler: externalValidator(async (request: Hapi.Request, responseToolkit: Hapi.ResponseToolkit) => {
      const logger = request.logger
      const parameters = getPayload(request) as fhir.Parameters
      request.log("audit", {incomingMessageHash: createHash(JSON.stringify(parameters), HashingAlgorithm.SHA256)})

      const scope = getScope(request.headers)
      const accessTokenSDSUserID = getSdsUserUniqueId(request.headers)
      const accessTokenSDSRoleID = getSdsRoleProfileId(request.headers)
      const issues = parametersValidator.verifyParameters(parameters, scope, accessTokenSDSUserID, accessTokenSDSRoleID)

      if (issues.length) {
        const response = fhir.createOperationOutcome(issues, parameters.meta?.lastUpdated)
        const statusCode = getStatusCode(issues)
        return responseToolkit.response(response).code(statusCode).type(ContentTypes.FHIR)
      }

      logger.info("Building Spine release request")
      const spineRequest = translator.convertParametersToSpineRequest(parameters, request.headers, logger)
      const spineResponse = await spineClient.send(spineRequest, getAsid(request.headers), request.logger)
      return await handleResponse(request, spineResponse, responseToolkit)
    })
  }
]
