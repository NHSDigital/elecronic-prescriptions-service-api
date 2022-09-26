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
  viewButton,
  backButton,
  configButton,
  configLink,
  configPageTitle,
  dispenseExpanderAction,
  AmendDispenseAction,
  itemAmendNotDispensedStatus,
  amendDispensePageTitle,
  claimPageTitle,
  claimButton,
  claimFormAddEndorsement,
  brokenBulkEndorsement,
  viewPrescriptionAction,
  searchDetailsPageTitle,
  cancelPrescriptionAction,
  cancelPrescriptionPageTitle,
  cancelButton
} from "./locators"
import path from "path"
import fs from "fs"
import * as fhir from "fhir/r4"
import {FileUploadInfo} from "./file-upload-info/interfaces/FileUploadInfo.interface"

export const LOCAL_MODE = Boolean(process.env.LOCAL_MODE)

export const SERVICE_BASE_PATH = process.env.SERVICE_BASE_PATH || "eps-api-tool"
export const APIGEE_ENVIRONMENT = process.env.APIGEE_ENVIRONMENT || "internal-dev"
export const EPSAT_HOME_URL = `https://${APIGEE_ENVIRONMENT}.api.service.nhs.uk/${SERVICE_BASE_PATH}`

export const defaultWaitTimeout = 1500
export const twoTimesDefaultWaitTimeout = defaultWaitTimeout * 2
export const threeTimesDefaultWaitTimeout = defaultWaitTimeout * 3
export const fiveTimesDefaultWaitTimeout = defaultWaitTimeout * 5
export const tenTimesDefaultWaitTimeout = defaultWaitTimeout * 10
export const apiTimeout = 240000

export async function sendPrescriptionUserJourney(
  driver: ThenableWebDriver
): Promise<string> {
  await loginViaSimulatedAuthSmartcardUser(driver)
  await setMockSigningConfig(driver)
  await createPrescription(driver)
  await loadPredefinedExamplePrescription(driver)
  await sendPrescription(driver)
  await checkApiResult(driver)
  return await getCreatedPrescriptionId(driver)
}

export async function sendBulkPrescriptionUserJourney(
  driver: ThenableWebDriver,
  fileInfo: FileUploadInfo,
  successfulResultCountExpected: number
): Promise<void> {
  await loginViaSimulatedAuthSmartcardUser(driver)
  await setMockSigningConfig(driver)
  await createPrescription(driver)
  await loadTestData(driver, fileInfo)
  await sendPrescription(driver)
  await checkBulkApiResult(driver, successfulResultCountExpected)
}

export async function prescriptionIntoClaimedState(driver: ThenableWebDriver, fileUploadInfo: FileUploadInfo): Promise<void> {
  const prescriptionId = await sendPrescriptionSingleMessageUserJourney(driver, fileUploadInfo)
  await releasePrescriptionUserJourney(driver)
  await dispensePrescriptionUserJourney(driver)
  await claimPrescriptionUserJourney(driver)
  await checkMyPrescriptions(driver, "Claimed Prescriptions", prescriptionId)
}

export async function prescriptionIntoCanceledState(driver: ThenableWebDriver, fileUploadInfo: FileUploadInfo): Promise<void> {
  await sendPrescriptionSingleMessageUserJourney(driver, fileUploadInfo)
  await cancelPrescriptionUserJourney(driver)
}

export async function sendPrescriptionSingleMessageUserJourney(
  driver: ThenableWebDriver,
  fileUploadInfo: FileUploadInfo
): Promise<string> {
  await loginViaSimulatedAuthSmartcardUser(driver)
  await setMockSigningConfig(driver)
  await createPrescription(driver)
  await loadTestData(driver, fileUploadInfo)
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
  await firstPharmacyToReleaseToRadio.click()
  await driver.findElement(releaseButton).click()

  finaliseWebAction(driver, "RELEASING PRESCRIPTION...")

  await checkApiResult(driver)
}

export async function viewPrescriptionUserJourney(
  driver: ThenableWebDriver
): Promise<void> {
  await driver.findElement(viewPrescriptionAction).click()
  await driver.wait(until.elementsLocated(searchDetailsPageTitle), defaultWaitTimeout)
  finaliseWebAction(driver, "VIEWED PRESCRIPTION")
}

export async function dispensePrescriptionUserJourney(
  driver: ThenableWebDriver
): Promise<void> {
  await driver.findElement(dispensePrescriptionAction).click()

  await driver.wait(until.elementsLocated(dispensePageTitle), fiveTimesDefaultWaitTimeout)
  await (await driver.findElements(itemFullyDispensedStatus)).forEach(element => element.click())
  await driver.findElement(dispenseButton).click()

  finaliseWebAction(driver, "DISPENSING PRESCRIPTION...")

  await checkApiResult(driver)
}

