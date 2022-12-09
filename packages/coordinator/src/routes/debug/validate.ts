import {fhir} from "@models"
import {BASE_PATH, ContentTypes, externalValidator} from "../util"

export default [
  /*
    Validate a FHIR message using the external FHIR validator.
  */
  {
    method: "POST",
    path: `${BASE_PATH}/$validate`,
    handler: externalValidator(async (request, responseToolkit) => {
      const successfulResponse: fhir.OperationOutcome = {
        resourceType: "OperationOutcome",
        issue: [{
          severity: "information",
          code: fhir.IssueCodes.INFORMATIONAL
        }]
      }
      return responseToolkit.response(successfulResponse).code(200).type(ContentTypes.FHIR)
    })
  }
]
