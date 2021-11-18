import {fhir, validationErrors as errors} from "@models"
import {validatePermittedDispenseMessage} from "./scope-validator"

export function verifyClaim(
  claim: fhir.Claim, scope: string, accessTokenOrg: string
): Array<fhir.OperationOutcomeIssue> {
  const validationErrors = []
  if (claim.resourceType !== "Claim") {
    validationErrors.push(errors.createResourceTypeIssue("Claim"))
  }

  const permissionErrors = validatePermittedDispenseMessage(scope)
  if (permissionErrors.length) {
    return permissionErrors
  }

  if (claim.payee?.party) {
    const bodyOrg = claim.payee.party.identifier.value
    if (bodyOrg !== accessTokenOrg) {
      validationErrors.push(errors.createInconsistentOrganizationIssue("claim.payee.party", accessTokenOrg, bodyOrg))
    }
  }

  return validationErrors
}
