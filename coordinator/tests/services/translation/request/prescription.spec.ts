import {addEmptyCommunicationRequestToBundle, addEmptyListToBundle, clone} from "../../../resources/test-helpers"
import * as TestResources from "../../../resources/test-resources"
import {
  convertBundleToPrescription,
  convertCourseOfTherapyType,
  convertPrescriptionComponent1,
  convertRepeatNumber,
  extractReviewDate
} from "../../../../src/services/translation/request/prescription"
import * as translator from "../../../../src/services/translation/request"
import {
  getCommunicationRequests,
  getLists,
  getMedicationRequests
} from "../../../../src/services/translation/common/getResourcesOfType"
import {getExtensionForUrl, toArray} from "../../../../src/services/translation/common"
import {setCourseOfTherapyTypeCode} from "./course-of-therapy-type.spec"
import {hl7V3, fhir} from "@models"
import pino from "pino"

const logger = pino()

describe("convertCourseOfTherapyType", () => {
  const cases = [
    ["acute", "0001"],
    ["continuous", "0002"],
    ["continuous-repeat-dispensing", "0003"]
  ]

  test.each(cases)(
    "when first therapy type code is %p, convertCourseOfTherapyType returns prescription treatment type code %p",
    (code: fhir.CourseOfTherapyTypeCode, expected: string) => {
      const bundle = clone(TestResources.examplePrescription1.fhirMessageUnsigned)
      const fhirMedicationRequests = getMedicationRequests(bundle)
      fhirMedicationRequests.map(medicationRequest => setCourseOfTherapyTypeCode(medicationRequest, code))

      const treatmentTypeCode = convertCourseOfTherapyType(fhirMedicationRequests).value._attributes.code

      expect(treatmentTypeCode).toEqual(expected)
    }
  )
})

