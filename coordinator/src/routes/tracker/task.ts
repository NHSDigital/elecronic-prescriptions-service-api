import Hapi from "@hapi/hapi"
import {fhir, validationErrors} from "@models"
import {BASE_PATH, ContentTypes} from "../util"
import {getStatusCode} from "../../utils/status-code"
import {trackerClient} from "../../services/communication/tracker"
import * as uuid from "uuid"
import {convertMomentToISODate, convertMomentToISODateTime} from "../../services/translation/common/dateTime"
import moment from "moment"
import * as LosslessJson from "lossless-json"
import {convertDetailedJsonResponseToFhirTask} from "../../services/communication/tracker/translation"
import {RequestHeaders} from "../../utils/headers"

const CODEABLE_CONCEPT_PRESCRIPTION = fhir.createCodeableConcept(
  "http://snomed.info/sct",
  "16076005",
  "Prescription"
)
const CODEABLE_CONCEPT_DISPENSING_MEDICATION = fhir.createCodeableConcept(
  "http://snomed.info/sct",
  "373784005",
  "Dispensing medication"
)
const VALID_QUERY_PARAMS = ["identifier", "focus:identifier"]

export default [{
  method: "GET",
  path: `${BASE_PATH}/Task`,
  handler: async (
    request: Hapi.Request, responseToolkit: Hapi.ResponseToolkit
  ): Promise<Hapi.Lifecycle.ReturnValue> => {
    const queryParams = request.query

    const issues = validateQueryParameters(queryParams)
    if (issues.length) {
      const response = fhir.createOperationOutcome(issues)
      const statusCode = getStatusCode(issues)
      return responseToolkit.response(response).code(statusCode).type(ContentTypes.FHIR)
    } else {
      const validatedParams = queryParams as { [key: string]: string }
      const prescriptionIdentifier = validatedParams["focus:identifier"] || validatedParams["identifier"]

      const spineResponse = await trackerClient.getPrescription(prescriptionIdentifier, request.headers, request.logger)
      if (request.headers[RequestHeaders.RAW_RESPONSE]) {
        return responseToolkit
          .response(spineResponse.toString())
          .code(200)
          .type(ContentTypes.JSON)
      } else {
        try {
          const translatedResponse = convertDetailedJsonResponseToFhirTask(spineResponse)
          return responseToolkit
            .response({spineResponse, translatedResponse})
            .code(200)
            .type(ContentTypes.FHIR)
        } catch (err) {
          return responseToolkit
            .response({spineResponse, err})
            .code(200)
            .type(ContentTypes.JSON)
        }
      }
    }
  }

}]

export const validateQueryParameters = (queryParams: Hapi.RequestQuery): Array<fhir.OperationOutcomeIssue> => {
  const validQueryParamsFound = VALID_QUERY_PARAMS.filter(param => queryParams[param])
  if (validQueryParamsFound.length === 0) {
    return [validationErrors.createMissingQueryParameterIssue(VALID_QUERY_PARAMS)]
  }

  const duplicatedParams = validQueryParamsFound.some(param => Array.isArray(queryParams[param]))
  if (duplicatedParams) {
    return [validationErrors.invalidQueryParameterCombinationIssue]
  }

  if (validQueryParamsFound.includes("identifier") && validQueryParamsFound.includes("focus:identifier")) {
    return [validationErrors.invalidQueryParameterCombinationIssue]
  }
  return []
}

