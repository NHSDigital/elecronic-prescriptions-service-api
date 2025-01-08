import * as XmlJs from "xml-js"
import {ElementCompact} from "xml-js"
import * as fs from "fs"
import * as path from "path"
import * as LosslessJson from "lossless-json"
import {
  fetcher,
  fhir,
  hl7V3,
  spine
} from "@models"
import Hapi from "@hapi/hapi"
import {readXml, readXmlStripNamespace} from "../../src/services/serialisation/xml"
import {convertRawResponseToDetailTrackerResponse} from "../../src/services/translation/response/tracker/translation"

export const convertSuccessExamples = fetcher.convertExamples
  .filter((e) => e.isSuccess)
  .map((spec) => spec.toSuccessJestCase())

export const convertFailureExamples = fetcher.convertExamples
  .filter((e) => !e.isSuccess)
  .map((spec) => spec.toErrorJestCase())

export const dispensingValidationSchema = {
  Claim: fetcher.schemaFilePaths.filter(f => f.includes("Claim.xsd"))[0],
  DispenseNotification: fetcher.schemaFilePaths.filter(f => f.includes("DispenseNotification.xsd"))[0],
  PatientRelease: fetcher.schemaFilePaths.filter(f => f.includes("PatientRelease.xsd"))[0],
  Return: fetcher.schemaFilePaths.filter(f => f.includes("Return.xsd"))[0],
  Withdraw: fetcher.schemaFilePaths.filter(f => f.includes("Withdraw.xsd"))[0]
}

function getConvertValidationExamples(descriptionIncludes: string) {
  return fetcher.convertExamples
    .filter((e) => e.isSuccess && e.description.includes(` ${descriptionIncludes}`))
    .map((spec) => spec.toValidationJestCase())
}

export const convertSuccessClaimExamples = getConvertValidationExamples("claim")
export const convertSuccessDispenseExamples = getConvertValidationExamples("dispense")
export const convertSuccessReleaseExamples = getConvertValidationExamples("release")
export const convertSuccessReturnExamples = getConvertValidationExamples("return")
export const convertSuccessWithdrawExamples = getConvertValidationExamples("withdraw")

export class DispenseExampleLoader {
  getfhirMessageNotToBeDispensed(location: string): fhir.Bundle {
    const fhirMessageNotToBeDispensedPath = path.join(
      __dirname,
      location,
      "Process-Request-Dispense-Has-StatusReasonCodableConcept-200_OK.json"
    )
    if (fs.existsSync(fhirMessageNotToBeDispensedPath)) {
      const fhirDispenseMessage = fs.readFileSync(fhirMessageNotToBeDispensedPath, "utf-8")

      return LosslessJson.parse(fhirDispenseMessage) as fhir.Bundle
    }
  }
}
export class ExamplePrescription {
  description: string
  fhirMessageUnsigned: fhir.Bundle
  fhirMessageSigned: fhir.Bundle
  fhirMessageCancel: fhir.Bundle
  fhirMessageDispense: fhir.Bundle
  fhirMessageDispenseAmend: fhir.Bundle
  fhirMessageDigest: fhir.Parameters
  fhirMessageClaim: fhir.Claim
  fhirMessageReleaseRequest: fhir.Parameters
  fhirMessageReturnRequest: fhir.Task
  fhirMessageWithdrawRequest: fhir.Task
  hl7V3Message: ElementCompact
  hl7V3MessageCancel: ElementCompact
  hl7V3MessageDispense: ElementCompact
  hl7V3MessageDispenseAmend: ElementCompact
  hl7V3MessageClaim: ElementCompact

  hl7V3SignatureFragments?: ElementCompact
  hl7V3FragmentsCanonicalized?: string

