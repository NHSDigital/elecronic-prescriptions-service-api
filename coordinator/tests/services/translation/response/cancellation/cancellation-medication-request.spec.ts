import * as TestResources from "../../../../resources/test-resources"
import {getExtensionForUrlOrNull} from "../../../../../src/services/translation/common"
import {
  createMedicationRequest
} from "../../../../../src/services/translation/response/cancellation/cancellation-medication-request"
import {getCancellationResponse, hasCorrectISOFormat} from "../../common/test-helpers"
import {fhir} from "@models"

describe("createMedicationRequest", () => {
  const cancellationResponse = getCancellationResponse(TestResources.spineResponses.cancellationNotFoundError)
  const responsiblePartyPractitionerRoleId = "test"
  const patientId = "testPatientId"
  const authorPrescriptionRoleId = "testAuthorRoleId"
  const medicationRequest = createMedicationRequest(
    cancellationResponse,
    responsiblePartyPractitionerRoleId,
    patientId,
    authorPrescriptionRoleId)

  test("has extensions", () => {
    expect(medicationRequest.extension).not.toBeUndefined()
  })

  test("contains correct status extensions", () => {
    const extension = getExtensionForUrlOrNull(
      medicationRequest.extension,
      "https://fhir.nhs.uk/StructureDefinition/Extension-DM-PrescriptionTaskStatusReason",
      "MedicationRequest.extension"
    ) as fhir.PrescriptionStatusHistoryExtension
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

    const medicationStatusDateExtension = getExtensionForUrlOrNull(
      extension.extension,
      "statusDate",
      "") as fhir.DateTimeExtension
    expect(medicationStatusDateExtension).not.toBeUndefined()
    const valueDateTime = medicationStatusDateExtension.valueDateTime
    expect(hasCorrectISOFormat(valueDateTime)).toBe(true)
  })

  test("contains ResponsiblePractitioner extension with correct reference", () => {
    const extension = getExtensionForUrlOrNull(
      medicationRequest.extension,
      "https://fhir.nhs.uk/StructureDefinition/Extension-DM-ResponsiblePractitioner",
      "MedicationRequest.extension"
    ) as fhir.ReferenceExtension<fhir.PractitionerRole>
    expect(extension).not.toBeUndefined()
    const reference = extension.valueReference.reference
    expect(reference).toBe(`urn:uuid:${responsiblePartyPractitionerRoleId}`)
  })

  test("has identifier", () => {
    const identifier = medicationRequest.identifier
    expect(identifier).toHaveLength(1)
    expect(identifier[0].system).toBe("https://fhir.nhs.uk/Id/prescription-order-item-number")
    expect(identifier[0].value).toBe("f50c5754-0656-43cd-9dc4-af46f6451fe6")
  })

  test("has 'order' in `intent` key", () => {
    const intent = medicationRequest.intent
    expect(intent).toBe(fhir.MedicationRequestIntent.ORDER)
  })

  test("has default medication in medicationCodeableConcept", () => {
    expect(medicationRequest.medicationCodeableConcept).toEqual(
      {
        "coding":
          [
            {
              "code": "763158003",
              "system": "http://snomed.info/sct",
              "display": "Medicinal product"
            }
          ]
      }
    )
  })

  test("subject", () => {
    const subject = medicationRequest.subject
    expect(subject.reference).toBe(`urn:uuid:${patientId}`)
  })

  test("authoredOn", () => {
    expect(medicationRequest.authoredOn).toBeUndefined()
  })

  test("requester", () => {
    const requester = medicationRequest.requester
    expect(requester.reference).toBe(`urn:uuid:${authorPrescriptionRoleId}`)
  })

  test("groupIdentifier", () => {
    const groupIdentifier = medicationRequest.groupIdentifier
    expect(groupIdentifier.system).toBe("https://fhir.nhs.uk/Id/prescription-order-number")
    expect(groupIdentifier.value).toBe("CDEE6E-A83008-1BD6DO")
  })

  test("dispenseRequest", () => {
    expect(medicationRequest.dispenseRequest).toBeFalsy()
  })
})
