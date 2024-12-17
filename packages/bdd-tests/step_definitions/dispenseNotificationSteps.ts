import * as helper from "../util/helper"

import {When, setDefaultTimeout} from "@cucumber/cucumber"

setDefaultTimeout(60 * 1000)

When(/^I amend the dispense notification for item (\d+)$/, async function (itemNo, table) {
  this.resp = await helper.amendDispenseNotification(itemNo, table, this)
})

When("I withdraw the dispense notification", async function (table) {
  this.resp = await helper.withdrawDispenseNotification(this._site, table, this)
})

When("I withdraw the dispense notification", async function (table) {
  this.resp = await helper.withdrawDispenseNotification(this._site, table, this)
})
