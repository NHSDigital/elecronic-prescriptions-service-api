import {ThenableWebDriver, until} from "selenium-webdriver"
import {fiveTimesDefaultWaitTimeout} from "../helpers"
import {
  checkFirstReleasedPrescriptionStatusButton,
  dispenseButton,
  dispensePrescriptionAction,
  myPrescriptionsNavLink,
  prescriptionLineItemIds
} from "../locators"

export async function getPrescriptionItemIds(
  driver: ThenableWebDriver
): Promise<string[]> {
  await driver.findElement(myPrescriptionsNavLink).click()

  await driver.wait(
    until.elementsLocated(checkFirstReleasedPrescriptionStatusButton),
    fiveTimesDefaultWaitTimeout
  )

  await driver.findElement(checkFirstReleasedPrescriptionStatusButton).click()

  await driver.wait(
    until.elementsLocated(dispensePrescriptionAction),
    fiveTimesDefaultWaitTimeout
  )

  const idElements = await driver.findElements(prescriptionLineItemIds)
  const idPromises = idElements.map(element => element.getText())

  await driver.findElement(dispensePrescriptionAction).click()

  await driver.wait(
    until.elementsLocated(dispenseButton),
    fiveTimesDefaultWaitTimeout
  )

  return Promise.all(idPromises)
}