  constructor(description: string, search: string) {
    const location = getLocation(search)

    const fhirMessageUnsignedStr = fs.readFileSync(path.join(location, "1-Prepare-Request-200_OK.json"), "utf-8")
    const fhirMessageSignedStr = fs.readFileSync(path.join(location, "1-Process-Request-Send-200_OK.json"), "utf-8")
    const fhirMessageDigestStr = fs.readFileSync(path.join(location, "1-Prepare-Response-200_OK.json"), "utf-8")
    const hl7V3MessageStr = fs.readFileSync(path.join(location, "1-Convert-Response-Send-200_OK.xml"), "utf-8")

    this.description = description
    this.fhirMessageUnsigned = LosslessJson.parse(fhirMessageUnsignedStr) as fhir.Bundle
    this.fhirMessageSigned = LosslessJson.parse(fhirMessageSignedStr) as fhir.Bundle
    this.fhirMessageDigest = LosslessJson.parse(fhirMessageDigestStr) as fhir.Parameters
    this.hl7V3Message = XmlJs.xml2js(hl7V3MessageStr, {compact: true})

    const fhirMessageCancelPath = path.join(location, "1-Process-Request-Cancel-200_OK.json")
    if (fs.existsSync(fhirMessageCancelPath)) {
      const fhirMessageCancelStr = fs.readFileSync(fhirMessageCancelPath, "utf-8")
      this.fhirMessageCancel = LosslessJson.parse(fhirMessageCancelStr) as fhir.Bundle
    }

    const hl7V3MessageCancelPath = path.join(location, "1-Convert-Response-Cancel-200_OK.xml")
    if (fs.existsSync(hl7V3MessageCancelPath)) {
      const hl7V3MessageCancelStr = fs.readFileSync(hl7V3MessageCancelPath, "utf-8")
      this.hl7V3MessageCancel = XmlJs.xml2js(hl7V3MessageCancelStr, {compact: true})
    }

    const fhirMessageDispensePath = path.join(location, "1-Process-Request-Dispense-200_OK.json")
    if (fs.existsSync(fhirMessageDispensePath)) {
      const fhirMessageDispenseStr = fs.readFileSync(fhirMessageDispensePath, "utf-8")
      this.fhirMessageDispense = LosslessJson.parse(fhirMessageDispenseStr) as fhir.Bundle
    }

    const hl7V3MessageDispensePath = path.join(location, "1-Convert-Response-Dispense-200_OK.xml")
    if (fs.existsSync(hl7V3MessageDispensePath)) {
      const hl7V3MessageDispenseStr = fs.readFileSync(hl7V3MessageDispensePath, "utf-8")
      this.hl7V3MessageDispense = XmlJs.xml2js(hl7V3MessageDispenseStr, {compact: true})
    }

    const fhirMessageDispenseAmendPath = path.join(location, "1-Process-Request-DispenseAmend-200_OK.json")
    if (fs.existsSync(fhirMessageDispenseAmendPath)) {
      const fhirMessageDispenseAmendStr = fs.readFileSync(fhirMessageDispenseAmendPath, "utf-8")
      this.fhirMessageDispense = LosslessJson.parse(fhirMessageDispenseAmendStr) as fhir.Bundle
    }

    const hl7V3MessageDispenseAmendPath = path.join(location, "1-Convert-Response-DispenseAmend-200_OK.xml")
    if (fs.existsSync(hl7V3MessageDispenseAmendPath)) {
      const hl7V3MessageDispenseStr = fs.readFileSync(hl7V3MessageDispenseAmendPath, "utf-8")
      this.hl7V3MessageDispenseAmend = XmlJs.xml2js(hl7V3MessageDispenseStr, {compact: true})
    }

    const fhirMessageClaimPath = path.join(location, "1-Claim-Request-200_OK.json")
    if (fs.existsSync(fhirMessageClaimPath)) {
      const fhirMessageClaimStr = fs.readFileSync(fhirMessageClaimPath, "utf-8")
      this.fhirMessageClaim = LosslessJson.parse(fhirMessageClaimStr) as fhir.Claim
    }

    const hl7V3MessageClaimPath = path.join(location, "1-Convert-Response-Claim-200_OK.xml")
    if (fs.existsSync(hl7V3MessageClaimPath)) {
      const hl7V3MessageClaimStr = fs.readFileSync(hl7V3MessageClaimPath, "utf-8")
      this.hl7V3MessageClaim = XmlJs.xml2js(hl7V3MessageClaimStr, {compact: true})
    }

    // TODO: Add more examples
    const fhirMessageReleaseRequestPath = path.join(location, "1-Task-Request-Release-200_OK.json")
    if (fs.existsSync(fhirMessageReleaseRequestPath)) {
      const fhirMessageReleaseRequestStr = fs.readFileSync(fhirMessageReleaseRequestPath, "utf-8")
      this.fhirMessageReleaseRequest = LosslessJson.parse(fhirMessageReleaseRequestStr) as fhir.Parameters
    }

    // TODO: Add more examples
    const fhirMessageReturnRequestPath = path.join(location, "2-Task-Request-Return-200_OK.json")
    if (fs.existsSync(fhirMessageReturnRequestPath)) {
      const fhirMessageReturnRequestStr = fs.readFileSync(fhirMessageReturnRequestPath, "utf-8")
      this.fhirMessageReturnRequest = LosslessJson.parse(fhirMessageReturnRequestStr) as fhir.Task
    }

    // TODO: Add more examples
    const fhirMessageWithdrawRequestPath = path.join(location, "3-Task-Request-Withdraw-200_OK.json")
    if (fs.existsSync(fhirMessageWithdrawRequestPath)) {
      const fhirMessageWithdrawRequestStr = fs.readFileSync(fhirMessageWithdrawRequestPath, "utf-8")
      this.fhirMessageWithdrawRequest = LosslessJson.parse(fhirMessageWithdrawRequestStr) as fhir.Task
    }
  }
}

