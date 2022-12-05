import {ElementCompact} from "xml-js"
import {hl7V3} from "@models"
import {writeXmlStringCanonicalized} from "../serialisation/xml"
import {convertFragmentsToHashableFormat, extractFragments} from "../translation/request/signature"
import {createParametersDigest} from "../translation/request"
import crypto from "crypto"
import {isTruthy} from "../translation/common"
import * as fs from "fs"
import * as jsrsasign from "jsrsasign"
import * as pkijs from "pkijs"
import * as asn1 from "asn1js"
import * as pvutils from "pvutils"
import * as request from "request"
import {convertHL7V3DateTimeToIsoDateTimeString} from "../translation/common/dateTime"
import {prescriptionDispenseExamples} from '../../../../models/examples/fetchers/process-example-fetcher';
import axios from 'axios'
enum CRLReasonCode {
  Unspecified = 0,
  AffiliationChanged = 3,
  Superseded = 4,
  CessationOfOperation = 5,
  CertificateHold = 6,
  RemoveFromCRL = 8,
}

function verifySignature(parentPrescription: hl7V3.ParentPrescription): Array<string> {
  const validSignatureFormat = verifySignatureHasCorrectFormat(parentPrescription)
  if (!validSignatureFormat) {

    return ["Invalid signature format"]
  }

  const errors = []

  const validSignature = verifyPrescriptionSignatureValid(parentPrescription)
  if (!validSignature) {
    errors.push("Signature is invalid")
  }

  const matchingSignature = verifySignatureDigestMatchesPrescription(parentPrescription)
  if (!matchingSignature) {
    errors.push("Signature doesn't match prescription")
  }

  const cerificateIsValid = verifyCertificate(parentPrescription)
  if (!cerificateIsValid) {
    errors.push("Certificate is invalid")
  }

  const isTrusted = verifyChain(getX509CertificateFromPerscription(parentPrescription))
  if (!isTrusted) {
    errors.push("Certificate not trusted")
  }

  return errors
}

async function verifyCertificateRevoked(parentPrescription: hl7V3.ParentPrescription): Promise<Boolean> {
  const prescriptionDate = new Date(convertHL7V3DateTimeToIsoDateTimeString(parentPrescription.effectiveTime));
  const x509Certificate = getCertificateForRevocation(parentPrescription);
  const serialNumber = x509Certificate.getSerialNumberHex();
  const distributionPointsURI = x509Certificate.getExtCRLDistributionPointsURI()
  if (distributionPointsURI.length > 0) {
    // Iterate through each CRL Distribution Endpoints

    await Promise.all(distributionPointsURI.map(async (crlFileUrl) => {
      const crtRevocationList = await getRevocationList(crlFileUrl) // 
      if (crtRevocationList) {
        const isRevoked = processRevocationList(crtRevocationList, prescriptionDate, serialNumber)
        return isRevoked
      }
    }));
  }
  // If there is no revocation List
  return false;
}