export async function amendDispenseUserJourney(
  driver: ThenableWebDriver
): Promise<void> {
  await driver.findElement(dispenseExpanderAction).click()
  await driver.findElement(AmendDispenseAction).click()

  await driver.wait(until.elementsLocated(amendDispensePageTitle), fiveTimesDefaultWaitTimeout)

  await (await driver.findElements(itemAmendNotDispensedStatus)).forEach(element => element.click())

  await driver.findElement(dispenseButton).click()

  finaliseWebAction(driver, "AMENDING DISPENSE...")

  await checkApiResult(driver)
}

export async function claimPrescriptionUserJourney(
  driver: ThenableWebDriver
): Promise<void> {
  await driver.findElement(By.linkText("Claim for prescription")).click()
  await driver.wait(until.elementsLocated(claimPageTitle), defaultWaitTimeout)
  await driver.wait(until.elementsLocated(claimButton), defaultWaitTimeout)
  await driver.findElement(claimButton).click()
  finaliseWebAction(driver, "CLAIMING PRESCRIPTION...")
  await checkApiResult(driver)
}


export async function cancelPrescriptionUserJourney(
  driver: ThenableWebDriver
): Promise<void> {
  await driver.findElement(cancelPrescriptionAction).click()
  await driver.wait(until.elementsLocated(cancelPrescriptionPageTitle), defaultWaitTimeout)
  const medicationToCancelRadios = await driver.findElements(By.name("cancellationMedication"))
  const firstMedicationToCancelRadio = medicationToCancelRadios[0]
  firstMedicationToCancelRadio.click()
  await driver.findElement(cancelButton).click()
  finaliseWebAction(driver, "CANCELLING PRESCRIPTION...")
  await checkApiResult(driver)
}

export async function claimAmendPrescriptionUserJourney(
  driver: ThenableWebDriver
): Promise<void> {
  await driver.findElement(By.linkText("Amend the claim on this prescription")).click()
  await driver.wait(until.elementsLocated(claimPageTitle), defaultWaitTimeout)

  await driver.wait(until.elementsLocated(claimFormAddEndorsement), defaultWaitTimeout)
  await (await driver.findElements(claimFormAddEndorsement)).forEach(element => element.click())

  await (await driver.findElements(brokenBulkEndorsement)).forEach(element => element.click())

  await driver.wait(until.elementsLocated(claimButton), defaultWaitTimeout)
  await driver.findElement(claimButton).click()
  finaliseWebAction(driver, "AMENDING CLAIM FOR PRESCRIPTION...")
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
  await navigateToUrl(driver, EPSAT_HOME_URL)
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

  await driver.wait(until.elementsLocated(homePageTitle), defaultWaitTimeout)
  await finaliseWebAction(driver, "LOGIN SUCCESSFUL")
}

export async function loginUnattendedAccess(driver: ThenableWebDriver): Promise<void> {
  await navigateToUrl(driver, EPSAT_HOME_URL)

  await driver.wait(until.elementsLocated(loginPageTitle))
  await driver.findElement(systemButton).click()

  await driver.wait(until.elementsLocated(homePageTitle), defaultWaitTimeout)
  await finaliseWebAction(driver, "LOGIN SUCCESSFUL")
}

export async function updateConfigEpsPrNumber(driver: ThenableWebDriver, pr: number): Promise<void> {
  await driver.findElement(configLink).click()
  await driver.wait(until.elementLocated(configPageTitle))
  await driver.findElement(By.name("epsPrNumber")).sendKeys(pr)
  await driver.findElement(By.name("useSigningMock")).click()
  await driver.findElement(configButton).click()
  await driver.wait(until.elementLocated(backButton))
  await driver.findElement(backButton).click()
}

export async function navigateToUrl(driver: ThenableWebDriver, url: string): Promise<void> {
  await driver.get(url)
}

export async function createPrescription(driver: ThenableWebDriver): Promise<void> {
  await driver.wait(until.elementsLocated(homePageTitle), defaultWaitTimeout)
  await driver.findElement(createPrescriptionsLink).click()
  await finaliseWebAction(driver, "CREATING PRESCRIPTION...")
}

