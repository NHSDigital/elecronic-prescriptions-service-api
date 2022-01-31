import * as chrome from "selenium-webdriver/chrome"
import {Builder, ThenableWebDriver} from "selenium-webdriver"
import * as firefox from "selenium-webdriver/firefox"

const LOCAL_MODE = Boolean(process.env.LOCAL_MODE)

export function getFirefoxDriver(): ThenableWebDriver {
  const options = buildFirefoxOptions()
  return new Builder()
    .setFirefoxOptions(options)
    .forBrowser("firefox")
    .build()
}

function buildFirefoxOptions() {
  const firefoxOptions = new firefox.Options()
  if (LOCAL_MODE) {
    firefoxOptions.setBinary(process.env.FIREFOX_BINARY_PATH)
    firefoxOptions.addArguments()
  }
  if (!LOCAL_MODE) {
    firefoxOptions.headless()
  }
  return firefoxOptions
}

export function getChromeDriver() {
  return new Builder()
    .setChromeOptions(buildChromeOptions())
    .forBrowser("chrome")
    .build()
}

function buildChromeOptions() {
  const chromeOptions = new chrome.Options()
  chromeOptions.addArguments(
    "--no-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--profile-directory=Default"
  )
  if (!LOCAL_MODE) {
    chromeOptions.headless()
  }
  return chromeOptions
}