const examplePrescription1 = new ExamplePrescription(
  "repeat dispensing",
  // eslint-disable-next-line max-len
  "secondary-care/community/repeat-dispensing/nominated-pharmacy/clinical-practitioner/multiple-medication-requests/prescriber-endorsed"
)

const hl7V3SignatureFragments1Str = fs.readFileSync(
  path.join(__dirname, "./signature-fragments/PrepareIntermediate-Hl7V3SignatureFragments.xml"),
  "utf8"
)
const hl7V3SignatureFragments1 = XmlJs.xml2js(hl7V3SignatureFragments1Str, {compact: true}) as ElementCompact
examplePrescription1.hl7V3SignatureFragments = hl7V3SignatureFragments1

const hl7V3SignatureFragmentsCanonicalized1 = fs.readFileSync(
  path.join(__dirname, "./signature-fragments/PrepareIntermediate-Hl7V3SignatureFragmentsCanonicalized.txt"),
  "utf8"
)
examplePrescription1.hl7V3FragmentsCanonicalized = hl7V3SignatureFragmentsCanonicalized1.replace("\n", "")

type ExamplePrescriptionPath = [string, string]

const examplePrescriptions: Array<ExamplePrescriptionPath> = [
  [
    "acute, nominated pharmacy",
    "secondary-care/community/acute/nominated-pharmacy/nurse/prescribing-and-professional-codes"
  ],
  ["homecare", "secondary-care/homecare/acute/nominated-pharmacy/clinical-practitioner"],
  [
    "consecutive dosage instructions",
    "secondary-care/homecare/acute/nominated-pharmacy/consecutive-dosage-instructions"
  ],
  ["concurrent dosage instructions", "secondary-care/homecare/acute/nominated-pharmacy/concurrent-dosage-instructions"],
  [
    "consecutive and concurrent dosage instructions",
    "secondary-care/homecare/acute/nominated-pharmacy/consecutive-and-concurrent-dosage-instructions"
  ],
  [
    "org-only responsible party",
    "primary-care/acute/nominated-pharmacy/responsible-party-org/separate-telecom"
  ]
]

export const specification = [
  examplePrescription1,
  ...examplePrescriptions.map(([description, path]) => new ExamplePrescription(description, path))
]

export interface ExampleSpineResponse {
  response: spine.SpineDirectResponse<string>
  hl7ErrorCode: string | undefined
  fhirErrorCode: string | undefined
  acknowledgementCode: hl7V3.AcknowledgementTypeCode
}

