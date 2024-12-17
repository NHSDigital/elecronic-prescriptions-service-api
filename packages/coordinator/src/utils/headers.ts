import Hapi from "@hapi/hapi"
import * as uuid from "uuid"
import {DISPENSING_USER_SCOPE, PRESCRIBING_USER_SCOPE, TRACKER_USER_SCOPE} from "../services/validation/scope-validator"

export enum RequestHeaders {
  APPLICATION_ID = "nhsd-application-id",
  ASID = "nhsd-asid",
  AUTH_LEVEL = "nhsd-identity-authentication-level",
  PARTY_KEY = "nhsd-party-key",
  RAW_RESPONSE = "x-raw-response",
  REQUEST_ID = "nhsd-request-id",
  CORRELATION_ID = "nhsd-correlation-id",
  SCOPE = "nhsd-scope",
  SDS_ROLE_PROFILE_ID = "nhsd-session-urid",
  SDS_USER_UNIQUE_ID = "nhsd-identity-uuid",
  SKIP_VALIDATION = "x-skip-validation",
  SHOW_VALIDATION_WARNINGS = "x-show-validation-warnings",
  SMOKE_TEST = "x-smoke-test",
}

export const DEFAULT_ASID = "200000001285"
export const DEFAULT_UUID = "555254239107"
export const DEFAULT_RPID = "555254240100" //S8000:G8000:R8001 - "Clinical":"Clinical Provision":"Nurse Access Role"
export const DEFAULT_SCOPE = `${PRESCRIBING_USER_SCOPE} ${DISPENSING_USER_SCOPE} ${TRACKER_USER_SCOPE}`
export const DEFAULT_SHOW_VALIDATION_WARNINGS = "false"
const DEFAULT_APPLICATION_ID = "00000000-0000-0000-0000-000000000000"

function getHeaderIdentifier(headers: Hapi.Utils.Dictionary<string>, identifier: RequestHeaders): string {
  return process.env.SANDBOX === "1" ? uuid.v4() : headers[identifier].toUpperCase()
}

export function getRequestId(headers: Hapi.Utils.Dictionary<string>): string {
  return getHeaderIdentifier(headers, RequestHeaders.REQUEST_ID)
}

export function getCorrelationId(headers: Hapi.Utils.Dictionary<string>): string {
  return getHeaderIdentifier(headers, RequestHeaders.CORRELATION_ID)
}

export function getAsid(headers: Hapi.Utils.Dictionary<string>): string {
  return process.env.SANDBOX === "1" ? DEFAULT_ASID : headers[RequestHeaders.ASID]
}

export function getPartyKey(headers: Hapi.Utils.Dictionary<string>): string {
  return headers[RequestHeaders.PARTY_KEY]
}

export function getSdsUserUniqueId(headers: Hapi.Utils.Dictionary<string>): string {
  return process.env.SANDBOX === "1" ? DEFAULT_UUID : headers[RequestHeaders.SDS_USER_UNIQUE_ID]
}

export function getSdsRoleProfileId(headers: Hapi.Utils.Dictionary<string>): string {
  return process.env.SANDBOX === "1" ? DEFAULT_RPID : headers[RequestHeaders.SDS_ROLE_PROFILE_ID]
}

export function getScope(headers: Hapi.Utils.Dictionary<string>): string {
  return process.env.SANDBOX === "1" ? DEFAULT_SCOPE : headers[RequestHeaders.SCOPE]
}

export function getShowValidationWarnings(headers: Hapi.Utils.Dictionary<string>): string {
  return process.env.SANDBOX === "1"
    ? DEFAULT_SHOW_VALIDATION_WARNINGS
    : headers[RequestHeaders.SHOW_VALIDATION_WARNINGS]
}

export function getApplicationId(headers: Hapi.Utils.Dictionary<string>): string {
  return process.env.SANDBOX === "1" ? DEFAULT_APPLICATION_ID : headers[RequestHeaders.APPLICATION_ID]
}
