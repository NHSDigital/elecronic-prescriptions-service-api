import * as TestResources from "../../../resources/test-resources"
import {
  getExtensionForUrlOrNull,
  SPINE_CANCELLATION_ERROR_RESPONSE_REGEX
} from "../../../../src/services/translation/common"
import * as fhir from "../../../../src/models/fhir/fhir-resources"
import {
  createMedicationRequest
} from "../../../../src/services/translation/cancellation/cancellation-medication-conversion"
import {readXml} from "../../../../src/services/serialisation/xml"
import {SpineCancellationResponse} from "../../../../src/models/hl7-v3/hl7-v3-spine-response"

describe("createMedicationRequest", () => {
  const actualError = TestResources.spineResponses.cancellationError
  const cancelResponse = SPINE_CANCELLATION_ERROR_RESPONSE_REGEX.exec(actualError.response.body)[0]
  const medicationRequest = createMedicationRequest(readXml(cancelResponse) as SpineCancellationResponse)

  test("has extensions", () => {
    expect(medicationRequest.extension).not.toBeUndefined()
  })

  test("contains medicationrequest-status-history extension with correct code and display", () => {
    const extension = getExtensionForUrlOrNull(
      medicationRequest.extension,
      "https://fhir.nhs.uk/R4/StructureDefinition/Extension-DM-PrescriptionStatusHistory",
      "MedicationRequest.extension"
    ) as fhir.ExtensionExtension
    expect(extension).not.toBeUndefined()
    const medicationStatusHistoryExtension = getExtensionForUrlOrNull(
      extension.extension,
      "status",
      "") as fhir.CodingExtension
    expect(medicationStatusHistoryExtension).not.toBeUndefined()
    const valueCoding = medicationStatusHistoryExtension.valueCoding
    expect(valueCoding.system).toBe("https://fhir.nhs.uk/CodeSystem/medicationrequest-status-history")
    expect(valueCoding.code).toBe("R-0008")
    expect(valueCoding.display).toBe("Prescription/item not found")
  })

  test("has 'order' in `intent` key", () => {
    expect(medicationRequest.intent).toBe("order")
  })

  test("has default medication in medicationCodeableConcept", () => {
    expect(medicationRequest.medicationCodeableConcept).toEqual(
      {
        "coding":
          [
            {"code": "763158003",
              "system": "http://snomed.info/sct",
              "display": "Medicinal product"
            }
          ]
      }
    )
  })
})
