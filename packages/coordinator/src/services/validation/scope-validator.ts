import {getDispenseEnabled, getPrescribeEnabled} from "../../utils/feature-flags"
import {validationErrors as errors, fhir} from "@models"

export const PRESCRIBING_USER_SCOPE = "urn:nhsd:apim:user-nhs-id:aal3:electronic-prescription-service-api:prescribing"
export const AWS_PRESCRIBING_USER_SCOPE = "urn:nhsd:apim:user-nhs-id:aal3:fhir-prescribing"
export const PRESCRIBING_APP_SCOPE = "urn:nhsd:apim:app:level3:electronic-prescription-service-api:prescribing"
export const DISPENSING_USER_SCOPE = "urn:nhsd:apim:user-nhs-id:aal3:electronic-prescription-service-api:dispensing"
export const AWS_DISPENSING_USER_SCOPE = "urn:nhsd:apim:user-nhs-id:aal3:fhir-dispensing"
export const DISPENSING_APP_SCOPE = "urn:nhsd:apim:app:level3:electronic-prescription-service-api:dispensing"
export const TRACKER_USER_SCOPE = "urn:nhsd:apim:user-nhs-id:aal3:electronic-prescription-service-api:tracker"
export const TRACKER_APP_SCOPE = "urn:nhsd:apim:app:level3:electronic-prescription-service-api:tracker"

export function validatePermittedPrescribeMessage(scope: string): Array<fhir.OperationOutcomeIssue> {
  if (!getPrescribeEnabled()) {
    return [errors.createDisabledFeatureIssue("Prescribing")]
  }

  if (!validateScope(scope, [PRESCRIBING_USER_SCOPE, AWS_PRESCRIBING_USER_SCOPE])) {
    if (validateScope(scope, [PRESCRIBING_APP_SCOPE])) {
      return [errors.createUserRestrictedOnlyScopeIssue("Prescribing")]
    }
    return [errors.createMissingScopeIssue("Prescribing")]
  }

  return []
}

export function validatePermittedUnattendedDispenseMessage(scope: string): Array<fhir.OperationOutcomeIssue> {
  if (!getDispenseEnabled()) {
    return [errors.createDisabledFeatureIssue("Dispensing")]
  }

  if (!validateScope(scope, [DISPENSING_USER_SCOPE, AWS_DISPENSING_USER_SCOPE, DISPENSING_APP_SCOPE])) {
    return [errors.createMissingScopeIssue("Dispensing")]
  }

  return []
}

export function validatePermittedAttendedDispenseMessage(scope: string): Array<fhir.OperationOutcomeIssue> {
  if (!getDispenseEnabled()) {
    return [errors.createDisabledFeatureIssue("Dispensing")]
  }

  if (!validateScope(scope, [DISPENSING_USER_SCOPE, AWS_DISPENSING_USER_SCOPE])) {
    if (validateScope(scope, [DISPENSING_APP_SCOPE])) {
      return [errors.createUserRestrictedOnlyScopeIssue("Dispensing")]
    }
    return [errors.createMissingScopeIssue("Dispensing")]
  }

  return []
}

export function validatePermittedTrackerMessage(scope: string): Array<fhir.OperationOutcomeIssue> {
  if (!validateScope(scope, [TRACKER_USER_SCOPE, TRACKER_APP_SCOPE])) {
    return [errors.createMissingScopeIssue("Tracker")]
  }

  return []
}

function validateScope(scope: string, permittedScopes: Array<string>) {
  return scope.split(" ").find(s => permittedScopes.includes(s))
}
