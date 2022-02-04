import {By, ThenableWebDriver, until} from "selenium-webdriver"
import {
  createPrescriptionsLink,
  dispenseButton,
  dispensePageTitle,
  dispensePrescriptionAction,
  fhirRequestExpander,
  fhirResponseExpander,
  hl7v3RequestExpander,
  hl7v3ResponseExpander,
  homePageTitle,
  itemFullyDispensedStatus,
  loadPageTitle,
  loginPageTitle,
  myPrescriptionsNavLink,
  myPrescriptionsPageTitle,
  pharmacyRadios,
  sendPageTitle as sendPageTitle,
  releaseButton,
  releasePageTitle,
  releasePrescriptionAction,
  sendButton,
  simulatedAuthPageTitle,
  successTickIcon,
  systemButton,
  userButton,
  viewButton
} from "./locators"

export const LOCAL_MODE = Boolean(process.env.LOCAL_MODE)

export const SERVICE_BASE_PATH = process.env.SERVICE_BASE_PATH || "eps-api-tool"
export const APIGEE_ENVIRONMENT = "internal-dev"
export const EPSAT_HOME_URL = `https://${APIGEE_ENVIRONMENT}.api.service.nhs.uk/${SERVICE_BASE_PATH}`

export const defaultWaitTimeout = 1500
export const twoTimesDefaultWaitTimeout = defaultWaitTimeout * 2
export const threeTimesDefaultWaitTimeout = defaultWaitTimeout * 3
export const fourTimesDefaultWaitTimeout = defaultWaitTimeout * 4
export const tenTimesDefaultWaitTimeout = defaultWaitTimeout * 10
export const apiTimeout = 240000

export async function sendPrescriptionUserJourney(
  driver: ThenableWebDriver,
  loadExamples?: (driver: ThenableWebDriver) => Promise<void>
): Promise<string> {

  await loginViaSimulatedAuthSmartcardUser(driver)
  await createPrescription(driver)

  if (loadExamples) {
    await loadExamples(driver)
    await sendPrescription(driver)
    return ""
  }

  await loadPredefinedExamplePrescription(driver)
  await sendPrescription(driver)
  await checkApiResult(driver)

  return await getCreatedPrescriptionId(driver)
}

export async function releasePrescriptionUserJourney(
  driver: ThenableWebDriver
): Promise<void> {
  await driver.findElement(releasePrescriptionAction).click()

  await driver.wait(until.elementsLocated(releasePageTitle), defaultWaitTimeout)
  const pharmacyToReleaseToRadios = await driver.findElements(pharmacyRadios)
  const firstPharmacyToReleaseToRadio = pharmacyToReleaseToRadios[0]
  firstPharmacyToReleaseToRadio.click()
  await driver.findElement(releaseButton).click()

  finaliseWebAction(driver, "RELEASING PRESCRIPTION...")

  await checkApiResult(driver)
}

export async function dispensePrescriptionUserJourney(
  driver: ThenableWebDriver
): Promise<void> {
  await driver.findElement(dispensePrescriptionAction).click()

  await driver.wait(until.elementsLocated(dispensePageTitle), defaultWaitTimeout)
  await (await driver.findElements(itemFullyDispensedStatus)).forEach(element => element.click())
  await driver.findElement(dispenseButton).click()

  finaliseWebAction(driver, "DISPENSING PRESCRIPTION...")

  await checkApiResult(driver)
}

export async function checkMyPrescriptions(
  driver: ThenableWebDriver,
  tableName: string,
  prescriptionId: string
): Promise<void> {
  await driver.findElement(myPrescriptionsNavLink).click()

  await driver.wait(until.elementsLocated(myPrescriptionsPageTitle), defaultWaitTimeout)
  const tableSelector = By.xpath(`//*[text() = '${tableName}']`)
  await driver.wait(until.elementsLocated(tableSelector), defaultWaitTimeout)
  const table = await driver.findElement(tableSelector)
  const prescriptionEntryInTable = By.xpath(`//*[text() = '${prescriptionId}']`)
  expect(await table.findElement(prescriptionEntryInTable)).toBeTruthy()

  finaliseWebAction(driver, `MY_PRESCRIPTIONS '${tableName}' TABLE HAS PRESCRIPTION: ${prescriptionId}`)
}

