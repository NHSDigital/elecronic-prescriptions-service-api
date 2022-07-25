import {fhir, validationErrors as errors} from "@models"
import {isReference} from "../../utils/type-guards"
import {getIdentifierValueForSystem} from "../translation/common"
import {getContainedPractitionerRoleViaReference} from "../translation/common/getResourcesOfType"
import {validatePermittedAttendedDispenseMessage} from "./scope-validator"

export function verifyClaim(
  claim: fhir.Claim,
  scope: string,
  accessTokenSDSUserID: string,
  accessTokenSDSRoleID: string
): Array<fhir.OperationOutcomeIssue> {
  if (claim.resourceType !== "Claim") {
    return [errors.createResourceTypeIssue("Claim")]
  }

  const incorrectValueErrors = []

  const practitionerRole = getContainedPractitionerRoleViaReference(
    claim,
    claim.provider.reference
  )
  const {practitioner} = practitionerRole

  if (practitioner && isReference(practitioner)) {
    incorrectValueErrors.push(
      errors.fieldIsReferenceButShouldNotBe('Parameters.parameter("agent").resource.practitioner')
    )
  }

  if (practitioner && !isReference(practitioner)) {
    const bodySDSUserID = getIdentifierValueForSystem(
      [practitioner.identifier],
      "https://fhir.nhs.uk/Id/sds-user-id",
      'claim.contained("PractitionerRole").practitioner.identifier'
    )
    if (bodySDSUserID !== accessTokenSDSUserID) {
      console.warn(
        `SDS Unique User ID does not match between access token and message body.
        Access Token: ${accessTokenSDSRoleID} Body: ${bodySDSUserID}.`
      )
    }
  }

  if (practitionerRole.identifier) {
    const bodySDSRoleID = getIdentifierValueForSystem(
      practitionerRole.identifier,
      "https://fhir.nhs.uk/Id/sds-role-profile-id",
      'claim.contained("PractitionerRole").identifier'
    )
    if (bodySDSRoleID !== accessTokenSDSRoleID) {
      console.warn(
        `SDS Role ID does not match between access token and message body.
        Access Token: ${accessTokenSDSRoleID} Body: ${bodySDSRoleID}.`
      )
    }
  }

  const permissionErrors = validatePermittedAttendedDispenseMessage(scope)
  if (permissionErrors.length) {
    return permissionErrors
  }

  return incorrectValueErrors
}
