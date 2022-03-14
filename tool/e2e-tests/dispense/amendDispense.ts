import {driver} from "../all.test"
import {
  sendPrescriptionUserJourney,
  releasePrescriptionUserJourney,
  dispensePrescriptionUserJourney,
  amendDispenseUserJourney,
  viewPrescriptionUserJourney,
  defaultWaitTimeout
} from "../helpers"
import {searchForPrescriptionUserJourney} from "../tracker/searchPrescription"
import {prescriptionNotDispensedStatus} from "../locators"
import {until} from "selenium-webdriver"

describe("firefox", () => {
  test("can amend a dispense", async () => {
    const prescriptionId = await sendPrescriptionUserJourney(driver)
    expect(prescriptionId).toBeTruthy()
    await releasePrescriptionUserJourney(driver)
    await dispensePrescriptionUserJourney(driver)
    await viewPrescriptionUserJourney(driver)
    await amendDispenseUserJourney(driver)
    await searchForPrescriptionUserJourney(driver, prescriptionId)
    await driver.wait(until.elementsLocated(prescriptionNotDispensedStatus), defaultWaitTimeout)
  })
})