export async function loginViaSimulatedAuthSmartcardUser(driver: ThenableWebDriver): Promise<void> {
  const url = `${EPSAT_HOME_URL}?use_signing_mock=true`

  await navigateToUrl(driver, url)
  await driver.wait(until.elementsLocated(loginPageTitle))
  await driver.findElement(userButton).click()

  await driver.wait(until.elementLocated(simulatedAuthPageTitle))
  await driver.wait(async () => {
    await driver.findElement(By.id("smartcard")).click()
    await driver.findElement(By.className("btn-primary")).click()
    await driver.sleep(defaultWaitTimeout)
    const visibleButtons = await driver.findElements(By.className("btn-primary"))
    return visibleButtons.length === 0
  }, twoTimesDefaultWaitTimeout)

  await finaliseWebAction(driver, "LOGIN SUCCESSFUL")
}

export async function loginUnattendedAccess(driver: ThenableWebDriver): Promise<void> {
  await navigateToUrl(driver, `${EPSAT_HOME_URL}?use_signing_mock=true`)

  await driver.wait(until.elementsLocated(loginPageTitle))
  await driver.findElement(systemButton).click()

  await driver.wait(until.elementsLocated(homePageTitle), defaultWaitTimeout)
  await finaliseWebAction(driver, "LOGIN SUCCESSFUL")
}

export async function navigateToUrl(driver: ThenableWebDriver, url: string): Promise<void> {
  await driver.get(url)
}

async function createPrescription(driver: ThenableWebDriver) {
  await driver.wait(until.elementsLocated(homePageTitle), defaultWaitTimeout)
  await driver.findElement(createPrescriptionsLink).click()
  await finaliseWebAction(driver, "CREATING PRESCRIPTION...")
}

async function loadPredefinedExamplePrescription(driver: ThenableWebDriver) {
  await driver.wait(until.elementsLocated(loadPageTitle), defaultWaitTimeout)
  await driver.findElement(viewButton).click()
  await finaliseWebAction(driver, "LOADING PRESCRIPTION...")
}

async function sendPrescription(driver: ThenableWebDriver) {
  await driver.wait(until.elementsLocated(sendPageTitle), tenTimesDefaultWaitTimeout)
  await driver.findElement(sendButton).click()
  await finaliseWebAction(driver, "SENDING PRESCRIPTION...")
}

export async function checkApiResult(driver: ThenableWebDriver, fhirOnly?: boolean): Promise<void> {
  await driver.wait(until.elementsLocated(fhirRequestExpander), apiTimeout)
  expect(await driver.findElement(successTickIcon)).toBeTruthy()
  expect(await driver.findElement(fhirRequestExpander)).toBeTruthy()
  expect(await driver.findElement(fhirResponseExpander)).toBeTruthy()
  if (!fhirOnly) {
    expect(await driver.findElement(hl7v3RequestExpander)).toBeTruthy()
    expect(await driver.findElement(hl7v3ResponseExpander)).toBeTruthy()
  }
  await finaliseWebAction(driver, "API RESULT SUCCESSFUL")
}

async function getCreatedPrescriptionId(driver: ThenableWebDriver): Promise<string> {
  const prescriptionId = await driver.findElement(By.className("nhsuk-summary-list__value")).getText()
  await finaliseWebAction(driver, `CREATED PRESCRIPTION: ${prescriptionId}`)
  return prescriptionId
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function finaliseWebAction(driver: ThenableWebDriver, log: string): Promise<void> {
  if (LOCAL_MODE) {
    console.log(log)
  }
}