describe("PertinentInformation2", () => {
  let bundle: fhir.Bundle
  let fhirCommunicationRequests: Array<fhir.CommunicationRequest>
  let fhirLists: Array<fhir.List>

  beforeEach(() => {
    bundle = getBundleWithEmptyCommunicationRequestAndList()
    fhirCommunicationRequests = getCommunicationRequests(bundle)
    fhirLists = getLists(bundle)
  })

  function getBundleWithEmptyCommunicationRequestAndList() {
    const result = clone(TestResources.examplePrescription1.fhirMessageUnsigned)
    result.entry = result.entry.filter((entry) =>
      entry.resource.resourceType !== "CommunicationRequest" && entry.resource.resourceType !== "List"
    )
    addEmptyCommunicationRequestToBundle(result)
    addEmptyListToBundle(result)
    return result
  }

  function toListEntries(...display: Array<string>): Array<fhir.ListEntry> {
    return display.map(display => ({item: {display}}))
  }

  test("Medication comes from contentReference and displays correctly", () => {
    fhirLists[0].entry = toListEntries("Medication 1", "Medication 2")
    fhirCommunicationRequests[0].payload.push({contentReference: {reference: `urn:uuid:${fhirLists[0].id}`}})

    const pertinentInformation2Array = toArray(convertBundleToPrescription(bundle).pertinentInformation2)

    const firstPertinentInformation2 = pertinentInformation2Array[0]
    const additionalInstructions = firstPertinentInformation2.pertinentLineItem.pertinentInformation1
      .pertinentAdditionalInstructions.value._text
    const expected = `<medication>Medication 1</medication><medication>Medication 2</medication>`
    expect(additionalInstructions).toContain(expected)
  })

  test("CommunicationRequest with multiple contentReferences displays correctly", () => {
    addEmptyListToBundle(bundle)
    fhirLists = getLists(bundle)
    fhirLists[0].entry = toListEntries("Medication 1", "Medication 2")
    fhirLists[1].entry = toListEntries("Medication 3", "Medication 4")
    fhirCommunicationRequests[0].payload.push(
      {contentReference: {reference: `urn:uuid:${fhirLists[0].id}`}},
      {contentReference: {reference: `urn:uuid:${fhirLists[1].id}`}}
    )

    const pertinentInformation2Array = toArray(convertBundleToPrescription(bundle).pertinentInformation2)

    const firstPertinentInformation2 = pertinentInformation2Array[0]
    const additionalInstructions = firstPertinentInformation2.pertinentLineItem.pertinentInformation1
      .pertinentAdditionalInstructions.value._text
    const expected = "<medication>Medication 1</medication><medication>Medication 2</medication>"
      + "<medication>Medication 3</medication><medication>Medication 4</medication>"
    expect(additionalInstructions).toContain(expected)
  })

  test("PatientInfo comes from contentString and displays correctly", () => {
    const contentString = "examplePatientInfo"
    fhirCommunicationRequests[0].payload.push({contentString: contentString})

    const pertinentInformation2Array = toArray(convertBundleToPrescription(bundle).pertinentInformation2)

    const firstPertinentInformation2 = pertinentInformation2Array[0]
    const additionalInstructions = firstPertinentInformation2.pertinentLineItem.pertinentInformation1
      .pertinentAdditionalInstructions.value._text
    const expected = `<patientInfo>${contentString}</patientInfo>`
    expect(additionalInstructions).toContain(expected)
  })

  test("CommunicationRequest with multiple contentStrings display correctly", () => {
    const contentString1 = "examplePatientInfo1"
    const contentString2 = "secondExamplePatientInfo"
    fhirCommunicationRequests[0].payload.push({contentString: contentString1}, {contentString: contentString2})

    const pertinentInformation2Array = toArray(convertBundleToPrescription(bundle).pertinentInformation2)

    const firstPertinentInformation2 = pertinentInformation2Array[0]
    const additionalInstructions = firstPertinentInformation2.pertinentLineItem.pertinentInformation1
      .pertinentAdditionalInstructions.value._text
    expect(
      additionalInstructions
    ).toContain(
      `<patientInfo>${contentString1}</patientInfo><patientInfo>${contentString2}</patientInfo>`
    )
  })

  test("CommunicationRequest with contentReference and contentString displays correctly", () => {
    fhirLists[0].entry = toListEntries("Medication 1", "Medication 2")
    fhirCommunicationRequests[0].payload.push(
      {contentReference: {reference: `urn:uuid:${fhirLists[0].id}`}},
      {contentString: "examplePatientInfo"}
    )

    const pertinentInformation2Array = toArray(convertBundleToPrescription(bundle).pertinentInformation2)

    const firstPertinentInformation2 = pertinentInformation2Array[0]
    const additionalInstructions = firstPertinentInformation2.pertinentLineItem.pertinentInformation1
      .pertinentAdditionalInstructions.value._text
    const expected = "<medication>Medication 1</medication><medication>Medication 2</medication>" +
      "<patientInfo>examplePatientInfo</patientInfo>"
    expect(additionalInstructions).toContain(expected)
  })

  test("Multiple CommunicationRequests display correctly", () => {
    addEmptyCommunicationRequestToBundle(bundle)
    fhirCommunicationRequests = getCommunicationRequests(bundle)
    fhirLists[0].entry = toListEntries("Medication 1", "Medication 2")
    fhirCommunicationRequests[0].payload.push({contentReference: {reference: `urn:uuid:${fhirLists[0].id}`}})
    fhirCommunicationRequests[1].payload.push({contentString: "examplePatientInfo"})

    const pertinentInformation2Array = toArray(convertBundleToPrescription(bundle).pertinentInformation2)

    const firstPertinentInformation2 = pertinentInformation2Array[0]
    const additionalInstructions = firstPertinentInformation2.pertinentLineItem.pertinentInformation1
      .pertinentAdditionalInstructions.value._text
    const expected = "<medication>Medication 1</medication><medication>Medication 2</medication>" +
      "<patientInfo>examplePatientInfo</patientInfo>"
    expect(additionalInstructions).toContain(expected)
  })

  test("Missing payload is handled", () => {
    delete fhirCommunicationRequests[0].payload

    const pertinentInformation2Array = toArray(convertBundleToPrescription(bundle).pertinentInformation2)

    const firstPertinentInformation2 = pertinentInformation2Array[0]
    const pertinentInformation1 = firstPertinentInformation2.pertinentLineItem.pertinentInformation1
    expect(pertinentInformation1).toBeFalsy()
  })

  test("Missing contentString is handled", () => {
    fhirCommunicationRequests[0].payload.push({contentString: undefined})

    const pertinentInformation2Array = toArray(convertBundleToPrescription(bundle).pertinentInformation2)

    const firstPertinentInformation2 = pertinentInformation2Array[0]
    const pertinentInformation1 = firstPertinentInformation2.pertinentLineItem.pertinentInformation1
    expect(pertinentInformation1).toBeFalsy()
  })

  test("Missing contentReference is handled", () => {
    fhirCommunicationRequests[0].payload.push({contentReference: undefined})

    const pertinentInformation2Array = toArray(convertBundleToPrescription(bundle).pertinentInformation2)

    const firstPertinentInformation2 = pertinentInformation2Array[0]
    const pertinentInformation1 = firstPertinentInformation2.pertinentLineItem.pertinentInformation1
    expect(pertinentInformation1).toBeFalsy()
  })

  test("Missing contentString and contentReference is handled", () => {
    fhirCommunicationRequests[0].payload.push({contentString: undefined})

    const pertinentInformation2Array = toArray(convertBundleToPrescription(bundle).pertinentInformation2)

    const firstPertinentInformation2 = pertinentInformation2Array[0]
    const pertinentInformation1 = firstPertinentInformation2.pertinentLineItem.pertinentInformation1
    expect(pertinentInformation1).toBeFalsy()
  })

  test("Missing entry is handled", () => {
    delete fhirLists[0].entry
    fhirCommunicationRequests[0].payload.push({contentReference: {reference: `urn:uuid:${fhirLists[0].id}`}})

    const pertinentInformation2Array = toArray(convertBundleToPrescription(bundle).pertinentInformation2)

    const firstPertinentInformation2 = pertinentInformation2Array[0]
    const pertinentInformation1 = firstPertinentInformation2.pertinentLineItem.pertinentInformation1
    expect(pertinentInformation1).toBeFalsy()
  })

  test("Missing item is handled", () => {
    fhirLists[0].entry = [{item: undefined}]
    fhirCommunicationRequests[0].payload.push({contentReference: {reference: `urn:uuid:${fhirLists[0].id}`}})

    const pertinentInformation2Array = toArray(convertBundleToPrescription(bundle).pertinentInformation2)

    const firstPertinentInformation2 = pertinentInformation2Array[0]
    const pertinentInformation1 = firstPertinentInformation2.pertinentLineItem.pertinentInformation1
    expect(pertinentInformation1).toBeFalsy()
  })

  test("Missing display is handled", () => {
    fhirLists[0].entry = [{item: {display: undefined}}]
    fhirCommunicationRequests[0].payload.push({contentReference: {reference: `urn:uuid:${fhirLists[0].id}`}})

    const pertinentInformation2Array = toArray(convertBundleToPrescription(bundle).pertinentInformation2)

    const firstPertinentInformation2 = pertinentInformation2Array[0]
    const pertinentInformation1 = firstPertinentInformation2.pertinentLineItem.pertinentInformation1
    expect(pertinentInformation1).toBeFalsy()
  })

  function ensureAtLeast2MedicationRequests(bundle: fhir.Bundle) {
    const fhirMedicationRequests = getMedicationRequests(bundle)
    if (fhirMedicationRequests.length === 1)
      bundle.entry.push({resource: fhirMedicationRequests[0]})
  }

  test("PatientInfo included in first LineItem only", () => {
    const contentString = "examplePatientInfo1"
    const expected = `<patientInfo>${contentString}</patientInfo>`
    fhirCommunicationRequests[0].payload.push({contentString: contentString})
    ensureAtLeast2MedicationRequests(bundle)

    const pertinentInformation2Array = toArray(convertBundleToPrescription(bundle).pertinentInformation2)
    const pertinentInformation1Array = pertinentInformation2Array
      .map((pertinentInformation2) => pertinentInformation2.pertinentLineItem.pertinentInformation1)

    const firstPertinentInformation1 = pertinentInformation1Array.shift()
    expect(firstPertinentInformation1.pertinentAdditionalInstructions.value._text).toContain(expected)

    pertinentInformation1Array.forEach(checkValueDoesNotContainExpected)

    function checkValueDoesNotContainExpected(pertinentInformation1: hl7V3.LineItemPertinentInformation1) {
      const actual = pertinentInformation1?.pertinentAdditionalInstructions?.value?._text
      if (actual)
        expect(actual).not.toContain(expected)
    }
  })

  test("Medication included in first LineItem only", () => {
    const expected = `<medication>Medication 1</medication><medication>Medication 2</medication>`
    fhirLists[0].entry = toListEntries("Medication 1", "Medication 2")
    fhirCommunicationRequests[0].payload.push({contentReference: {reference: `urn:uuid:${fhirLists[0].id}`}})
    ensureAtLeast2MedicationRequests(bundle)

    const pertinentInformation2Array = toArray(convertBundleToPrescription(bundle).pertinentInformation2)
    const pertinentInformation1Array = pertinentInformation2Array
      .map((pertinentInformation2) => pertinentInformation2.pertinentLineItem.pertinentInformation1)

    const firstPertinentInformation1 = pertinentInformation1Array.shift()
    expect(firstPertinentInformation1.pertinentAdditionalInstructions.value._text).toContain(expected)

    pertinentInformation1Array.forEach(checkValueDoesNotContainExpected)

    function checkValueDoesNotContainExpected(pertinentInformation1: hl7V3.LineItemPertinentInformation1) {
      const actual = pertinentInformation1?.pertinentAdditionalInstructions?.value?._text
      if (actual)
        expect(actual).not.toContain(expected)
    }
  })

  test("additionalInfo XML escaped after final conversion", async() => {
    const contentString1 = "examplePatientInfo1"
    fhirCommunicationRequests[0].payload.push({contentString: contentString1})

    const result = (await translator.convertBundleToSpineRequest(bundle, "test", logger)).message
    expect(result).toContain(`&lt;patientInfo&gt;${contentString1}&lt;/patientInfo&gt;`)
    expect(result).not.toContain(`<patientInfo>${contentString1}</patientInfo>`)
  })
})

