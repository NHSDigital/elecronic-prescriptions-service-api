import Hapi from "@hapi/hapi"
import * as uuid from "uuid"
import {DISPENSING_USER_SCOPE, PRESCRIBING_USER_SCOPE} from "../services/validation/prescribing-dispensing-tracker"

export enum RequestHeaders {
  REQUEST_ID = "nhsd-request-id",
  AUTH_LEVEL = "nhsd-identity-authentication-level",
  ASID = "nhsd-asid",
  PARTY_KEY = "nhsd-party-key",
  SDS_USER_UNIQUE_ID = "nhsd-identity-uuid",
  SDS_ROLE_PROFILE_ID = "nhsd-session-urid",
  SCOPE = "nhsd-scope",
  RAW_RESPONSE = "x-raw-response",
  SKIP_VALIDATION = "x-skip-validation",
  SMOKE_TEST = "x-smoke-test"
}

export function getRequestId(headers: Hapi.Util.Dictionary<string>): string {
  return process.env.SANDBOX === "1" ? uuid.v4() : headers[RequestHeaders.REQUEST_ID].toUpperCase()
}

export function getAsid(headers: Hapi.Util.Dictionary<string>): string {
  const defaultAsid = "200000001285"
  return process.env.SANDBOX === "1" ? defaultAsid : headers[RequestHeaders.ASID]
}

export function getPartyKey(headers: Hapi.Util.Dictionary<string>): string {
  return headers[RequestHeaders.PARTY_KEY]
}

export function getSdsUserUniqueId(headers: Hapi.Util.Dictionary<string>): string {
  const defaultUUID = "555254239107" //USERQ RANDOM Mr
  return process.env.SANDBOX === "1" ? defaultUUID : headers[RequestHeaders.SDS_USER_UNIQUE_ID]
}

export function getSdsRoleProfileId(headers: Hapi.Util.Dictionary<string>): string {
  const defaultRPID = "555254240100" //S8000:G8000:R8001 - "Clinical":"Clinical Provision":"Nurse Access Role"
  return process.env.SANDBOX === "1" ? defaultRPID : headers[RequestHeaders.SDS_ROLE_PROFILE_ID]
}

export function getScope(headers: Hapi.Util.Dictionary<string>): string {
  const defaultScope = `${PRESCRIBING_USER_SCOPE} ${DISPENSING_USER_SCOPE}`
  return process.env.SANDBOX === "1" ? defaultScope : headers[RequestHeaders.SCOPE]
}
