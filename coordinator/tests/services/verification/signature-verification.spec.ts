import * as TestResources from "../../resources/test-resources"
import {
  extractSignatureRootFromParentPrescription,
  verifyPrescriptionSignatureValid,
  verifySignatureDigestMatchesPrescription,
  verifySignatureHasCorrectFormat,
  verifyCertificate,
  verifyChain,
  verifySignature,
  extractSignatureDateTimeStamp,
  verifyCertificateValidWhenSigned
} from "../../../src/services/verification/signature-verification"
import {clone} from "../../resources/test-helpers"
import {X509Certificate} from "crypto"
import path from "path"
import fs from "fs"
import {hl7V3} from "@models"

describe("verifySignatureHasCorrectFormat...", () => {
  const validSignature = TestResources.parentPrescriptions.validSignature.ParentPrescription
  test("returns true if prescriptions signature has valid fields", () => {
    const result = verifySignatureHasCorrectFormat(validSignature)
    expect(result).toEqual(true)
  })

  test("returns false if prescriptions signature doesn't have signedInfo", () => {
    const clonePrescription = clone(validSignature)
    const signatureRoot = extractSignatureRootFromParentPrescription(clonePrescription)
    delete signatureRoot.Signature.SignedInfo
    const result = verifySignatureHasCorrectFormat(clonePrescription)
    expect(result).toEqual(false)
  })

  test("returns false if prescriptions signature doesn't have signatureValue", () => {
    const clonePrescription = clone(validSignature)
    const signatureRoot = extractSignatureRootFromParentPrescription(clonePrescription)
    delete signatureRoot.Signature.SignatureValue._text
    const result = verifySignatureHasCorrectFormat(clonePrescription)
    expect(result).toEqual(false)
  })

  test("returns false if prescriptions signature doesn't have X509Cert", () => {
    const clonePrescription = clone(validSignature)
    const signatureRoot = extractSignatureRootFromParentPrescription(clonePrescription)
    delete signatureRoot.Signature.KeyInfo.X509Data.X509Certificate._text
    const result = verifySignatureHasCorrectFormat(clonePrescription)
    expect(result).toEqual(false)
  })
})

describe("verifySignatureDigestMatchesPrescription...", () => {
  const validSignature = TestResources.parentPrescriptions.validSignature.ParentPrescription
  const nonMatchingSignature = TestResources.parentPrescriptions.nonMatchingSignature.ParentPrescription

  test("Prescription with digest that matches prescription returns true", () => {
    const result = verifySignatureDigestMatchesPrescription(validSignature)
    expect(result).toEqual(true)
  })

  test("Prescription with digest that doesn't matches prescription returns false", () => {
    const result = verifySignatureDigestMatchesPrescription(nonMatchingSignature)
    expect(result).toEqual(false)
  })

  test("returns Signature doesn't match prescription", () => {
    const result = verifySignature(nonMatchingSignature)
    expect(result).toContain("Signature doesn't match prescription")
  })

  test("returns Signature is invalid", () => {
    const result = verifySignature(nonMatchingSignature)
    expect(result).toContain("Signature is invalid")
  })
  test("returns Signature match prescription", () => {
    const result = verifySignature(validSignature)
    expect(result).not.toContain("Signature doesn't match prescription")
    expect(result).not.toContain("Signature is invalid")
  })
})

describe("verifyPrescriptionSignatureValid...", () => {
  const validSignature = TestResources.parentPrescriptions.validSignature.ParentPrescription
  const invalidSignature = TestResources.parentPrescriptions.invalidSignature.ParentPrescription

  test("Prescription with valid Signature that matches prescription returns true", () => {
    const result = verifyPrescriptionSignatureValid(validSignature)
    expect(result).toEqual(true)
  })

  test("Prescription with invalid Signature that doesn't matches prescription returns false", () => {
    const result = verifyPrescriptionSignatureValid(invalidSignature)
    expect(result).toEqual(false)
  })
})

describe("extractSignatureDateTime", () => {
  const parentPrescription = TestResources.parentPrescriptions.validSignature.ParentPrescription
  test("should returns signature timeStamp from prescription", () => {
    const signatureTimeStamp = "20210824100522"
    setSignatureTimeStamp(parentPrescription, signatureTimeStamp)
    const result = extractSignatureDateTimeStamp(parentPrescription)
    const expected = new hl7V3.Timestamp(signatureTimeStamp)
    expect(result).toEqual(expected)
  })
})

describe("verifyCertificate", () => {
  const parentPrescription = TestResources.parentPrescriptions.validSignature.ParentPrescription
  const certExpiredErrorMessage = "Certificate expired when signed"
  test("should contain certExpiredErrorMessage in error list when cert was expired when signature was created", () => {
    setSignatureTimeStamp(parentPrescription, "20210707120522")
    const result = verifyCertificate(parentPrescription)
    const certificateHasExpired = result.includes(certExpiredErrorMessage)
    expect(certificateHasExpired).toBeTruthy()
  })
  test("should not return error message when cert has not expired", () => {
    setSignatureTimeStamp(parentPrescription, "20210824120522")
    const result = verifyCertificate(parentPrescription)
    const certificateHasExpired = result.includes(certExpiredErrorMessage)
    expect(certificateHasExpired).toBeFalsy()
  })

})

describe("VerifyChain", () => {
  beforeAll(() => {
    process.env.SUBCACC_CERT_PATH = path.join(__dirname, "../../resources/certificates/NHS_INT_Level1D_Base64_pem.cer")
  })
  test("should return false when cert is not issued by SubCAcc", () => {
    const unTrustedCert = createX509Cert("../../resources/certificates/x509-not-trusted.cer")
    const result = verifyChain(unTrustedCert)
    expect(result).toEqual(false)
  })
  test("should return true when cert is issued by SubCAcc", () => {
    const trustedCert = createX509Cert("../../resources/certificates/x509-trusted.cer")
    const result = verifyChain(trustedCert)
    expect(result).toEqual(true)
  })
})

function createX509Cert(certPath: string): X509Certificate {
  const cert = fs.readFileSync(path.join(__dirname, certPath))
  return new X509Certificate(cert)
}

describe("verifyCertificateValidWhenSigned ", () => {
  const parentPrescription = TestResources.parentPrescriptions.validSignature.ParentPrescription
  test("should return false when signature date is before cert start date", () => {
    setSignatureTimeStamp(parentPrescription, "20210707120522")
    const result = verifyCertificateValidWhenSigned(parentPrescription)
    expect(result).toBeFalsy()
  })
  test("should return false when signature date is after cert end date", () => {
    setSignatureTimeStamp(parentPrescription, "202307120522")
    const result = verifyCertificateValidWhenSigned(parentPrescription)
    expect(result).toBeFalsy()
  })
  test("should return true when signature date is after cert start date and before cert end date", () => {
    setSignatureTimeStamp(parentPrescription, "20210824120522")
    const result = verifyCertificateValidWhenSigned(parentPrescription)
    expect(result).toBeTruthy()
  })
})

const setSignatureTimeStamp = (parentPrescription: hl7V3.ParentPrescription, timeStamp: string): void => {
  parentPrescription
    .pertinentInformation1
    .pertinentPrescription
    .author
    .time
    ._attributes
    .value = timeStamp
}