describe("extractReviewDate returns the correct value", () => {
  let medicationRequest: fhir.MedicationRequest
  beforeEach(() => {
    const prescription = clone(TestResources.examplePrescription1.fhirMessageUnsigned)
    medicationRequest = getMedicationRequests(prescription)[0]
  })

  test("for a medication request with a review date", () => {
    setReviewDate(medicationRequest, "2020-09-03")
    const converted = extractReviewDate(medicationRequest)
    expect(converted).toEqual("2020-09-03")
  })

  test("for a medication request with repeat information but without a review date", () => {
    clearRepeatInformationField(medicationRequest, "authorisationExpiryDate")
    const converted = extractReviewDate(medicationRequest)
    expect(converted).toBeFalsy()
  })

  test("for a medication request without repeat information", () => {
    clearRepeatInformation(medicationRequest)
    const converted = extractReviewDate(medicationRequest)
    expect(converted).toBeFalsy()
  })
})

function setReviewDate(medicationRequest: fhir.MedicationRequest, newReviewDate: string) {
  const repeatInformationExtension = getExtensionForUrl(
    medicationRequest.extension,
    "https://fhir.hl7.org.uk/StructureDefinition/Extension-UKCore-MedicationRepeatInformation",
    "MedicationRequest.extension"
  ) as fhir.RepeatInformationExtension
  const reviewDateExtension = getExtensionForUrl(
    repeatInformationExtension.extension,
    "authorisationExpiryDate",
    "MedicationRequest.extension.extension"
  ) as fhir.DateTimeExtension
  reviewDateExtension.valueDateTime = newReviewDate
}

