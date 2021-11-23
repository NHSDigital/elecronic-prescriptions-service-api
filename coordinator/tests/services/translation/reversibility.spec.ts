import {convertParentPrescription} from "../../../src/services/translation/request/prescribe/parent-prescription"
import {createInnerBundle} from "../../../src/services/translation/response/release/release-response"
import * as TestResources from "../../resources/test-resources"
import {getResourcesOfType} from "../../../src/services/translation/common/getResourcesOfType"
import {hl7V3, fhir} from "@models"
import * as uuid from "uuid"
import {toArray} from "../../../src/services/translation/common"
import pino from "pino"

const logger = pino()

describe("translations are reversible", () => {
  const originalBundle = TestResources.specification[0].fhirMessageSigned
  const parentPrescription = convertParentPrescription(originalBundle, logger)
  ensureLineItemStatus(parentPrescription)
  const translatedBundlePromise = createInnerBundle(parentPrescription, uuid.v4(), logger)

  test.skip.each([
    "MessageHeader",
    "Patient",
    "MedicationRequest",
    "CommunicationRequest",
    "List",
    "PractitionerRole",
    "Practitioner",
    "HealthcareService",
    "Location",
    "Organization",
    "Provenance"
  ])("%s", async (resourceType: string) => {
    const original = getResourcesOfType(originalBundle, resourceType)
    removeIds(...original)
    const translatedBundle = await translatedBundlePromise
    const translated = getResourcesOfType(translatedBundle, resourceType)
    removeIds(...translated)
    expect(original.length).toBeGreaterThan(0)
    expect(translated).toEqual(original)
  })
})

function removeIds(...resource: Array<fhir.Resource>) {
  resource.forEach(resource => resource.id = undefined)
}

function ensureLineItemStatus(parentPrescription: hl7V3.ParentPrescription) {
  const prescription = parentPrescription.pertinentInformation1.pertinentPrescription
  const lineItems = toArray(prescription.pertinentInformation2).map(pi2 => pi2.pertinentLineItem)
  lineItems.forEach(lineItem => {
    const itemStatus = new hl7V3.ItemStatus(hl7V3.ItemStatusCode.TO_BE_DISPENSED)
    lineItem.pertinentInformation4 = new hl7V3.LineItemPertinentInformation4(itemStatus)
  })
}
