import {driver} from "../live.test"
import {sendBulkPrescriptionUserJourney} from "../helpers"
import * as fileInfoFactory from "../file-upload-info/upload-info/Test-pack-info"

describe("firefox", () => {
  test("can send prescriptions from clinical full prescriber test pack", async () => {
    await sendBulkPrescriptionUserJourney(driver, fileInfoFactory.getClinicalFullPrescriberTestPackInfo(), 10)
  })

  test("can send prescriptions from supplier test pack 1", async () => {
    await sendBulkPrescriptionUserJourney(driver, fileInfoFactory.getSupplierTestPackInfo(), 10)
  })

  test("can send prescriptions from prescription types test pack", async () => {
    await sendBulkPrescriptionUserJourney(driver, fileInfoFactory.getPrescriptionTypeTestPackInfo(), 10)
  })

  test("can send prescriptions from prescription types with invalid types test pack", async () => {
    await sendBulkPrescriptionUserJourney(driver, fileInfoFactory.getPrescriptionTypesWithInvalidTypesTestPackInfo(), 10)
  })

  test("can send prescriptions from post dated prescription test pack", async () => {
    await sendBulkPrescriptionUserJourney(driver, fileInfoFactory.getPostDatedPrescriptionTestPackInfo(), 2)
  })
})

