import * as translator from "../../services/translation/request"
import Hapi from "@hapi/hapi"
import {
  BASE_PATH,
  ContentTypes,
  externalValidator,
  getPayload
} from "../util"
import {fhir} from "@models"
import * as bundleValidator from "../../services/validation/bundle-validator"
import * as parametersValidator from "../../services/validation/parameters-validator"
import * as taskValidator from "../../services/validation/task-validator"
import * as claimValidator from "../../services/validation/claim-validator"
import {
  isBundle,
  isClaim,
  isParameters,
  isTask
} from "../../utils/type-guards"
import {getScope, getSdsRoleProfileId, getSdsUserUniqueId} from "../../utils/headers"
import {getStatusCode} from "../../utils/status-code"
import {getLogger} from "../../services/logging/logger"

export default [
  /*
    Convert a FHIR message into an HL7 V3 message.
  */
  {
    method: "POST",
    path: `${BASE_PATH}/$convert`,
    handler: externalValidator(
      async (request: Hapi.Request, responseToolkit: Hapi.ResponseToolkit) => {
        const payload = getPayload(request) as fhir.Resource
        const scope = getScope(request.headers)
        const accessTokenSDSUserID = getSdsUserUniqueId(request.headers)
        const accessTokenSDSRoleID = getSdsRoleProfileId(request.headers)
        if (isBundle(payload)) {
          const issues = bundleValidator.verifyBundle(payload, scope, accessTokenSDSUserID, accessTokenSDSRoleID
          )
          if (issues.length) {
            const response = fhir.createOperationOutcome(issues)
            const statusCode = getStatusCode(issues)
            return responseToolkit.response(response).code(statusCode).type(ContentTypes.FHIR)
          }
          const logger = getLogger(request.logger)
          logger.info("Building HL7V3 message from Bundle")
          const spineRequest = await translator.convertBundleToSpineRequest(payload, request.headers, logger)
          return responseToolkit.response(spineRequest.message).code(200).type(ContentTypes.XML)
        }

        if (isParameters(payload)) {
          const issues = parametersValidator.verifyParameters(payload, scope, accessTokenSDSUserID, accessTokenSDSRoleID
          )
          if (issues.length) {
            const response = fhir.createOperationOutcome(issues)
            const statusCode = getStatusCode(issues)
            return responseToolkit.response(response).code(statusCode).type(ContentTypes.FHIR)
          }

          request.logger.info("Building HL7V3 message from Parameters")
          const spineRequest = translator.convertParametersToSpineRequest(
            payload,
            request.headers
          )
          return responseToolkit.response(spineRequest.message).code(200).type(ContentTypes.XML)
        }

        if (isTask(payload)) {
          const issues = taskValidator.verifyTask(payload, scope, accessTokenSDSUserID, accessTokenSDSRoleID)
          if (issues.length) {
            const response = fhir.createOperationOutcome(issues)
            const statusCode = getStatusCode(issues)
            return responseToolkit.response(response).code(statusCode).type(ContentTypes.FHIR)
          }

          request.logger.info("Building HL7V3 message from Task")
          const spineRequest = translator.convertTaskToSpineRequest(payload, request.headers)
          return responseToolkit.response(spineRequest.message).code(200).type(ContentTypes.XML)
        }

        if (isClaim(payload)) {
          const issues = claimValidator.verifyClaim(payload, scope, accessTokenSDSUserID, accessTokenSDSRoleID)
          if (issues.length) {
            const response = fhir.createOperationOutcome(issues)
            const statusCode = getStatusCode(issues)
            return responseToolkit.response(response).code(statusCode).type(ContentTypes.FHIR)
          }

          request.logger.info("Building HL7V3 message from Claim")
          const spineRequest = translator.convertClaimToSpineRequest(payload, request.headers)
          return responseToolkit.response(spineRequest.message).code(200).type(ContentTypes.XML)
        }

        return responseToolkit.response(unsupportedResponse).code(400).type(ContentTypes.FHIR)
      }
    )
  }
]

const unsupportedResponse: fhir.OperationOutcome = {
  resourceType: "OperationOutcome",
  issue: [{
    severity: "fatal",
    code: fhir.IssueCodes.INVALID,
    diagnostics: "Message not supported by $convert endpoint"
  }]
}
