import "chromedriver"
import "geckodriver"
import {until, By, ThenableWebDriver} from "selenium-webdriver"
import {getChromeDriver, getFirefoxDriver} from "./browser-drivers"

const SERVICE_BASE_PATH = process.env.SERVICE_BASE_PATH || "eps-api-tool"
const APIGEE_ENVIRONMENT = "internal-dev"
const EPSAT_HOME_URL = `https://${APIGEE_ENVIRONMENT}.api.service.nhs.uk/${SERVICE_BASE_PATH}`

console.log(`Running test against ${EPSAT_HOME_URL}`)

jest.setTimeout(120000)

describe("firefox", () => {
  test("can perform create prescription", async () => {
    const driver = getFirefoxDriver()
    try {
      await doTest(driver)
    } catch (e) {
      await logDiagnostics(driver, e as Record<string, unknown>)
      process.exit(1)
    } finally {
      await setTimeout(async() =>
        await driver.quit(),
        2500
      )
    }
  })
})

// ADO issue using chromedriver: "DevToolsActivePort file doesn't exist"
describe("chrome", () => {
  test.skip("can perform create prescription", async () => {
    const driver = getChromeDriver()
    try {
      await doTest(driver)
    } catch (e) {
      await logDiagnostics(driver, e as Record<string, unknown>)
      throw e
    } finally {
        driver.quit()
    }
  })
})

async function doTest(driver: ThenableWebDriver) {
  const prescriptionId = await performCreatePrescriptionUserJourney(driver)
  expect(prescriptionId).toBeTruthy()
  console.log(`Created Prescription Id: ${prescriptionId}`)
  await performCancelPrescriptionUserJourney(driver, prescriptionId)
}

async function performCreatePrescriptionUserJourney(
  driver: ThenableWebDriver
): Promise<string> {

  const url = `${EPSAT_HOME_URL}?use_signing_mock=true`

  await login(driver, url)

  await createPrescription(driver)

  await loadPredefinedExamplePrescription(driver)

  await sendPrescription(driver)

  await checkPrescriptionSentResult(driver)

  return await getCreatedPrescriptionId(driver)
}

async function performCancelPrescriptionUserJourney(
  driver: ThenableWebDriver,
  prescriptionId: string
): Promise<void> {
  navigateToUrl(driver, `${EPSAT_HOME_URL}/prescribe/cancel?prescription_id=${prescriptionId}`)
}

async function login(driver: ThenableWebDriver, url: string) {
  await navigateToUrl(driver, url)
  await driver.wait(until.elementsLocated({ xpath: "//*[text() = 'Login']" }))
  await driver.findElement({ xpath: "//*[text() = 'User']" }).click()

  await driver.wait(until.elementLocated({ xpath: "//*[text() = 'Simulated login page']" }))
  await driver.wait(async () => {
    await driver.findElement(By.id("smartcard")).click()
    await driver.findElement(By.className("btn-primary")).click()
    await driver.sleep(1000)
    const visibleButtons = await driver.findElements(By.className("btn-primary"))
    return visibleButtons.length === 0
  }, 10000)

  console.log("LOGIN SUCCESSFUL")
}

async function createPrescription(driver: ThenableWebDriver) {
  await driver.wait(until.elementsLocated({ xpath: "//*[text() = 'I would like to...']" }))
  await driver.findElement(By.linkText("Create Prescription(s)")).click()

  console.log("CREATE PRESCRIPTION SUCCESSFUL")
}

async function loadPredefinedExamplePrescription(driver: ThenableWebDriver) {
  await driver.wait(until.elementsLocated({ xpath: "//*[text() = 'Load prescription(s)']" }))
  await driver.findElement({ xpath: "//*[text() = 'View']" }).click()

  console.log("LOAD PRESCRIPTION SUCCESSFUL")
}

async function sendPrescription(driver: ThenableWebDriver) {
  await driver.wait(until.elementsLocated({ xpath: "//*[text() = 'Prescription Summary']" }))
  await driver.findElement({ xpath: "//*[text() = 'Send']" }).click()

  console.log("SEND PRESCRIPTION SUCCESSFUL")
}

async function checkPrescriptionSentResult(driver: ThenableWebDriver) {
  await driver.wait(until.elementsLocated({ xpath: "//*[text() = 'Request (FHIR)']" }))
  expect(await driver.findElement(By.className("nhsuk-icon__tick"))).toBeTruthy()
  expect(await driver.findElement({ xpath: "//*[text() = 'Request (FHIR)']" })).toBeTruthy()
  expect(await driver.findElement({ xpath: "//*[text() = 'Request (HL7 V3)']" })).toBeTruthy()
  expect(await driver.findElement({ xpath: "//*[text() = 'Response (FHIR)']" })).toBeTruthy()
  expect(await driver.findElement({ xpath: "//*[text() = 'Response (HL7 V3)']" })).toBeTruthy()

  console.log("PRESCRIPTION CREATION SUCCESSFUL")
}

async function getCreatedPrescriptionId(driver: ThenableWebDriver): Promise<string> {
  return await driver.findElement(By.className("nhsuk-summary-list__value")).getText()
}

async function navigateToUrl(driver: ThenableWebDriver, url: string) {
  await driver.get(url)
}

async function logDiagnostics(driver: ThenableWebDriver, error: Record<string, unknown>) {
  const stackTrace = error.stack && `Stacktrace:\n\n${error.stack}\n\n`
  const url = `Current URL:\n\n${(await driver.getCurrentUrl())}\n\n`
  const source = `Page source:\n\n${(await driver.getPageSource())}`
  console.log(stackTrace, url, source)
}
