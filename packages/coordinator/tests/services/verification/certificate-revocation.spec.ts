import axios from "axios"
import * as moxios from "moxios"
import pino from "pino"
import {Certificate, CertificateRevocationList} from "pkijs"
import {X509} from "jsrsasign"
import {hl7V3} from "@models"

process.env.CRL_DISTRIBUTION_DOMAIN = "crl.nhs.uk"
process.env.CRL_DISTRIBUTION_PROXY = "egress.ptl.api.platform.nhs.uk:700"

import * as TestPrescriptions from "../../resources/test-resources"
import * as TestCertificates from "../../resources/certificates/test-resources"
import * as utils from "../../../src/services/verification/certificate-revocation/utils"
import * as common from "../../../src/services/verification/common"
import {
  getSubCaCert,
  isSignatureCertificateAuthorityValid,
  isSignatureCertificateValid,
  parseCertificateFromPrescription
} from "../../../src/services/verification/certificate-revocation"
import {CRLReasonCode} from "../../../src/services/verification/certificate-revocation/crl-reason-code"
import {MockCertificates} from "../../resources/certificates/test-resources"

const logger = pino()

// Test certs and CRL
const crl = TestCertificates.revocationList
const keyCompromisedCert = crl.revokedCertificates[0]
const cACompromisedCert = crl.revokedCertificates[1]
const ceasedOperationCert = crl.revokedCertificates[2]

// Test prescriptions
const prescriptionWithCrl = TestPrescriptions.parentPrescriptions.invalidSignature.ParentPrescription
// const prescriptionWithoutCrl = TestPrescriptions.parentPrescriptions.validSignature.ParentPrescription

const getAllMockCertificates = (): Array<Certificate> => {
  const mockCertificateCategories: MockCertificates = {
    ...TestCertificates.revokedCertificates,
    ...TestCertificates.validCertificates
  }

  const certificates: Array<Certificate> = []
  for (const category in mockCertificateCategories) {
    const cert = mockCertificateCategories[category]
    certificates.push(cert)
  }

  return certificates
}

beforeAll(() => {
  moxios.install(axios)
})

afterAll(() => {
  moxios.uninstall(axios)
})

// We always want to use our mock CRL, to avoid relying on external ones
const ptlCrl = "https://egress.ptl.api.platform.nhs.uk:700/int/1d/crlc3.crl"
const ptlArl = "https://egress.ptl.api.platform.nhs.uk:700/int/1d/arlc3.crl"
const mockCrl = "https://example.com/ca.crl"
const validUrls = new RegExp(`(${ptlCrl}|${mockCrl}|${ptlArl})`)

moxios.stubRequest(validUrls, {
  status: 200,
  response: TestCertificates.berRevocationList
})

moxios.stubRequest("https://egress.ptl.api.platform.nhs.uk:700/mock/crl404.crl", {
  status: 404
})

moxios.stubRequest("https://egress.ptl.api.platform.nhs.uk:700/mock/crl503.crl", {
  status: 503
})

type LogSpies = {
  loggerInfo: jest.SpyInstance,
  loggerWarn: jest.SpyInstance,
  loggerError: jest.SpyInstance
}

const getLogSpies = (): LogSpies => {
  return {
    loggerInfo: jest.spyOn(logger, "info"),
    loggerWarn: jest.spyOn(logger, "warn"),
    loggerError: jest.spyOn(logger, "error")
  }
}

/**
 * Jira AEA-2650 - Test scenarios
 *
 * VALID SIGNATURE:
 * 1 - Prescription signed before revocation date:
 *   1.1 - Valid certificate
 *
 *   1.2 - Revoked certificate:
 *     1.2.1 - Other handled CRL Reason Code - AEA-2650/AC 1.1
 *     1.2.2 - Other unhandled CRL Reason Code - AEA-2650/comments
 *     1.2.3 - CRL Reason Code not specified - AEA-2650/comments
 *
 * INVALID SIGNATURE:
 * 2 - Prescription signed before revocation date:
 *   2.1 - Revoked certificate:
 *     2.1.1 - KeyCompromise - AEA-2650/AC 1.2
 *     2.1.2 - CACompromise - AEA-2650/AC 1.2
 *
 * 3 - Prescription signed after revocation date:
 *   3.1 - Revoked certificate:
 *     3.1.1 - KeyCompromise - AEA-2650/AC 1.2
 *     3.1.2 - CACompromise - AEA-2650/AC 1.2
 *     3.1.3 - Other handled reason code - AEA-2650/AC 1.1
 *     3.1.4 - Other unhandled Reason Code - AEA-2650/comments
 *     3.1.5 - Reason Code not specified - AEA-2650/comments
 *
 * 4 - Unreadable certificate
 * 5 - CRL Distribution Point URL not set or unavailable
 */