export async function loadPredefinedExamplePrescription(
  driver: ThenableWebDriver,
  exampleName?: string
): Promise<void> {
  const exampleNameOrDefault = exampleName ?? "Primary Care - Acute (nominated)"
  await driver.wait(until.elementsLocated(loadPageTitle), defaultWaitTimeout)
  await driver.findElement(By.xpath(`//*[text() = '${exampleNameOrDefault}']`)).click()
  await driver.findElement(viewButton).click()
  await finaliseWebAction(driver, "LOADING PRESCRIPTION...")
}

export async function sendPrescription(driver: ThenableWebDriver): Promise<void> {
  await driver.wait(until.elementsLocated(sendPageTitle), apiTimeout)
  await driver.findElement(sendButton).click()
  await finaliseWebAction(driver, "SENDING PRESCRIPTION...")
}

export async function setMockSigningConfig(driver: ThenableWebDriver): Promise<void> {
  await driver.findElement(configLink).click()
  await driver.wait(until.elementLocated(configPageTitle))
  await driver.findElement(By.name("useSigningMock")).click()
  await driver.findElement(configButton).click()
  await driver.wait(until.elementLocated(backButton))
  await driver.findElement(backButton).click()
}

export async function checkApiResult(driver: ThenableWebDriver, fhirOnly?: boolean): Promise<void> {
  await driver.wait(until.elementsLocated(fhirRequestExpander), apiTimeout)
  if (!fhirOnly) {
    await driver.wait(until.elementsLocated(hl7v3RequestExpander), apiTimeout)
  }

  expect(await driver.findElement(successTickIcon)).toBeTruthy()
  expect(await driver.findElement(fhirRequestExpander)).toBeTruthy()
  expect(await driver.findElement(fhirResponseExpander)).toBeTruthy()
  if (!fhirOnly) {
    expect(await driver.findElement(hl7v3RequestExpander)).toBeTruthy()
    expect(await driver.findElement(hl7v3ResponseExpander)).toBeTruthy()
  }
  await finaliseWebAction(driver, "API RESULT SUCCESSFUL")
}

async function checkBulkApiResult(driver: ThenableWebDriver, expectedSuccessResultCount: number) {
  await driver.wait(until.elementsLocated(successTickIcon), apiTimeout)
  const successfulSendResults = await driver.findElements(successTickIcon)
  const successfulSendResultsCount = successfulSendResults.length
  expect(successfulSendResultsCount).toEqual(expectedSuccessResultCount)
  await finaliseWebAction(driver, `API RESULT: ${successfulSendResultsCount} SUCCESSFUL CALLS`)
}

async function getCreatedPrescriptionId(driver: ThenableWebDriver): Promise<string> {
  const prescriptionId = await driver.findElement(By.className("nhsuk-summary-list__value")).getText()
  await finaliseWebAction(driver, `CREATED PRESCRIPTION: ${prescriptionId}`)
  return prescriptionId
}

/* eslint-disable @typescript-eslint/no-unused-vars */
export async function finaliseWebAction(driver: ThenableWebDriver, log: string): Promise<void> {
  //console.log([log, await driver.takeScreenshot()].join("\n"))
  console.log(log)
}

function readMessage<T extends fhir.Resource>(filename: string): T {
  const messagePath = path.join(__dirname, filename)
  const messageStr = fs.readFileSync(messagePath, "utf-8")
  return JSON.parse(messageStr)
}

export function readBundleFromFile(filename: string): fhir.Bundle {
  return readMessage<fhir.Bundle>(filename)
}

export async function loadTestData(driver: ThenableWebDriver, fileUploadInfo: FileUploadInfo) {
  const {filePath, fileName, uploadType} = fileUploadInfo
  const testPackUpload = await getUpload(driver, uploadType)
  testPackUpload.sendKeys(path.join(__dirname, filePath, fileName))
  await loadPrescriptionsFromTestData(driver)
  await driver.wait(until.elementsLocated(sendPageTitle), apiTimeout)
}

export async function getUpload(driver: ThenableWebDriver, uploadType: number) {
  const customRadioSelector = {xpath: "//*[@value = 'custom']"}
  await driver.wait(until.elementsLocated(customRadioSelector), defaultWaitTimeout)
  const customRadio = await driver.findElement(customRadioSelector)
  await customRadio.click()
  const fileUploads = {xpath: "//*[@type = 'file']"}
  await driver.wait(until.elementsLocated(fileUploads), defaultWaitTimeout)
  const upload = await (await driver.findElements(fileUploads))[uploadType]
  return upload
}


export async function loadPrescriptionsFromTestData(driver: ThenableWebDriver) {
  await driver.findElement({xpath: "//*[text() = 'View']"}).click()
}