const asyncSuccess: ExampleSpineResponse = {
  response: {
    body: fs.readFileSync(path.join(__dirname, "./spine-responses/async_success.xml"), "utf8"),
    statusCode: 200
  },
  hl7ErrorCode: undefined,
  fhirErrorCode: undefined,
  acknowledgementCode: hl7V3.AcknowledgementTypeCode.ACKNOWLEDGED
}

const syncError: ExampleSpineResponse = {
  response: {
    body: fs.readFileSync(path.join(__dirname, "./spine-responses/sync_error.xml"), "utf8"),
    statusCode: 400
  },
  hl7ErrorCode: "202",
  fhirErrorCode: "ERROR",
  acknowledgementCode: hl7V3.AcknowledgementTypeCode.REJECTED
}

const asyncError: ExampleSpineResponse = {
  response: {
    body: fs.readFileSync(path.join(__dirname, "./spine-responses/async_error.xml"), "utf8"),
    statusCode: 400
  },
  hl7ErrorCode: "5000",
  fhirErrorCode: "FAILURE_TO_PROCESS_MESSAGE",
  acknowledgementCode: hl7V3.AcknowledgementTypeCode.ERROR
}

const syncMultipleError: ExampleSpineResponse = {
  response: {
    body: fs.readFileSync(path.join(__dirname, "./spine-responses/sync_multiple_error.xml"), "utf8"),
    statusCode: 400
  },
  hl7ErrorCode: "202",
  fhirErrorCode: "ERROR",
  acknowledgementCode: hl7V3.AcknowledgementTypeCode.REJECTED
}

const asyncMultipleError: ExampleSpineResponse = {
  response: {
    body: fs.readFileSync(path.join(__dirname, "./spine-responses/async_multiple_error.xml"), "utf8"),
    statusCode: 400
  },
  hl7ErrorCode: "5000",
  fhirErrorCode: "ERROR",
  acknowledgementCode: hl7V3.AcknowledgementTypeCode.ERROR
}

const cancellationSuccess: ExampleSpineResponse = {
  response: {
    body: fs.readFileSync(path.join(__dirname, "./spine-responses/cancel_success.xml"), "utf8"),
    statusCode: 200
  },
  hl7ErrorCode: "0001",
  fhirErrorCode: "PATIENT_DECEASED",
  acknowledgementCode: hl7V3.AcknowledgementTypeCode.ACKNOWLEDGED
}

const cancellationNotFoundError: ExampleSpineResponse = {
  response: {
    body: fs.readFileSync(path.join(__dirname, "./spine-responses/cancel_error.xml"), "utf8"),
    statusCode: 400
  },
  hl7ErrorCode: "0008",
  fhirErrorCode: "MISSING_VALUE",
  acknowledgementCode: hl7V3.AcknowledgementTypeCode.ERROR
}

const cancellationDispensedError: ExampleSpineResponse = {
  response: {
    body: fs.readFileSync(path.join(__dirname, "./spine-responses/cancel_error_dispensed.xml"), "utf8"),
    statusCode: 400
  },
  hl7ErrorCode: "0004",
  fhirErrorCode: "ERROR",
  acknowledgementCode: hl7V3.AcknowledgementTypeCode.ERROR
}

export const spineResponses = {
  success: asyncSuccess,
  singleErrors: [syncError, asyncError],
  multipleErrors: [syncMultipleError, asyncMultipleError],
  cancellationSuccess,
  cancellationNotFoundError,
  cancellationDispensedError
}

export const detailTrackerResponses = {
  success1LineItem: readDetailTrackerResponse("success-1-lineItem.json"),
  success2LineItems: readDetailTrackerResponse("success-2-lineItems.json"),
  successCreated: readDetailTrackerResponse("success-created.json"),
  successClaimed: readDetailTrackerResponse("success-claimed.json"),
  errorNoIssueNumber: readDetailTrackerResponse("error-no-issue-number.json")
}

export const summaryTrackerResponses = {
  success: readSummaryTrackerResponse("success.json")
}

function readDetailTrackerResponse(filename: string): spine.DetailTrackerResponse {
  const filePath = path.join(__dirname, `./spine-responses/tracker-responses/detail/${filename}`)
  const responseStr = fs.readFileSync(filePath, "utf8")
  const responseObj = JSON.parse(responseStr)
  return convertRawResponseToDetailTrackerResponse(responseObj)
}