function getCertificateForRevocation(parentPrescription: hl7V3.ParentPrescription): jsrsasign.X509 {
  const signatureRoot = extractSignatureRootFromParentPrescription(parentPrescription)
  const signature = signatureRoot?.Signature
  const x509CertificateText = signature?.KeyInfo?.X509Data?.X509Certificate?._text
  const x509CertificatePem = `-----BEGIN CERTIFICATE-----\n${x509CertificateText}\n-----END CERTIFICATE-----`;

  //const x509Certificate= new jsrsasign.X509(x509CertificatePem);
  const x509Certificate = new jsrsasign.X509(
    "-----BEGIN CERTIFICATE-----\nMIIDwjCCAqqgAwIBAgIEXcmi+zANBgkqhkiG9w0BAQsFADA2MQwwCgYDVQQKEwNuaHMxCzAJBgNVBAsTAkNBMRkwFwYDVQQDExBOSFMgSU5UIExldmVsIDFEMB4XDTIwMDgxNTIxNDg1NVoXDTIyMDgxNTIyMTg1NVowTTEMMAoGA1UEChMDbmhzMQ8wDQYDVQQLEwZQZW9wbGUxLDAqBgNVBAMMIzU1NTI1MTU1MzEwM19BcnZpbmRzaGV0dHlfTmlqYW1wdXJlMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQClDsvqqOQC/gQrDH9UX3RKqSMwA27ytMx6FVTE0oznHER0osj3cJuleM/ZqKahOOqRttbmeuo5TyguJ4YDtlXoTnAohwRZDcfyMYsZe6v5vkexysTor7bzR2FCAJXGlLx67hr6CQVS5Yb1edLLoZ12FuGYR4j5z3tORyb0YWB3MQIDAQABo4IBQzCCAT8wDgYDVR0PAQH/BAQDAgZAMGUGA1UdIAEB/wRbMFkwVwYLKoY6AIl7ZgADAgAwSDBGBggrBgEFBQcCARY6aHR0cHM6Ly9wa2kubmhzLnVrL2NlcnRpZmljYXRlX3BvbGljaWVzL2NvbnRlbnRfY29tbWl0bWVudDAzBgNVHR8ELDAqMCigJqAkhiJodHRwOi8vY3JsLm5ocy51ay9pbnQvMWQvY3JsYzIuY3JsMCsGA1UdEAQkMCKADzIwMjAwODE1MjE0ODU1WoEPMjAyMjAxMDgyMjE4NTVaMB8GA1UdIwQYMBaAFKCWH4GEzT3ehFCi+kCyMx8WOTxSMB0GA1UdDgQWBBRhiixpemIrXatog0CaA1saWeOGlTAJBgNVHRMEAjAAMBkGCSqGSIb2fQdBAAQMMAobBFY4LjMDAgSwMA0GCSqGSIb3DQEBCwUAA4IBAQCEgdhe2b6zNgLeXcF5RgltHo/whVIYlMPq7H7vVfOGzVU2Y8VzELu45yICE4gi6kQuzpZw82Kr0CYaOc4YlugVuww6d+lPdskjvw9oPXnC00z1N/zbM9Tas5gNNY1tkMjXqiYkjoVD9xULCve5hnGKPErEBCxOCWFDibWJwyVw68tU7VDywvXBXowhKvP4wn6n+6p4++T84/Vp1nql3ghcuKS5dBMYY6wIC1j6NRg7RbdPlDnchebIFQ6qI+Q67g5UHgW7pHgm1TVsakCnXSYCSkwkiR7KZ+OV4abjH7K0ud1q4/oAkE25D2uExL43KWmi5gtbQJxLLWDmmUJWncLQ\n-----END CERTIFICATE-----"
  );
  return x509Certificate;
}

async function getRevocationList(crlFileUrl: string): Promise<pkijs.CertificateRevocationList> {
  let crtRevocationList: pkijs.CertificateRevocationList
  try {
    const resp = await axios({
      method: 'get',
      url: crlFileUrl,
      responseType: 'stream'
    });
    if (resp.status) {
      const asn1crl = asn1.fromBER(Buffer.from(resp.data, "base64"));
      crtRevocationList = new pkijs.CertificateRevocationList({schema: asn1crl.result})

    }

  } catch (err) {
    // Handle Error Here
    console.error(err);
  }

  // Need to await at the below line 
  // request.get( { uri: crlFileUrl, encoding: null },
  //   function (err, res, body) {
  //     const asn1crl = asn1.fromBER(Buffer.from(body, "base64"));
  //     crtRevocationList = new pkijs.CertificateRevocationList({ schema: asn1crl.result })
  //   });
  return crtRevocationList
}

function processRevocationList(crtRevocationList: pkijs.CertificateRevocationList, presCreationDate: Date, serialNumber: string): boolean {
  crtRevocationList.revokedCertificates.forEach(revokedCertificate => {
    const revocationDate = new Date(revokedCertificate.revocationDate.value);
    // Get the serial number for the revoked certificate
    const revokedCertificateSn = pvutils.bufferToHexCodes(revokedCertificate.userCertificate.valueBlock.valueHexView).toLocaleLowerCase()

    if (crtRevocationList.crlExtensions?.extensions) {
      // Check if the CRL Reason Code extension exists
      const crlExtension = revokedCertificate.crlEntryExtensions.extensions.find(ext => ext.extnID === "2.5.29.21")
      if (crlExtension) {
        const reasonCode = parseInt(crlExtension.parsedValue.valueBlock)
        if (revocationDate < presCreationDate && serialNumber === revokedCertificateSn
          && reasonCode in CRLReasonCode
        ) {
          return true
        }
      }
    }
  }
  )
  return false
}
function getX509CertificateFromPerscription(parentPrescription: hl7V3.ParentPrescription): crypto.X509Certificate {
  const signatureRoot = extractSignatureRootFromParentPrescription(parentPrescription)
  const {Signature} = signatureRoot
  const x509CertificateText = Signature.KeyInfo.X509Data.X509Certificate._text
  const x509Certificate = `-----BEGIN CERTIFICATE-----\n${x509CertificateText}\n-----END CERTIFICATE-----`
  return new crypto.X509Certificate(x509Certificate)
}

