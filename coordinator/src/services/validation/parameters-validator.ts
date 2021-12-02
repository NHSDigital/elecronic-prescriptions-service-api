import {fhir, validationErrors as errors} from "@models"
import {validatePermittedAttendedDispenseMessage, validatePermittedUnattendedDispenseMessage} from "./scope-validator"
import {getIdentifierParameterOrNullByName} from "../translation/common"

export function verifyParameters(parameters: fhir.Parameters, scope: string): Array<fhir.OperationOutcomeIssue> {
  if (parameters.resourceType !== "Parameters") {
    return [errors.createResourceTypeIssue("Parameters")]
  }

  const prescriptionIdParameter = getIdentifierParameterOrNullByName(parameters.parameter, "group-identifier")
  const permissionErrors = prescriptionIdParameter
    ? validatePermittedAttendedDispenseMessage(scope)
    : validatePermittedUnattendedDispenseMessage(scope)
  if (permissionErrors.length) {
    return permissionErrors
  }

  return []
}
