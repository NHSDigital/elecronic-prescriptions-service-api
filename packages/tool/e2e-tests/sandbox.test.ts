import "chromedriver"
import "geckodriver"
import {Builder, ThenableWebDriver} from "selenium-webdriver"
import * as firefox from "selenium-webdriver/firefox"
import {EPSAT_HOME_URL, LOCAL_MODE} from "./helpers"
import * as doseToText from "./dose-to-text/doseToText"
import _ from "lodash"
import "path"

const testResultsDirectory = "test_results"

import {writeFile, access, mkdir} from "node:fs/promises"
import {PathLike} from "fs"

export let driver: ThenableWebDriver

async function dirExists(path: PathLike) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

beforeAll(async () => {
  global.console = require("console")
  const exist = await dirExists(testResultsDirectory)
  if (!exist) {
    await mkdir(testResultsDirectory, {recursive: true})
  }
  console.log(`Running test against ${EPSAT_HOME_URL}`)
})

beforeEach(async() => {
  console.log(`\n==================| ${expect.getState().currentTestName} |==================`)
  const options = buildFirefoxOptions()
  Object.defineProperty(global, "hasTestFailures", {
    value: false
  })
  driver = new Builder()
    .setFirefoxOptions(options)
    .forBrowser("firefox")
    .build()
})

afterEach(async () => {
  const hasTestFailures = _.get(global, "hasTestFailures", false)
  if (hasTestFailures) {
    const image = await driver.takeScreenshot()
    const filename = testResultsDirectory + "/" + expect.getState().currentTestName + ".png"
    await writeFile(filename, image, "base64")
    console.log('test failed')
    console.log(`saved screenshot to ${filename}`)
  } else {
    console.log('test succeeded')
  }
  await driver.close()
})

function buildFirefoxOptions() {
  const firefoxOptions = new firefox.Options()
  if (LOCAL_MODE) {
    firefoxOptions.setBinary(process.env.FIREFOX_BINARY_PATH)
  }
  if (!LOCAL_MODE) {
    firefoxOptions.headless()
  }
  return firefoxOptions
}

// Unused export to keep the linter happy.
// The purpose of this file is to manage before and after
// hooks and run tests in between them from one
// place to avoid concurrency issues

export const tests = [
  doseToText
]
