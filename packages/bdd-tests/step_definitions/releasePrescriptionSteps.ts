/* eslint-disable max-len */
import {Then, setDefaultTimeout} from "@cucumber/cucumber"

setDefaultTimeout(60 * 1000)

// eslint-disable-next-line @typescript-eslint/no-unused-vars
Then(/^I get no prescription released to (.*)$/, function (site) {
  expect(this.resp.data.parameter[0].resource.entry[1].resource.issue[0].details.coding[0].code).toBe("INVALID_VALUE")
  expect(this.resp.data.parameter[0].resource.entry[1].resource.issue[0].details.coding[0].display).toBe("Signature is invalid.")
})

// eslint-disable-next-line @typescript-eslint/no-unused-vars
Then(/^prescription status is (.*)$/, (status) => {
  //TODO
})

Then(/^I get (\d+) prescription\(s\) released to (.*)$/, function (_number, _site) {
  const passedPrescriptionResourceEntry = this.resp.data.parameter[0].resource.entry[0].resource
  expect(passedPrescriptionResourceEntry.entry[0].resource.destination[0].receiver.identifier.value).toBe(_site)
  expect(passedPrescriptionResourceEntry.entry[1].resource.resourceType).toBe("MedicationRequest")
  expect(passedPrescriptionResourceEntry.entry[1].resource.medicationCodeableConcept.coding[0].display).toBe(
    "Salbutamol 100micrograms/dose inhaler CFC free"
  )
  expect(passedPrescriptionResourceEntry.entry[1].resource.dispenseRequest.quantity.value).toEqual(200)
  expect(passedPrescriptionResourceEntry.entry[2].resource.medicationCodeableConcept.coding[0].display).toBe(
    "Paracetamol 500mg soluble tablets"
  )
  expect(passedPrescriptionResourceEntry.entry[2].resource.dispenseRequest.quantity.value).toEqual(60)
  expect(passedPrescriptionResourceEntry.entry[3].resource.medicationCodeableConcept.coding[0].display).toBe(
    "Methotrexate 10mg/0.2ml solution for injection pre-filled syringes"
  )
  expect(passedPrescriptionResourceEntry.entry[3].resource.dispenseRequest.quantity.value).toEqual(1)
  expect(passedPrescriptionResourceEntry.entry[4].resource.medicationCodeableConcept.coding[0].display).toBe(
    "Flucloxacillin 500mg capsules"
  )
  expect(passedPrescriptionResourceEntry.entry[4].resource.dispenseRequest.quantity.value).toEqual(28)
  expect(passedPrescriptionResourceEntry.entry[5].resource.resourceType).toBe("Patient")
  expect(passedPrescriptionResourceEntry.entry[5].resource.identifier[0].value).toBe("9449304130")
})

// eslint-disable-next-line @typescript-eslint/no-unused-vars
Then(/^(\d+) line items are returned in the response$/, (number) => {
  //TODO
})