/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
const createSandboxSuccessResponse = (prescriptionId: string): fhir.Task => {
  const lastIssueDispensedDate = convertMomentToISODate(moment.utc().subtract(1, "month"))
  return {
    resourceType: "Task",
    id: uuid.v4(),
    extension: [
      createPrescriptionExtension(),
      createRepeatInformationExtension()
    ],
    meta: {
      lastUpdated: convertMomentToISODateTime(moment.utc())
    },
    identifier: [
      fhir.createIdentifier("https://tools.ietf.org/html/rfc4122", uuid.v4())
    ],
    status: fhir.TaskStatus.IN_PROGRESS,
    businessStatus: fhir.createCodeableConcept(
      "https://fhir.nhs.uk/CodeSystem/EPS-task-business-status",
      "0002",
      "With Dispenser"
    ),
    intent: fhir.TaskIntent.ORDER,
    code: fhir.createCodeableConcept(
      "https://fhir.nhs.uk/CodeSystem/message-event",
      "prescription-order",
      "Prescription Order"
    ),
    focus: fhir.createIdentifierReference(
      fhir.createIdentifier("https://fhir.nhs.uk/Id/prescription-order-number", prescriptionId)
    ),
    for: fhir.createIdentifierReference(
      fhir.createIdentifier("https://fhir.nhs.uk/Id/nhs-number", "9912003489")
    ),
    requester: fhir.createIdentifierReference(
      fhir.createIdentifier("https://fhir.nhs.uk/Id/ods-organization-code", "C81007"),
      "VERNON STREET MEDICAL CTR"
    ),
    owner: fhir.createIdentifierReference(
      fhir.createIdentifier("https://fhir.nhs.uk/Id/ods-organization-code", "FA666"),
      "CROYDON PHARMACY"
    ),
    authoredOn: convertMomentToISODateTime(moment.utc().subtract(3, "month")),
    input: [{
      extension: [
        createDispensingInformationExtension(lastIssueDispensedDate)
      ],
      type: CODEABLE_CONCEPT_PRESCRIPTION,
      valueReference: fhir.createIdentifierReference(
        fhir.createIdentifier("https://tools.ietf.org/html/rfc4122", uuid.v4())
      )
    }],
    output: [{
      extension: [
        createDispensingReleaseInformationExtension(lastIssueDispensedDate)
      ],
      type: CODEABLE_CONCEPT_DISPENSING_MEDICATION,
      valueReference: fhir.createIdentifierReference(
        fhir.createIdentifier("https://tools.ietf.org/html/rfc4122", uuid.v4())
      )
    }]
  }
}

function createPrescriptionExtension() {
  const prescriptionExtension: fhir.PrescriptionExtension = {
    url: "https://fhir.nhs.uk/StructureDefinition/Extension-EPS-Prescription",
    extension: [{
      url: "courseOfTherapyType",
      valueCoding: {
        system: "https://fhir.nhs.uk/CodeSystem/medicationrequest-course-of-therapy",
        code: "continuous-repeat-dispensing",
        display: "Continuous long term (repeat dispensing)"
      }
    }]
  }
  return prescriptionExtension
}

function createRepeatInformationExtension() {
  const repeatInformationExtension: fhir.RepeatInformationExtension = {
    url: "https://fhir.nhs.uk/StructureDefinition/Extension-EPS-RepeatInformation",
    extension: [
      {
        url: "numberOfRepeatsAllowed",
        valueUnsignedInt: new LosslessJson.LosslessNumber(6)
      },
      {
        url: "numberOfRepeatsIssued",
        valueUnsignedInt: new LosslessJson.LosslessNumber(3)
      }
    ]
  }
  return repeatInformationExtension
}

function createDispensingInformationExtension(lastIssueDispensedDate: string) {
  const dispensingInformationExtension: fhir.DispensingInformationExtension = {
    url: "https://fhir.nhs.uk/StructureDefinition/Extension-EPS-DispensingInformation",
    extension: [
      {
        url: "dispenseStatus",
        valueCoding: fhir.createCoding(
          "https://fhir.nhs.uk/CodeSystem/EPS-task-business-status",
          "0002",
          "With Dispenser"
        )
      },
      {
        url: "dateLastDispensed",
        valueDate: lastIssueDispensedDate
      }
    ]
  }
  return dispensingInformationExtension
}

function createDispensingReleaseInformationExtension(lastIssueDispensedDate: string) {
  const dispensingReleaseInformationExtension: fhir.DispensingReleaseInformationExtension = {
    url: "https://fhir.nhs.uk/StructureDefinition/Extension-EPS-DispensingReleaseInformation",
    extension: [{
      url: "dateLastIssuedDispensed",
      valueDate: lastIssueDispensedDate
    }]
  }
  return dispensingReleaseInformationExtension
}