function readSummaryTrackerResponse(filename: string): spine.SummaryTrackerResponse {
  const filePath = path.join(__dirname, `./spine-responses/tracker-responses/summary/${filename}`)
  const responseStr = fs.readFileSync(filePath, "utf8")
  return JSON.parse(responseStr)
}

function getLocation(search: string) {
  return fetcher.exampleFiles.filter((e) => e.dir.includes(search)).find((e) => e.number === "1").dir
}

export const validTestHeaders: Hapi.Utils.Dictionary<string> = {
  "nhsd-request-id": "test",
  "nhsd-asid": "200000001285",
  "nhsd-party-key": "T141D-822234",
  "nhsd-identity-uuid": "555254239107", //USERQ RANDOM Mr
  "nhsd-session-urid": "555254240100", //S8000:G8000:R8001 - "Clinical":"Clinical Provision":"Nurse Access Role"
  "nhsd-correlation-id": "test-correlation-id"
}

export const parentPrescriptions = {
  validSignature: readXml(
    fs.readFileSync(path.join(__dirname, "./signed-prescriptions/ValidSignature.xml"), "utf-8")
  ) as hl7V3.ParentPrescriptionRoot,
  invalidSignature: readXml(
    fs.readFileSync(path.join(__dirname, "./signed-prescriptions/SignatureIsInvalid.xml"), "utf-8")
  ) as hl7V3.ParentPrescriptionRoot,
  nonMatchingSignature: readXml(
    fs.readFileSync(path.join(__dirname, "./signed-prescriptions/SignatureDoesNotMatchPrescription.xml"), "utf-8")
  ) as hl7V3.ParentPrescriptionRoot,
  sha256Signature: readXml(
    fs.readFileSync(path.join(__dirname, "./signed-prescriptions/SignatureAlgorithmSha256.xml"), "utf-8")
  ) as hl7V3.ParentPrescriptionRoot,
  signatureCertCaNotOnArl: readXml(
    fs.readFileSync(path.join(__dirname, "./signed-prescriptions/SignatureCertCaNotOnArl.xml"), "utf-8")
  ) as hl7V3.ParentPrescriptionRoot,
  signatureCertCaOnArl: readXml(
    fs.readFileSync(path.join(__dirname, "./signed-prescriptions/SignatureCertCaOnArl.xml"), "utf-8")
  ) as hl7V3.ParentPrescriptionRoot
}

export function getExamplePrescriptionReleaseResponse(exampleResponse: string): hl7V3.PrescriptionReleaseResponse {
  const exampleStr = fs.readFileSync(
    path.join(__dirname, "../../tests/services/translation/response/release/", exampleResponse),
    "utf8"
  )
  const exampleObj = readXmlStripNamespace(exampleStr)
  return exampleObj.PORX_IN070101UK31.ControlActEvent.subject.PrescriptionReleaseResponse
}

export function getExamplePrescriptionReleaseResponseString(exampleResponse: string): string {
  const exampleStr = fs.readFileSync(
    path.join(__dirname, "../../tests/services/translation/response/release/", exampleResponse),
    "utf8"
  )
  return exampleStr
}

function getFhirResourceFromTestFile(pathToFile: string): fhir.Resource {
  const returnRequest = fs.readFileSync(path.join(__dirname, pathToFile), "utf-8")
  return LosslessJson.parse(returnRequest) as fhir.Resource
}

export function getReturnRequestTask(): fhir.Task {
  const filePath = "../../tests/resources/test-data/fhir/dispensing/Return-Request-Task-Repeat.json"
  return getFhirResourceFromTestFile(filePath) as fhir.Task
}

export function getBundleFromTestFile(pathToFile: string): fhir.Bundle {
  return getFhirResourceFromTestFile(pathToFile) as fhir.Bundle
}

export function getClaimFromTestFile(pathToFile: string): fhir.Claim {
  return getFhirResourceFromTestFile(pathToFile) as fhir.Claim
}
