import {getAuthToken} from "../services/getAccessToken"
import instance from "../src/configs/api"
import * as helper from "../util/helper"
import {
  When,
  Then,
  Given,
  setDefaultTimeout
} from "@cucumber/cucumber"
import {expect} from "expect"
import assert from "node:assert"

setDefaultTimeout(60 * 1000)

Given("I am authenticated", async () => {
  const token = await getAuthToken()
  instance.defaults.headers.common["Authorization"] = `Bearer ${token}`
})

When(/^I prepare (.*) prescription\(s\) for (.*) with no details$/, async function (number, site) {
  await helper.preparePrescription(number, site, 1, undefined, this)
  this.resp = this.prepareResponse
})

When(/^I prepare (.*) prescription\(s\) for (.*) with details$/, async function (number, site, table) {
  await helper.preparePrescription(number, site, 1, table, this)
  this.resp = this.prepareResponse
})

When(/^I sign the prescriptions$/, async function () {
  await helper.signPrescriptions(undefined, this)
  this.resp = this.createResponse
})

When("I release the prescriptions", async function () {
  await helper.releasePrescription(this.site, this)
  this.resp = this.releaseResponse
})

Given(/^I prepare (\d+) prescription\(s\) for (.*) with (\d+) line items$/, async function (number, site, medReqNo) {
  await helper.preparePrescription(number, site, medReqNo, undefined, this)
  this.resp = this.prepareResponse
})

Then(/^I get a success response (\d+)$/, function (status) {
  expect(this.resp.length).toBeGreaterThan(0)
  this.resp.forEach((resp) => {
    assert.equal(resp.status,
      status,
      `Unexpected status for request ${resp.headers["x-request-id"]}. Expected ${status}. Actual ${resp.status}`)
  })
})

Then(/^I get an error response (\d+)$/, function (status, table) {
  expect(this.resp.length).toBeGreaterThan(0)
  this.resp.forEach((resp) => {
    expect(resp.status).toBe(parseInt(status))
    if (Object.prototype.hasOwnProperty.call(table.hashes()[0], "message")) {
      const diagnosticArrary = resp.data.issue.map((a) => a.diagnostics)
      expect(diagnosticArrary).toContain(table.hashes()[0].message)
    } else if (table[0].errorObject === "issue") {
      expect(resp.data.issue[0].details.coding[0].display).toMatch(table[0].message)
    } else if (table[0].errorObject === "entry") {
      expect(resp.data.entry[1].resource.extension[0].extension[0].valueCoding.display).toMatch(table[0].message)
    }
  })
})

When(/^I amend the dispense claim$/, async function (table) {
  this.resp = await helper.amendDispenseClaim(table, this)
})

When("I send a dispense claim", async function (table) {
  if (table.rows.length > 0) {
    this.resp = await helper.sendDispenseClaim(this._site, 1, table, this)
  } else {
    this.resp = await helper.sendDispenseClaim(this._site, undefined, undefined, this)
  }
})

When(/^I send a dispense claim for the (\d+) line items$/, async function (claimNo, table) {
  this.resp = await helper.sendDispenseClaim(this._site, claimNo, table, this)
})

When("I send a dispense notification", async function (table) {
  this.resp = await helper.sendDispenseNotification(this._site, 1, table, this)
})

When(/^I send a dispense notification for the (\d+) line items$/, async function (medDispNo, table) {
  this.resp = await helper.sendDispenseNotification(this._site, medDispNo, table, this)
})

// eslint-disable-next-line @typescript-eslint/no-unused-vars
Then(/^the prescription is marked as (.*)$/, (status) => {
  //TODO
})

When("I return the prescription", async function (table) {
  this.resp = await helper.returnPrescription(this._site, this.identifierValue, table, this)
})

Then(/^I get prescription\(s\) released$/, function (table) {
  this.releaseResponse.forEach((resp) => {
    const passedPrescriptions = resp.data.parameter.filter((a) => a.name === "passedPrescriptions")
    const failedPrescriptions = resp.data.parameter.filter((a) => a.name === "failedPrescriptions")
    expect(failedPrescriptions[0].resource.entry.length).toBe(0)
    expect(passedPrescriptions[0].resource.entry.length).toBeGreaterThan(0)
    const passedPrescriptionResourceEntry = passedPrescriptions[0].resource.entry[0].resource
    expect(passedPrescriptionResourceEntry.entry[0].resource.destination[0].receiver.identifier.value).toBe(
      table.hashes()[0].site
    )
    expect(passedPrescriptionResourceEntry.entry[1].resource.resourceType).toBe("MedicationRequest")
    expect(passedPrescriptionResourceEntry.entry[1].resource.medicationCodeableConcept.coding[0].display).toBe(
      table.hashes()[0].medicationDisplay
    )
    expect(passedPrescriptionResourceEntry.entry[1].resource.dispenseRequest.quantity.value).toEqual(200)
    expect(passedPrescriptionResourceEntry.entry[2].resource.resourceType).toBe("Patient")
    expect(passedPrescriptionResourceEntry.entry[2].resource.identifier[0].value).toBe("9449304130")
  })
})

When("I cancel the prescription", async function (table) {
  this.resp = await helper.cancelPrescription(table, this)
})

// eslint-disable-next-line @typescript-eslint/no-unused-vars
Then(/^the prescription is marked as (.*) dispensed$/, (status) => {
  //TODO
})

When("the prescription status is With Dispenser", async () => {
  //TODO
})
