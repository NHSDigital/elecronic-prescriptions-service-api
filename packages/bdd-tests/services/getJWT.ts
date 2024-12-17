import {getSignatureTemplate} from "../util/templates"
import base64url from "base64url"
import crypto from "crypto"
import fs from "fs"
const url = process.env["PACT_PROVIDER_URL"]

const privateKeyPath = process.env.SIGNING_PRIVATE_KEY_PATH
const x509CertificatePath = process.env.SIGNING_CERT_PATH
const dummySignature =
  // eslint-disable-next-line max-len
  "DQo8U2lnbmF0dXJlIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwLzA5L3htbGRzaWcjIj4NCiAgICA8U2lnbmVkSW5mbz48Q2Fub25pY2FsaXphdGlvbk1ldGhvZCBBbGdvcml0aG09Imh0dHA6Ly93d3cudzMub3JnLzIwMDEvMTAveG1sLWV4Yy1jMTRuIyI+PC9DYW5vbmljYWxpemF0aW9uTWV0aG9kPjxTaWduYXR1cmVNZXRob2QgQWxnb3JpdGhtPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwLzA5L3htbGRzaWcjcnNhLXNoYTEiPjwvU2lnbmF0dXJlTWV0aG9kPjxSZWZlcmVuY2U+PFRyYW5zZm9ybXM+PFRyYW5zZm9ybSBBbGdvcml0aG09Imh0dHA6Ly93d3cudzMub3JnLzIwMDEvMTAveG1sLWV4Yy1jMTRuIyI+PC9UcmFuc2Zvcm0+PC9UcmFuc2Zvcm1zPjxEaWdlc3RNZXRob2QgQWxnb3JpdGhtPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwLzA5L3htbGRzaWcjc2hhMSI+PC9EaWdlc3RNZXRob2Q+PERpZ2VzdFZhbHVlPmVZQ3ZscXZncGlSZU1uK3BRajg3ODRGMmJMOD08L0RpZ2VzdFZhbHVlPjwvUmVmZXJlbmNlPjwvU2lnbmVkSW5mbz4NCiAgICA8U2lnbmF0dXJlVmFsdWU+RmJPWmRJQ3Npb2RKejZlaDRrZy92RnV2RW1HL2QzNjh3am5jTUxyYWJxZW0xNjhSNkdVc0ZHTXRKT05PYlk3c0VZVXZRQ3FjdE81Smx3aU43Wm9teDdXRWs4WDAvZ1RVYkdlcGRiVFEzenp1dWhHb2xWNXhXdW5jeS9qSDc3NTF6d0JnN3hLVG5RdEhZMzNISjU1ZmVTN1JJbURMbmZBZHpuZkVidFU2TGE0PTwvU2lnbmF0dXJlVmFsdWU+DQogICAgPEtleUluZm8+DQogICAgICAgIDxYNTA5RGF0YT4NCiAgICAgICAgICAgIDxYNTA5Q2VydGlmaWNhdGU+TUlJRHVEQ0NBcUNnQXdJQkFnSUVYY210SHpBTkJna3Foa2lHOXcwQkFRc0ZBREEyTVF3d0NnWURWUVFLRXdOdWFITXhDekFKQmdOVkJBc1RBa05CTVJrd0Z3WURWUVFERXhCT1NGTWdTVTVVSUV4bGRtVnNJREZFTUI0WERUSXdNVEF5TWpFd01qRTFOVm9YRFRJeU1UQXlNakV3TlRFMU5Wb3dRekVNTUFvR0ExVUVDaE1EYm1oek1ROHdEUVlEVlFRTEV3WlFaVzl3YkdVeElqQWdCZ05WQkFNTUdUVTFOVEkxTXpVeU1URXdPRjlTUVU1RVQwMWZWVk5GVWxFd2daOHdEUVlKS29aSWh2Y05BUUVCQlFBRGdZMEFNSUdKQW9HQkFLdDRzek53N09BSDdBUVJyRGUveEJJbXNNbU1pUzlFc3JUM2EzcC9MaDNicmR6STlhYWpUVVoyYi9jdmJPYTdQZVlkN3UrSzRhMlpkMFhrKzBHRm1ZR3pTVlg2aVlqYmx3cjB2YWkzMXpWN0crbEd2SHhINnBTb0xDd0lDYVpBRndhYmVENU96OTQreUEzYVdOV3RHVjBEZmg5cXdIM1pGQ0lNUnN2ZXJOMXBBZ01CQUFHamdnRkRNSUlCUHpBT0JnTlZIUThCQWY4RUJBTUNCa0F3WlFZRFZSMGdBUUgvQkZzd1dUQlhCZ3NxaGpvQWlYdG1BQU1DQURCSU1FWUdDQ3NHQVFVRkJ3SUJGanBvZEhSd2N6b3ZMM0JyYVM1dWFITXVkV3N2WTJWeWRHbG1hV05oZEdWZmNHOXNhV05wWlhNdlkyOXVkR1Z1ZEY5amIyMXRhWFJ0Wlc1ME1ETUdBMVVkSHdRc01Db3dLS0Ftb0NTR0ltaDBkSEE2THk5amNtd3VibWh6TG5WckwybHVkQzh4WkM5amNteGpNeTVqY213d0t3WURWUjBRQkNRd0lvQVBNakF5TURFd01qSXhNREl4TlRWYWdROHlNREl5TURNeE56RXdOVEUxTlZvd0h3WURWUjBqQkJnd0ZvQVVvSllmZ1lUTlBkNkVVS0w2UUxJekh4WTVQRkl3SFFZRFZSME9CQllFRkx0eXZZU3lhcWc2MEFFVVpneGswd3JqUkpjK01Ba0dBMVVkRXdRQ01BQXdHUVlKS29aSWh2WjlCMEVBQkF3d0Noc0VWamd1TXdNQ0JMQXdEUVlKS29aSWh2Y05BUUVMQlFBRGdnRUJBQmN6eThCOGp1UHBJZmFUTkZjeHJDMjJhQ1gveFlabWhyTC9OdklCQWFYMUc1aGppd21rR0tFMmhSVElyNjdQeFp4bVhzSnhpZ1JCTUhQbEkrbFkvK29rekgwR2k3YjVicWx3N3B4R0lnSk8wMDB3OHBGc3ZvOXc0MklZaEhvZHN2bkRWU3hoTVQwSjQ2UWhrOXNvRTBMam9FVUxLUVBQbFlHa2UvR2wzbTE3SXRGWXdPYlFIMGZNRXdtaXFCeWVJZno3Z1NjY096TDVjSXA2UGNaVE9qbzJJcVFwZ0VtaGpPY1JJbkVxQU5pdFNkam9pSkFKenBhYVpqWVRSZEhVWDdpN2FqRWlING05MW5GVys0QXFrTnR0bGI0V2NHS3NTbVdnZktLaGVGNElvWktNRTgweGVyU2dNeTh2dGpMT0JKQ0dYejB3TEdtUXVSbXhNVHE4OHE0PTwvWDUwOUNlcnRpZmljYXRlPg0KICAgICAgICA8L1g1MDlEYXRhPg0KICAgIDwvS2V5SW5mbz4NCjwvU2lnbmF0dXJlPg0K"