function verifyChain(x509Certificate: crypto.X509Certificate): boolean {
  const rootCert = fs.readFileSync(process.env.SUBCACC_CERT_PATH)
  const x509CertificateRoot = new crypto.X509Certificate(rootCert)
  return x509Certificate.checkIssued(x509CertificateRoot)
}

function verifySignatureHasCorrectFormat(parentPrescription: hl7V3.ParentPrescription): boolean {
  const signatureRoot = extractSignatureRootFromParentPrescription(parentPrescription)
  const signature = signatureRoot?.Signature
  const signedInfo = signature?.SignedInfo
  const signatureValue = signature?.SignatureValue?._text
  const x509Certificate = signature?.KeyInfo?.X509Data?.X509Certificate?._text
  return isTruthy(signedInfo) && isTruthy(signatureValue) && isTruthy(x509Certificate)
}

function verifySignatureDigestMatchesPrescription(parentPrescription: hl7V3.ParentPrescription): boolean {
  const signatureRoot = extractSignatureRootFromParentPrescription(parentPrescription)
  const digestOnPrescription = extractDigestFromSignatureRoot(signatureRoot)
  const calculatedDigestFromPrescription = calculateDigestFromParentPrescription(parentPrescription)
  console.log(`Digest on Prescription: ${digestOnPrescription}`)
  console.log(`Calculated digest from Prescription: ${calculatedDigestFromPrescription}`)
  return digestOnPrescription === calculatedDigestFromPrescription
}

function verifyPrescriptionSignatureValid(parentPrescription: hl7V3.ParentPrescription): boolean {
  const signatureRoot = extractSignatureRootFromParentPrescription(parentPrescription)
  return verifySignatureValid(signatureRoot)
}

function extractSignatureRootFromParentPrescription(
  parentPrescription: hl7V3.ParentPrescription
): ElementCompact {
  const pertinentPrescription = parentPrescription.pertinentInformation1.pertinentPrescription
  return pertinentPrescription.author.signatureText
}

function extractDigestFromSignatureRoot(signatureRoot: ElementCompact) {
  const signature = signatureRoot.Signature
  const signedInfo = signature.SignedInfo
  signedInfo._attributes = {
    xmlns: signature._attributes.xmlns
  }
  return writeXmlStringCanonicalized({SignedInfo: signedInfo})
}

function calculateDigestFromParentPrescription(parentPrescription: hl7V3.ParentPrescription) {
  const fragments = extractFragments(parentPrescription)
  const fragmentsToBeHashed = convertFragmentsToHashableFormat(fragments)
  const digestFromPrescriptionBase64 = createParametersDigest(fragmentsToBeHashed)
  return Buffer.from(digestFromPrescriptionBase64, "base64").toString("utf-8")
}

function verifySignatureValid(signatureRoot: ElementCompact) {
  const signatureVerifier = crypto.createVerify("RSA-SHA1")
  const digest = extractDigestFromSignatureRoot(signatureRoot)
  signatureVerifier.update(digest)
  const signature = signatureRoot.Signature
  const signatureValue = signature.SignatureValue._text
  const x509Certificate = signature.KeyInfo.X509Data.X509Certificate._text
  const x509CertificatePem = `-----BEGIN CERTIFICATE-----\n${x509Certificate}\n-----END CERTIFICATE-----`
  return signatureVerifier.verify(x509CertificatePem, signatureValue, "base64")
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function verifyCertificate(parentPrescription: hl7V3.ParentPrescription): boolean {
  // TODO: Add certificate verification
  console.log("Skipping certificate verification...")
  return true
}

export {
  extractSignatureRootFromParentPrescription,
  verifySignatureDigestMatchesPrescription,
  verifyPrescriptionSignatureValid,
  verifySignatureHasCorrectFormat,
  verifyCertificate,
  verifySignature,
  verifyChain,
  verifyCertificateRevoked
}
