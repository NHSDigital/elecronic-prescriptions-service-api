import axios from "axios"
import {X509} from "jsrsasign"
import pino from "pino"
import {hl7V3} from "@models"
import {convertHL7V3DateTimeToIsoDateTimeString} from "../../translation/common/dateTime"
import {extractSignatureDateTimeStamp, getCertificateTextFromPrescription} from "../common"
import {X509CrlEntry, X509Crl, X509Certificate} from "@peculiar/x509"

const CRL_REQUEST_TIMEOUT_IN_MS = 10000

const getRevokedCertSerialNumber = (cert: X509CrlEntry | X509Certificate) => {
  const certHexValue = cert.serialNumber
  return certHexValue.toLocaleLowerCase()
}

const getPrescriptionSignatureDate = (parentPrescription: hl7V3.ParentPrescription): Date => {
  const prescriptionSignedDateTimestamp = extractSignatureDateTimeStamp(parentPrescription)
  return new Date(convertHL7V3DateTimeToIsoDateTimeString(prescriptionSignedDateTimestamp))
}

const getCertificateFromPrescription = (parentPrescription: hl7V3.ParentPrescription): X509 => {
  try {
    const x509CertificateText = getCertificateTextFromPrescription(parentPrescription)
    const x509CertificatePem = `-----BEGIN CERTIFICATE-----\n${x509CertificateText}\n-----END CERTIFICATE-----`
    const x509Certificate = new X509(x509CertificatePem)
    return x509Certificate
  } catch (e) {
    return null
  }
}

type CertType = X509CrlEntry | X509Certificate;

const wasPrescriptionSignedAfterRevocation = (prescriptionSignedDate: Date, cert: CertType): boolean => {
  if(cert instanceof X509CrlEntry) {
    const certificateRevocationDate = cert.revocationDate
    return prescriptionSignedDate >= certificateRevocationDate
  }
  return false
}

const getRevocationList = async (crlFileUrl: string, logger: pino.Logger): Promise<X509Crl> => {
  try {
    const resp = await axios(crlFileUrl, {
      method: "GET",
      responseType: "arraybuffer",
      timeout: CRL_REQUEST_TIMEOUT_IN_MS
    })
    return new X509Crl(resp.data)
  } catch(e) {
    logger.error(`Unable to fetch CRL from ${crlFileUrl}: ${e}`)
  }
}

const getPrescriptionId = (parentPrescription: hl7V3.ParentPrescription): string => {
  return parentPrescription.id._attributes.root
}

const getRevokedCertReasonCode = (cert: X509CrlEntry): number => {
  return cert.reason
}

/**
 * returns the serial number of an X509 certificate
 * separated into standalone function for mocking in unit tests
 * @param x509Certificate
 * @returns serial number string
 */
const getX509SerialNumber = (x509Certificate: X509): string => {
  return x509Certificate?.getSerialNumberHex()
}

const getX509DistributionPointsURI = (x509Certificate: X509): Array<string> => {
  return x509Certificate.getExtCRLDistributionPointsURI()
}

const getX509IssuerId = (x509Certificate: X509): jsrsasign.Hex => {
  return x509Certificate.getExtAuthorityKeyIdentifier().kid
}

const getSubCaCerts = (): Array<string> => process.env.SUBCACC_CERT.split(",")

export {
  getCertificateFromPrescription,
  getCertificateTextFromPrescription,
  getPrescriptionId,
  getPrescriptionSignatureDate,
  getSubCaCerts,
  getX509DistributionPointsURI,
  getX509IssuerId,
  getX509SerialNumber,
  getRevokedCertReasonCode,
  getRevokedCertSerialNumber,
  wasPrescriptionSignedAfterRevocation,
  getRevocationList
}
