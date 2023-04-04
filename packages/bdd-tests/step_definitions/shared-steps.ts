import { getToken } from "../services/getaccessToken";
import instance from "../src/configs/api";
import * as helper from "../util/helper";
import * as helpercont from "../util/helpercont";

export let _number
export let _site
export let resp;

const _code = []
const _dispenseType = []
const _quantity = []

export const givenIAmAuthenticated = (given) => {
  given('I am authenticated', async() => {
    const token = await getToken(process.env.userId1)
    console.log(token)
    instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  });
};


export const givenICreateXPrescriptionsForSite = (given) => {
  given(/^I create (.*) prescription\(s\) for (.*)$/, async (number, site) => {
    _number = number
    _site = site
    await helper.createPrescription(number, site)
  });
}

export const givenICreateXRepeatPrescriptionsForSite = (given) => {
  given(/^I create (.*) prescription\(s\) for (.*)$/, async (number, site, table) => {
    _number = number
    _site = site
    await helper.createPrescription(number, site, undefined, table)
  });
}

export const givenICreateXPrescriptionsForSiteWithDetails = (given) => {
  given(/^I create (.*) prescription\(s\) for (.*) with details$/, async (number, site, table) => {
    _number = number
    _site = site
    resp = await helper.createPrescription(number, site, 1, table)
  });
}
export const whenIPrepareXPrescriptionsForSiteWithDetails = (when) => {
  when(/^I prepare (.*) prescription\(s\) for (.*) with details$/, async (number, site, table) => {
    resp = await helper.preparePrescription(number, site, 1, table)
  });
}


export const whenIReleaseThePrescription = (when) => {
  when('I release the prescriptions', async () => {
    resp = await helper.releasePrescription(_number, _site)
  });
}
export const givenICreateXPrescriptionsForSiteWithAnInvalidSignature = (given) => {
  given(/^I create (\d+) prescription\(s\) for (.*) with an invalid signature$/, async (number, site) => {
    await helper.createPrescription(number, site, undefined,undefined, false)
    _number = number
    _site = site
  });
}
export const givenICreateXPrescriptionsForSiteWithXLineItems = (given) => {
  given(/^I create (\d+) prescription\(s\) for (.*) with (\d+) line items$/, async (number, site, medReqNo) => {
    await helper.createPrescription(number, site, medReqNo)
    _number = number
    _site = site
  });
}

export const thenIGetASuccessResponse = (then) => {
  then(/^I get a success response (\d+)$/, (status) => {
    expect(resp.status).toBe(parseInt(status))
  });
}
export const thenIGetAnErrorResponse = (then) => {
  then(/^I get an error response (\d+)$/, (status, table) => {
    expect(resp.status).toBe(parseInt(status))
    expect(resp.data.issue[0].details.coding[0].display).toMatch(table[0].message)
  });
}
export const whenIAmendTheDispenseClaim = (when) => {
  when(/^I amend the dispense claim$/, async (table) => {
    resp = await helpercont.amendDispenseClaim(table)
  });
}
export const whenISendADispenseClaim = (when, hasTable = false) => {
  when('I send a dispense claim', async (table) => {
    if (hasTable) {
      resp = await helpercont.sendDispenseClaim(_site, 1, table)
    } else {
      resp = await helpercont.sendDispenseClaim(_site)
    }
  });
}
export const whenISendADispenseClaimForTheNolineItems = (when) => {
  when(/^I send a dispense claim for the (\d+) line items$/, async (claimNo, table) => {
    resp = await helpercont.sendDispenseClaim(_site, claimNo, table)
  });
}
export const whenISendADispenseNotification = (when) => {
  when('I send a dispense notification', async (table) => {
    resp = await helper.sendDispenseNotification(_site, 1, table)
  })
}

export const whenISendADispenseNotificationForTheNolineItems = (when) => {
  when(/^I send a dispense notification for the (\d+) line items$/, async (medDispNo, table) => {

    // table.forEach(row => {
    //   _code.push(row.code)
    //   _dispenseType.push(row.dispenseType)
    //   _quantity.push(row.quantity)
    // })

    //resp = await helper.sendDispenseNotification(_code, _dispenseType, _site, _quantity, medDispNo, table[0].notifyCode)
    resp = await helper.sendDispenseNotification(_site, medDispNo, table)
  });
}
