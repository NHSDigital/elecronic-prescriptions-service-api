import * as translator from "../../services/translation/request"
import Hapi, {RouteDefMethods} from "@hapi/hapi"
import {
  BASE_PATH,
  ContentTypes,
  externalValidator,
  getPayload
} from "../util"
import {createHash} from "../create-hash"
import {fhir} from "@models"
import * as bundleValidator from "../../services/validation/bundle-validator"
import {
  getScope,
  getSdsRoleProfileId,
  getSdsUserUniqueId,
  getApplicationId
} from "../../utils/headers"
import {getStatusCode} from "../../utils/status-code"
import {HashingAlgorithm} from "../../services/translation/common/hashingAlgorithm"

export default [
  /*
      Convert a FHIR prescription into the HL7 V3 signature fragments to be signed by the prescriber.
    */
  {
    method: "POST" as RouteDefMethods,
    path: `${BASE_PATH}/$prepare`,
    handler: externalValidator(async (request: Hapi.Request, responseToolkit: Hapi.ResponseToolkit) => {
      const bundle = getPayload(request) as fhir.Bundle
      const scope = getScope(request.headers)
      const accessTokenSDSUserID = getSdsUserUniqueId(request.headers)
      const accessTokenSDSRoleID = getSdsRoleProfileId(request.headers)
      const applicationId = getApplicationId(request.headers)
      const issues = bundleValidator.verifyBundle(bundle, scope, accessTokenSDSUserID, accessTokenSDSRoleID)
      if (issues.length) {
        request.log("info", {verifyBundleIssues: issues})
        const response = fhir.createOperationOutcome(issues, bundle.meta?.lastUpdated)
        const statusCode = getStatusCode(issues)
        return responseToolkit.response(response).code(statusCode).type(ContentTypes.FHIR)
      }

      request.logger.info("Encoding HL7V3 signature fragments")

      const response = await translator.convertFhirMessageToSignedInfoMessage(bundle, applicationId, request.logger)
      request.log("audit", {incomingMessageHash: createHash(JSON.stringify(bundle), HashingAlgorithm.SHA256)})
      request.log("audit", {PrepareEndpointResponse: response})

      return responseToolkit.response(response).code(200).type(ContentTypes.FHIR)
    })
  }
]
