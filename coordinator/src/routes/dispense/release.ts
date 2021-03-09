import * as Hapi from "@hapi/hapi"
import {basePath, getFhirValidatorErrors, getPayload, toFhirError, handleResponse} from "../util"
import {ResourceTypeError} from "../../models/errors/validation-errors"
import * as fhir from "../../models/fhir"
import * as translator from "../../services/translation/request"
import {spineClient} from "../../services/communication/spine-client"
import {CONTENT_TYPE_FHIR} from "../../app"

export default [
  /*
    Send a dispense release request to SPINE
  */
  {
    method: "POST",
    path: `${basePath}/Task/$release`,
    handler: async (request: Hapi.Request, responseToolkit: Hapi.ResponseToolkit) => {
      const fhirValidatorResponse = await getFhirValidatorErrors(request)
      if (fhirValidatorResponse) {
        return responseToolkit.response(fhirValidatorResponse).code(400).type(CONTENT_TYPE_FHIR)
      }

      const requestPayload = getPayload(request) as fhir.Resource

      if (requestPayload.resourceType !== "Parameters") {
        return responseToolkit
          .response(toFhirError([new ResourceTypeError("Parameters")]))
          .code(400)
          .type(CONTENT_TYPE_FHIR)
      }

      const payloadAsParameters = requestPayload as fhir.Parameters

      request.logger.info("Building Spine release request")
      const spineRequest = await translator.convertParametersToSpineRequest(
        payloadAsParameters,
        request.headers["nhsd-request-id"].toUpperCase(),
        request.logger
      )

      //TODO - remove after testing
      request.logger.info(`Sending the following request to Spine:\n${spineRequest.message}`)

      const spineResponse = await spineClient.send(
        spineRequest,
        request.logger
      )

      return handleResponse(request, spineResponse, responseToolkit)
    }

  } as Hapi.ServerRoute
]