export function getJWT(digest) {
  const hea = {
    alg: "RS512",
    typ: "JWT",
    kid: "test-1"
  }

  const pload = {
    payloads: [
      {
        id: "1",
        payload: digest
      }
    ],
    algorithm: "RS1",
    iat: Math.floor(new Date().getTime() / 1000) - 600, // Issued 10 mins ago
    exp: Math.floor(new Date().getTime() / 1000) + 600, // Expires in 10 minutes
    //"aud": `${url}/signing-service`,
    aud: `${url}/oauth2/token`,
    iss: process.env["API_CLIENT_ID"],
    sub: process.env["API_CLIENT_ID"]
  }

  return base64url(JSON.stringify(hea)) + "." + base64url(JSON.stringify(pload))
}

export function getSignedSignature(digest, algorithm, valid) {
  const hasPrivateKeyAndX509Cert = fs.existsSync(privateKeyPath) && fs.existsSync(x509CertificatePath)
  let signature
  if (!hasPrivateKeyAndX509Cert) {
    signature = dummySignature
  } else {
    const digestBuffer = Buffer.from(digest, "base64").toString("utf-8")
    // eslint-disable-next-line max-len
    const digestWithoutNamespace = digestBuffer.replace(`<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">`, `<SignedInfo>`)
    const signedSignature = crypto
      .sign(algorithm === "RS1" ? "sha1" : "sha256", Buffer.from(digestBuffer, "utf-8"), {
        key: fs.readFileSync(privateKeyPath, "utf-8"),
        padding: crypto.constants.RSA_PKCS1_PADDING
      })
      .toString("base64")
    const certificate = fs.readFileSync(x509CertificatePath, "utf-8")
    const x509 = new crypto.X509Certificate(certificate)
    if (new Date(x509.validTo).getTime() < new Date().getTime()) {
      throw new Error("Signing certificate has expired")
    }
    const certificateValue = x509.raw.toString("base64")
    let signData = getSignatureTemplate()
    signData = signData.replace("{{digest}}", digestWithoutNamespace)
    if (valid) {
      signData = signData.replace("{{signature}}", signedSignature)
    } else {
      signData = signData.replace("{{signature}}", `${signedSignature}TVV3WERxSU0xV0w4ODdRRTZ3O`)
    }
    signData = signData.replace("{{cert}}", certificateValue)
    signature = Buffer.from(signData, "utf-8").toString("base64")
  }
  return signature
}
