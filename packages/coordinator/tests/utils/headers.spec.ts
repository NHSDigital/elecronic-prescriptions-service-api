import {
  getRequestId,
  getCorrelationId,
  getAsid,
  getPartyKey,
  getSdsUserUniqueId,
  getSdsRoleProfileId,
  getScope,
  getShowValidationWarnings,
  DEFAULT_SCOPE,
  AWS_SCOPE
} from "../../src/utils/headers"
import {validTestHeaders} from "../resources/test-resources"

const guidRegex = /^[0-9a-f]{8}[-]?(?:[0-9a-f]{4}[-]?){3}[0-9a-f]{12}$/
describe("header functions do the right thing", () => {

  test("getRequestId gets correct value when not sandbox", () => {
    process.env.SANDBOX = "0"
    const requestId = getRequestId(validTestHeaders)
    expect(requestId).toBe("TEST")
  })

  test("getRequestId gets correct value when is sandbox", () => {
    process.env.SANDBOX = "1"
    const requestId = getRequestId(validTestHeaders)
    expect(requestId).toMatch(guidRegex)
  })

  test("getCorrelationId gets correct value when not sandbox", () => {
    process.env.SANDBOX = "0"
    const correlationId = getCorrelationId(validTestHeaders)
    expect(correlationId).toBe("TEST-CORRELATION-ID")
  })

  test("getCorrelationId gets correct value when is sandbox", () => {
    process.env.SANDBOX = "1"
    const correlationId = getCorrelationId(validTestHeaders)
    expect(correlationId).toMatch(guidRegex)
  })

  test("getAsid gets correct value when not sandbox", () => {
    process.env.SANDBOX = "0"
    const newHeaders = validTestHeaders
    newHeaders["nhsd-asid"] = "new-asid"
    const asid = getAsid(newHeaders)
    expect(asid).toBe("new-asid")
  })

  test("getAsid gets correct value when is sandbox", () => {
    process.env.SANDBOX = "1"
    const asid = getAsid(validTestHeaders)
    expect(asid).toBe("200000001285")
  })

  test("getPartyKey gets correct value when not sandbox", () => {
    process.env.SANDBOX = "0"
    const partyKey = getPartyKey(validTestHeaders)
    expect(partyKey).toBe("T141D-822234")
  })

  test("getPartyKey gets correct value when is sandbox", () => {
    process.env.SANDBOX = "1"
    const partyKey = getPartyKey(validTestHeaders)
    expect(partyKey).toBe("T141D-822234")
  })

  test("getSdsUserUniqueId gets correct value when not sandbox", () => {
    process.env.SANDBOX = "0"
    const newHeaders = validTestHeaders
    newHeaders["nhsd-identity-uuid"] = "new-identity-uuid"
    const sdsUserUniqueId = getSdsUserUniqueId(validTestHeaders)
    expect(sdsUserUniqueId).toBe("new-identity-uuid")
  })

  test("getSdsUserUniqueId gets correct value when is sandbox", () => {
    process.env.SANDBOX = "1"
    const sdsUserUniqueId = getSdsUserUniqueId(validTestHeaders)
    expect(sdsUserUniqueId).toBe("555254239107")
  })

  test("getSdsRoleProfileId gets correct value when not sandbox", () => {
    process.env.SANDBOX = "0"
    const newHeaders = validTestHeaders
    newHeaders["nhsd-session-urid"] = "new-session-urid"
    const sdsUserUniqueId = getSdsRoleProfileId(validTestHeaders)
    expect(sdsUserUniqueId).toBe("new-session-urid")
  })

  test("getSdsRoleProfileId gets correct value when is sandbox", () => {
    process.env.SANDBOX = "1"
    const sdsRoleProfileId = getSdsRoleProfileId(validTestHeaders)
    expect(sdsRoleProfileId).toBe("555254240100")
  })

  test("getScope gets correct value when not sandbox", () => {
    process.env.SANDBOX = "0"
    const newHeaders = validTestHeaders
    newHeaders["nhsd-scope"] = "scope1 scope2"
    const scope = getScope(validTestHeaders)
    expect(scope).toBe("scope1 scope2")
  })

  test("getScope gets correct value when is sandbox", () => {
    process.env.SANDBOX = "1"
    const scope = getScope(validTestHeaders)
    expect(scope).toBe(DEFAULT_SCOPE)
  })

  test("getScope gets correct value when is in EPS hosted", () => {
    process.env.MTLS_SPINE_CLIENT = "true"
    const scope = getScope(validTestHeaders)
    expect(scope).toBe(AWS_SCOPE)
  })

  test("getShowValidationWarnings gets correct value when not sandbox", () => {
    process.env.SANDBOX = "0"
    const newHeaders = validTestHeaders
    newHeaders["x-show-validation-warnings"] = "true"
    const showValidationWarnings = getShowValidationWarnings(validTestHeaders)
    expect(showValidationWarnings).toBe("true")
  })

  test("getShowValidationWarnings gets correct value when is sandbox", () => {
    process.env.SANDBOX = "1"
    const showValidationWarnings = getShowValidationWarnings(validTestHeaders)
    expect(showValidationWarnings).toBe("false")
  })

})