function clearRepeatInformation(medicationRequest: fhir.MedicationRequest) {
  const repeatInformationExtension = getExtensionForUrl(
    medicationRequest.extension,
    "https://fhir.hl7.org.uk/StructureDefinition/Extension-UKCore-MedicationRepeatInformation",
    "MedicationRequest.extension"
  ) as fhir.RepeatInformationExtension
  medicationRequest.extension.splice(medicationRequest.extension.indexOf(repeatInformationExtension), 1)
}

function clearRepeatInformationField(medicationRequest: fhir.MedicationRequest, url: string) {
  const repeatInformationExtension = getExtensionForUrl(
    medicationRequest.extension,
    "https://fhir.hl7.org.uk/StructureDefinition/Extension-UKCore-MedicationRepeatInformation",
    "MedicationRequest.extension"
  ) as fhir.RepeatInformationExtension
  const reviewDateExtension = getExtensionForUrl(
    repeatInformationExtension.extension,
    url,
    "MedicationRequest.extension.extension"
  ) as fhir.DateTimeExtension | fhir.UnsignedIntExtension
  repeatInformationExtension.extension.splice(repeatInformationExtension.extension.indexOf(reviewDateExtension), 1)
}

describe("createRepeatNumberForMedicationRequests", () => {
  let medicationRequests: Array<fhir.MedicationRequest>
  beforeEach(() => {
    const prescription = clone(TestResources.examplePrescription1.fhirMessageUnsigned)
    medicationRequests = getMedicationRequests(prescription)
  })

  test("does nothing for acute prescriptions", () => {
    medicationRequests.forEach(medicationRequest =>
      setCourseOfTherapyTypeCode(medicationRequest, fhir.CourseOfTherapyTypeCode.ACUTE)
    )

    const repeatNumber = convertRepeatNumber(medicationRequests)

    expect(repeatNumber).toBeNull()
  })

  test("does nothing for mixed acute / repeat prescribing prescriptions", () => {
    setCourseOfTherapyTypeCode(medicationRequests[0], fhir.CourseOfTherapyTypeCode.CONTINUOUS)
    setCourseOfTherapyTypeCode(medicationRequests[1], fhir.CourseOfTherapyTypeCode.CONTINUOUS)
    setCourseOfTherapyTypeCode(medicationRequests[2], fhir.CourseOfTherapyTypeCode.ACUTE)
    setCourseOfTherapyTypeCode(medicationRequests[3], fhir.CourseOfTherapyTypeCode.ACUTE)

    const repeatNumber = convertRepeatNumber(medicationRequests)

    expect(repeatNumber).toBeNull()
  })

  test("sets 1-1 for repeat prescribing prescriptions", () => {
    medicationRequests.forEach(medicationRequest =>
      setCourseOfTherapyTypeCode(medicationRequest, fhir.CourseOfTherapyTypeCode.CONTINUOUS)
    )

    const repeatNumber = convertRepeatNumber(medicationRequests)

    expect(repeatNumber?.low?._attributes?.value).toEqual("1")
    expect(repeatNumber?.high?._attributes?.value).toEqual("1")
  })

  test("sets 1-X for repeat dispensing prescriptions with consistent repeat numbers X", () => {
    medicationRequests.forEach(medicationRequest =>
      setCourseOfTherapyTypeCode(medicationRequest, fhir.CourseOfTherapyTypeCode.CONTINUOUS_REPEAT_DISPENSING)
    )

    const repeatNumber = convertRepeatNumber(medicationRequests)

    expect(repeatNumber?.low?._attributes?.value).toEqual("1")
    expect(repeatNumber?.high?._attributes?.value).toEqual("6")
  })

  test("throws for repeat dispensing prescriptions where repeat number is missing", () => {
    medicationRequests.forEach(medicationRequest => {
      setCourseOfTherapyTypeCode(medicationRequest, fhir.CourseOfTherapyTypeCode.CONTINUOUS_REPEAT_DISPENSING)
      clearRepeatInformationField(medicationRequest, "numberOfRepeatPrescriptionsAllowed")
    })

    expect(() => {
      convertRepeatNumber(medicationRequests)
    }).toThrow()
  })

  test("throws for repeat dispensing prescriptions where repeat information is missing", () => {
    medicationRequests.forEach(medicationRequest => {
      setCourseOfTherapyTypeCode(medicationRequest, fhir.CourseOfTherapyTypeCode.CONTINUOUS_REPEAT_DISPENSING)
      clearRepeatInformation(medicationRequest)
    })

    expect(() => {
      convertRepeatNumber(medicationRequests)
    }).toThrow()
  })
})