// Log spies
let loggerInfo: jest.SpyInstance
let loggerWarn: jest.SpyInstance
let loggerError: jest.SpyInstance

// Log message patterns
const MSG_VALID_CERT = /Valid signature found for prescription (.*) signed by cert (.*)/
// eslint-disable-next-line max-len
const MSG_VALID_CERT_ON_CRL = /Certificate with serial (.*) found on CRL, but prescription (.*) was signed before its revocation/
// eslint-disable-next-line max-len
const MSG_INVALID_CERT_ON_CRL = /Certificate with serial (?:.*) found on CRL with(\s(?:unhandled))? Reason Code \d{1,2}/
const MSG_INVALID_CERT_ON_CRL_NO_REASON_CODE = /Cannot extract Reason Code from CRL for certificate with serial(.*)/

const expectLogMessages = (reasonCode: CRLReasonCode, isCertificateValid: boolean) => {
  if (reasonCode && isCertificateValid) {
    expect(loggerInfo).toHaveBeenCalledWith(expect.stringMatching(MSG_VALID_CERT_ON_CRL))
  } else if (reasonCode && !isCertificateValid) {
    expect(loggerWarn).toHaveBeenCalledWith(expect.stringMatching(MSG_INVALID_CERT_ON_CRL))
  } else {
    expect(loggerError).toHaveBeenCalledWith(expect.stringMatching(MSG_INVALID_CERT_ON_CRL_NO_REASON_CODE))
  }
}

beforeEach(() => {
  const logSpies = getLogSpies()
  loggerInfo = logSpies.loggerInfo
  loggerWarn = logSpies.loggerWarn
  loggerError = logSpies.loggerError
})

afterEach(() => {
  jest.resetAllMocks()
})

describe("Sanity check mock data", () => {
  test("CRL contains 3 revoked certs", async () => {
    const list: CertificateRevocationList = TestCertificates.revocationList
    expect(list.revokedCertificates.length).toBeGreaterThanOrEqual(3)

    const revocationReasons = list.revokedCertificates.map((cert) => utils.getRevokedCertReasonCode(cert))
    expect(revocationReasons).toContain(CRLReasonCode.CACompromise)
    expect(revocationReasons).toContain(CRLReasonCode.KeyCompromise)
    expect(revocationReasons).toContain(CRLReasonCode.CessationOfOperation)
  })

  test("Certificates have a CRL Distribution Point URL", () => {
    const certs = getAllMockCertificates()
    certs.forEach((cert: Certificate) => {
      const certString = cert.toString()
      const x509Cert = new X509(certString)
      const distributionPointURIs = x509Cert.getExtCRLDistributionPointsURI()

      expect(distributionPointURIs.length).toBe(1)
      for (const url of distributionPointURIs) {
        expect(url).toBe("http://example.com/eps.crl")
      }
    })
  })

  test("CA certificate has a CRL Distribution Point URL (ARL)", () => {
    const certString = TestCertificates.caCertificate
    const x509Cert = new X509(certString)
    const distributionPointURIs = x509Cert.getExtCRLDistributionPointsURI()

    expect(distributionPointURIs.length).toBe(1)
    for (const url of distributionPointURIs) {
      expect(url).toBe("http://crl.nhs.uk/int/1d/arlc3.crl")
    }
  })

  describe("Mock certs revocation reasons match", () => {
    test("KeyCompromise", () => {
      const revReason = utils.getRevokedCertReasonCode(keyCompromisedCert)
      expect(revReason).toEqual(CRLReasonCode.KeyCompromise)
    })

    test("CACompromise", () => {
      const revReason = utils.getRevokedCertReasonCode(cACompromisedCert)
      expect(revReason).toEqual(CRLReasonCode.CACompromise)
    })

    test("CessationOfOperation", () => {
      const revReason = utils.getRevokedCertReasonCode(ceasedOperationCert)
      expect(revReason).toEqual(CRLReasonCode.CessationOfOperation)
    })
  })
})

// 1.1 - Valid certificate
describe("Certificate not on the CRL", () => {
  test("certificate is valid", async () => {
    // The certificate has NOT been revoked and its serial is NOT on our mock CRL
    const prescription = TestPrescriptions.parentPrescriptions.invalidSignature.ParentPrescription
    const isValid = await isSignatureCertificateValid(prescription, logger)

    expect(isValid).toEqual(true)
    expect(loggerInfo).toHaveBeenCalledWith(expect.stringMatching(MSG_VALID_CERT))
  })
})

