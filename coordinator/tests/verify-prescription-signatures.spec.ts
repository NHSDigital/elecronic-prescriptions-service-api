import {ElementCompact} from "xml-js"
import {readXml, writeXmlStringCanonicalized} from "../src/services/serialisation/xml"
import * as crypto from "crypto"
import {readFileSync} from "fs"
import * as path from "path"
import {createParametersDigest} from "../src/services/translation/request"
import {convertFragmentsToHashableFormat, extractFragments} from "../src/services/translation/request/signature"
import {specification} from "./resources/test-resources"
import * as hl7V3 from "../src/models/hl7-v3"

//eslint-disable-next-line max-len
const prescriptionPath = "../../models/examples/primary-care/acute/no-nominated-pharmacy/medical-prescriber/author/gmc/responsible-party/spurious-code/1-Convert-Response-Send-200_OK.xml"

//TODO - unskip tests once we can sign prescriptions without smartcards

test.skip("verify digest for specific prescription", () => {
  const prescriptionStr = readFileSync(path.join(__dirname, prescriptionPath), "utf-8")
  const prescriptionRoot = readXml(prescriptionStr)
  expectDigestMatchesPrescription(prescriptionRoot)
})

test.skip("verify signature for specific prescription", () => {
  const prescriptionStr = readFileSync(path.join(__dirname, prescriptionPath), "utf-8")
  const prescriptionRoot = readXml(prescriptionStr)
  expectSignatureIsValid(prescriptionRoot)
})

const cases = specification.map(examplePrescription => [
  examplePrescription.description,
  examplePrescription.hl7V3Message
])

test.skip.each(cases)("verify prescription signature for %s", (desc: string, hl7V3Message: ElementCompact) => {
  expectDigestMatchesPrescription(hl7V3Message)
  expectSignatureIsValid(hl7V3Message)
})

function expectSignatureIsValid(prescriptionRoot: ElementCompact) {
  const signatureValid = verifyPrescriptionSignatureValid(prescriptionRoot)
  console.log(`Signature valid: ${signatureValid}`)
  expect(signatureValid).toBeTruthy()
}

function expectDigestMatchesPrescription(prescriptionRoot: ElementCompact) {
  const signatureRoot = extractSignatureRootFromPrescriptionRoot(prescriptionRoot)
  const digestFromSignature = extractDigestFromSignatureRoot(signatureRoot)
  const digestFromPrescription = calculateDigestFromPrescriptionRoot(prescriptionRoot)
  const digestMatches = digestFromPrescription === digestFromSignature
  console.log(`Signature matches prescription: ${digestMatches}`)
  expect(digestMatches).toBeTruthy()
}

function verifyPrescriptionSignatureValid(prescriptionRoot: ElementCompact) {
  const signatureRoot = extractSignatureRootFromPrescriptionRoot(prescriptionRoot)
  return verifySignatureValid(signatureRoot)
}

function extractSignatureRootFromPrescriptionRoot(prescriptionRoot: ElementCompact): ElementCompact {
  // eslint-disable-next-line max-len
  const sendMessagePayload = prescriptionRoot.PORX_IN020101SM31 as hl7V3.SendMessagePayload<hl7V3.ParentPrescriptionRoot>
  const parentPrescription = sendMessagePayload.ControlActEvent.subject.ParentPrescription
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

function calculateDigestFromPrescriptionRoot(prescriptionRoot: ElementCompact) {
  // eslint-disable-next-line max-len
  const sendMessagePayload = prescriptionRoot.PORX_IN020101SM31 as hl7V3.SendMessagePayload<hl7V3.ParentPrescriptionRoot>
  const parentPrescription = sendMessagePayload.ControlActEvent.subject.ParentPrescription
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