describe("convertPrescriptionComponent1", () => {
  const validityPeriod = {
    start: "2020-09-03",
    end: "2021-03-03"
  }

  const expectedSupplyDuration = {
    value: "28",
    unit: "days",
    code: "d"
  }

  test("works when validityPeriod and expectedSupplyDuration are specified", () => {
    const converted = convertPrescriptionComponent1(validityPeriod, expectedSupplyDuration)

    expect(converted.daysSupply.effectiveTime?.low?._attributes?.value).toEqual("20200903")
    expect(converted.daysSupply.effectiveTime?.high?._attributes?.value).toEqual("20210303")
    expect(converted.daysSupply.expectedUseTime?.width?._attributes?.value).toEqual("28")
  })

  test("throws error when expectedSupplyDuration is specified in units other than days", () => {
    expect(() => {
      convertPrescriptionComponent1(null, {
        value: "2419200",
        unit: "seconds",
        code: "s"
      })
    }).toThrow()
  })

  test("is not called for an acute prescription", () => {
    const prescription = clone(TestResources.examplePrescription2.fhirMessageUnsigned)
    getMedicationRequests(prescription).forEach(medicationRequest => {
      medicationRequest.dispenseRequest.validityPeriod = validityPeriod
      medicationRequest.dispenseRequest.expectedSupplyDuration = expectedSupplyDuration
    })
    const result = convertBundleToPrescription(prescription)
    expect(result.component1).toBeFalsy()
  })
})