describe("CA certificate not on the ARL", () => {
  // openssl x509 -in a.crt -text -noout
  beforeAll(() => {
    process.env.SUBCACC_CERT = TestCertificates.caCertificate
  })
  afterAll(() => {
    delete process.env.SUBCACC_CERT
  })
  test("No sub-CA cert returned when no match for prescription cert.", () => {
    const prescription = TestPrescriptions.parentPrescriptions.invalidSignature.ParentPrescription
    const {certificate, serialNumber} = parseCertificateFromPrescription(prescription)
    const subCaCert = getSubCaCert(certificate, serialNumber, logger)
    expect(subCaCert).toBeUndefined()
  })
  test("CA certificate is valid", async () => {
    const prescription = TestPrescriptions.parentPrescriptions.signatureCertNotOnArl.ParentPrescription
    const isValid = await isSignatureCertificateAuthorityValid(prescription, logger)

    expect(isValid).toEqual(true)
    expect(loggerInfo).toHaveBeenCalledWith(expect.stringMatching(MSG_VALID_CERT))
  })
})

describe("Certificate found on the CRL", () => {
  // Mock data
  let prescription: hl7V3.ParentPrescription
  let prescriptionSignedDate = new Date()
  let serialNumberSpy: jest.SpyInstance
  let signedDateSpy: jest.SpyInstance

  beforeAll(() => {
    prescription = prescriptionWithCrl
  })

  beforeEach(() => {
    // Ensure the function returns a serial that is in our mock CRL
    const revokedCertSerial = utils.getRevokedCertSerialNumber(keyCompromisedCert)
    serialNumberSpy = jest.spyOn(utils, "getX509SerialNumber")
    serialNumberSpy.mockReturnValue(revokedCertSerial)
  })

  afterEach(() => {
    serialNumberSpy.mockRestore()
  })

  // 1 - VALID - Prescription signed before revocation date
  // 2 - INVALID - Prescription signed before revocation date
  describe("prescription signed before revocation is", () => {
    beforeEach(() => {
      // Ensure signing date is before cert revocation
      prescriptionSignedDate = new Date(ceasedOperationCert.revocationDate.value)
      prescriptionSignedDate.setDate(prescriptionSignedDate.getDate() - 1)

      signedDateSpy = jest.spyOn(utils, "getPrescriptionSignatureDate")
      signedDateSpy.mockReturnValue(prescriptionSignedDate)
    })

    afterEach(() => {
      signedDateSpy.mockRestore()
    })

    test.each([
      // 2.1 - Revoked certificate - AEA-2650/AC 1.2
      ["invalid", "KeyCompromise", CRLReasonCode.KeyCompromise, false],
      ["invalid", "CACompromise", CRLReasonCode.CACompromise, false],

      // 1.2.1 - Other handled CRL Reason Code - AEA-2650/AC 1.1
      ["valid", "Unspecified", CRLReasonCode.Unspecified, true],
      ["valid", "AffiliationChanged", CRLReasonCode.AffiliationChanged, true],
      ["valid", "Superseded", CRLReasonCode.Superseded, true],
      ["valid", "CessationOfOperation", CRLReasonCode.CessationOfOperation, true],
      ["valid", "CertificateHold", CRLReasonCode.CertificateHold, true],
      ["valid", "RemoveFromCRL", CRLReasonCode.RemoveFromCRL, true],

      // 1.2.2 - Other handled CRL Reason Code - AEA-2650/comments
      ["valid", "PrivilegeWithdrawn", CRLReasonCode.PrivilegeWithdrawn, true],
      ["invalid", "AACompromise", CRLReasonCode.AACompromise, false],

      // 1.2.3 - CRL Reason Code not specified - AEA-2650/comments
      ["valid", "unspecified (1)", null, true],
      ["valid", "unspecified (2)", "", true]
    ])("%s when Reason Code is %s", async (
      outcome: string,
      reasonCodeDesc: string,
      reasonCode: CRLReasonCode,
      isCertificateValid: boolean
    ) => {
      // Mock the reasonCode to be returned, depending on the scenario
      const reasonCodeSpy = jest.spyOn(utils, "getRevokedCertReasonCode")
      reasonCodeSpy.mockReturnValue(reasonCode)

      // Check certificate validity matches expected
      const isValid = await isSignatureCertificateValid(prescription, logger)
      expect(isValid).toEqual(isCertificateValid)

      // Check log messages
      expectLogMessages(reasonCode, isCertificateValid)

      reasonCodeSpy.mockRestore()
    })
  })

  // 3 - Invalid signature: prescription signed after revocation date
  describe("prescription signed after revocation is always invalid", () => {
    beforeEach(() => {
      // Ensure signed date is on the same date/time of revocation
      prescriptionSignedDate = new Date(ceasedOperationCert.revocationDate.value)
      signedDateSpy = jest.spyOn(utils, "getPrescriptionSignatureDate")
      signedDateSpy.mockReturnValue(prescriptionSignedDate)
    })

    afterEach(() => {
      signedDateSpy.mockRestore()
    })

    test.each([
      // 3.1.1 - KeyCompromise - AEA-2650/AC 1.2
      // 3.1.2 - CACompromise - AEA-2650/AC 1.2
      ["KeyCompromise", CRLReasonCode.KeyCompromise],
      ["CACompromise", CRLReasonCode.CACompromise],

      // 3.1.3 - Other handled reason code - AEA-2650/AC 1.1
      ["Unspecified", CRLReasonCode.Unspecified],
      ["AffiliationChanged", CRLReasonCode.AffiliationChanged],
      ["Superseded", CRLReasonCode.Superseded],
      ["CessationOfOperation", CRLReasonCode.CessationOfOperation],
      ["CertificateHold", CRLReasonCode.CertificateHold],
      ["RemoveFromCRL", CRLReasonCode.RemoveFromCRL],

      // 3.1.4 - Other unhandled Reason Code - AEA-2650/comments
      ["PrivilegeWithdrawn", CRLReasonCode.PrivilegeWithdrawn],
      ["AACompromise", CRLReasonCode.AACompromise],

      // 3.1.5 - Reason Code not specified - AEA-2650/comments
      ["unspecified (1)", null],
      ["unspecified (2)", ""]
    ])("Reason Code is %s", async (desc: string, reasonCode: CRLReasonCode) => {
      // Force an unsupported revocation value (-1) to be returned
      const reasonCodeSpy = jest.spyOn(utils, "getRevokedCertReasonCode")
      reasonCodeSpy.mockReturnValue(reasonCode)

      const isCertificateValid = await isSignatureCertificateValid(prescription, logger)
      expect(isCertificateValid).toEqual(false)

      // Check log messages
      expectLogMessages(reasonCode, isCertificateValid)

      reasonCodeSpy.mockRestore()
    })
  })
})

