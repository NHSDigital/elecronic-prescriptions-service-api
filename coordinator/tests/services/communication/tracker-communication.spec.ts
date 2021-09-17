import * as TestResources from "../../resources/test-resources"
import {convertDetailedJsonResponseToFhirTask} from "../../../src/services/communication/tracker/translation"

describe("translateToFhir", () => {

  it("succeeds with 1 line item", () => {
    const spineResponse = TestResources.trackerSpineResponses.success1LineItem
    const taskResponse = convertDetailedJsonResponseToFhirTask(spineResponse)
    expect(taskResponse.input[0].valueReference.identifier.value).toEqual("30b7e9cf-6f42-40a8-84c1-e61ef638eee2")
  })

  it("succeeds with many line items", () => {
    const spineResponse = TestResources.trackerSpineResponses.success2LineItems
    const taskResponse = convertDetailedJsonResponseToFhirTask(spineResponse)
    taskResponse.input.forEach((input, index) => {
      const id = taskResponse.focus.identifier.value
      expect(input.valueReference.identifier.value).toEqual(Object.keys(spineResponse[id].lineItems)[index])
    })
  })

  it("succeeds with a prescription in 'To be Dispensed' state", () => {
    const spineResponse = TestResources.trackerSpineResponses.successCreated
    const taskResponse = convertDetailedJsonResponseToFhirTask(spineResponse)
    expect(taskResponse.businessStatus.coding[0].display).toEqual("To be Dispensed")
    expect(taskResponse.businessStatus.coding[0].code).toEqual("0001")

    taskResponse.input.forEach(input => {
      expect(input.extension[0].extension).toHaveLength(2)
    })
    taskResponse.output.forEach(output => {
      expect(output.extension).toBeUndefined()
    })
  })

  it("succeeds with a prescription in 'Dispensed' state", () => {
    const spineResponse = TestResources.trackerSpineResponses.successClaimed
    const taskResponse = convertDetailedJsonResponseToFhirTask(spineResponse)
    expect(taskResponse.businessStatus.coding[0].display).toEqual("Dispensed")
    expect(taskResponse.businessStatus.coding[0].code).toEqual("0006")

    taskResponse.input.forEach(input => {
      expect(input.extension[0].extension).toHaveLength(3)
    })
    taskResponse.output.forEach(output => {
      expect(output.extension[0].extension).toHaveLength(3)
    })
  })
})
