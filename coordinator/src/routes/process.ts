import * as translator from "../services/translation/request"
import {spineClient} from "../services/communication/spine-client"
import Hapi from "@hapi/hapi"
import {
  BASE_PATH, ContentTypes, createHash,
  externalValidator, getPayload, handleResponse
} from "./util"
import {fhir} from "@models"
import * as bundleValidator from "../services/validation/bundle-validator"

export default [
  /*
      Send a signed message on to SPINE.
    */
  {
    method: "POST",
    path: `${BASE_PATH}/$process-message`,
    handler: externalValidator(
      async (request: Hapi.Request, responseToolkit: Hapi.ResponseToolkit) => {
        const bundle = getPayload(request) as fhir.Bundle
        const issues = bundleValidator.verifyBundle(bundle)
        if (issues.length) {
          return responseToolkit.response(fhir.createOperationOutcome(issues)).code(400).type(ContentTypes.FHIR)
        }

        request.logger.info("Building Spine request")
        const spineRequest = await translator.convertBundleToSpineRequest(bundle, request.headers, request.logger)
        request.log("audit", {"incomingMessageHash": createHash(JSON.stringify(bundle))})
        const spineResponse = await spineClient.send(spineRequest, request.logger)
        return handleResponse(request, spineResponse, responseToolkit)
      }
    )
  }
]