describe("Certificate verification edge cases", () => {
  // 4 - Unreadable certificate
  test("unreadable certificate is not allowed", async () => {
    const validPrescription = TestPrescriptions.parentPrescriptions.validSignature.ParentPrescription
    const validCertificateText = common.getCertificateTextFromPrescription(validPrescription)
    const unreadableCertText = validCertificateText.slice(1)

    // make the function return the unreadable cert instead
    const certTextSpy = jest.spyOn(common, "getCertificateTextFromPrescription")
    certTextSpy.mockReturnValue(unreadableCertText)

    const isValid = await isSignatureCertificateValid(validPrescription, logger)
    expect(isValid).toEqual(false)

    const expectedLog = "Could not parse X509 certificate from prescription"
    expect(loggerError).toHaveBeenCalledWith(expect.stringContaining(expectedLog))

    certTextSpy.mockRestore()
  })

  // 5 - CRL Distribution Point URL not set or unavailable
  describe("CRL not set or unavailable is allowed", () => {
    test("no CRL URI on certificate", async () => {
      // This cert does not have a CRL
      const prescription = TestPrescriptions.parentPrescriptions.validSignature.ParentPrescription
      const certificate = utils.getCertificateFromPrescription(prescription)
      const serialNumber = utils.getX509SerialNumber(certificate)

      const spy = jest.spyOn(utils, "getX509SerialNumber")
      spy.mockReturnValue(serialNumber)

      const isValid = await isSignatureCertificateValid(prescription, logger)
      expect(isValid).toEqual(true)

      const logPattern = "Cannot retrieve CRL distribution point from certificate"
      expect(loggerError).toHaveBeenCalledWith(expect.stringContaining(logPattern))

      spy.mockRestore()
    })

    test.each([
      [404, "https://egress.ptl.api.platform.nhs.uk:700/mock/crl404.crl"],
      [503, "https://egress.ptl.api.platform.nhs.uk:700/mock/crl503.crl"]
    ])("got a %i when trying to fetch the CRL", async (expectedCode: number, url: string) => {
      const prescription = TestPrescriptions.parentPrescriptions.validSignature.ParentPrescription
      const certTextSpy = jest.spyOn(utils, "getX509DistributionPointsURI")
      certTextSpy.mockReturnValue([url])

      const isValid = await isSignatureCertificateValid(prescription, logger)
      expect(isValid).toEqual(true)

      const detailsErrorPattern = `Unable to fetch CRL from ${url}`
      expect(loggerError).toHaveBeenCalledWith(expect.stringContaining(detailsErrorPattern))

      certTextSpy.mockRestore()
    })
  })
})
