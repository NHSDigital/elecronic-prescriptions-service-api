import {Key, ThenableWebDriver, until} from "selenium-webdriver"
import {driver} from "../all.test"
import {createPrescription, defaultWaitTimeout, loginViaSimulatedAuthSmartcardUser, tenTimesDefaultWaitTimeout} from "../helpers"
import {sendPageTitle} from "../locators"
import {loadClinicalTestPack1Examples} from "../test-packs/test-packs"

describe("firefox", () => {
  test.skip("can navigate through paginated prescription summaries", async () => {
    await loginViaSimulatedAuthSmartcardUser(driver)
    await createPrescription(driver)
    await loadClinicalTestPack1Examples(driver)
    await driver.wait(until.elementsLocated(sendPageTitle), tenTimesDefaultWaitTimeout)

    const startingPrescriptionId = await getCurrentPrescriptionId(driver)
    const nextPrescriptionId = await getNextPrescriptionId(driver)
    await checkPageIsShowingCurrentPrescription(driver, startingPrescriptionId)
    await loadTheNextPrescription(driver)
    await checkPageIsShowingNextPrescription(driver, nextPrescriptionId)
    const previousPrescriptionId = await getPreviousPrescriptionId(driver)
    await loadThePreviousPrescription(driver)
    await checkPageIsShowingThePreviousPrescription(driver, previousPrescriptionId)
    checkPreviousPrescriptionIsTheStartingPrescription(previousPrescriptionId, startingPrescriptionId)
  })
})

async function getCurrentPrescriptionId(driver: ThenableWebDriver) {
  return await (await driver.manage().getCookie("Current-Prescription-Id")).value
}

async function getNextPrescriptionId(driver: ThenableWebDriver) {
  return await (await driver.manage().getCookie("Next-Prescription-Id")).value
}

async function checkPageIsShowingCurrentPrescription(driver: ThenableWebDriver, startingPrescriptionId: string) {
  expect(await driver.getCurrentUrl()).toContain(`prescribe/edit?prescription_id=${encodeURIComponent(startingPrescriptionId)}`)
  await driver.wait(until.elementLocated(sendPageTitle), defaultWaitTimeout)
}

async function loadTheNextPrescription(driver: ThenableWebDriver) {
  await driver.actions({async: true}).sendKeys(Key.ARROW_RIGHT).perform()
}

async function checkPageIsShowingNextPrescription(driver: ThenableWebDriver, nextPrescriptionId: string) {
  await driver.wait(until.urlContains(`prescribe/edit?prescription_id=${encodeURIComponent(nextPrescriptionId)}`))
  await driver.wait(until.elementLocated(sendPageTitle))
}

async function getPreviousPrescriptionId(driver: ThenableWebDriver) {
  return await (await driver.manage().getCookie("Previous-Prescription-Id")).value
}

async function loadThePreviousPrescription(driver: ThenableWebDriver) {
  await driver.actions({async: true}).sendKeys(Key.ARROW_LEFT).perform()
}

async function checkPageIsShowingThePreviousPrescription(driver: ThenableWebDriver, previousPrescriptionId: string) {
  await driver.wait(until.urlContains(`prescribe/edit?prescription_id=${encodeURIComponent(previousPrescriptionId)}`))
  await driver.wait(until.elementLocated(sendPageTitle))
}

function checkPreviousPrescriptionIsTheStartingPrescription(previousPrescriptionId: string, startingPrescriptionId: string) {
  expect(previousPrescriptionId).toEqual(startingPrescriptionId)
}
