import {updatePrescriptions} from "../../services/update-prescriptions"
import {fetcher} from "@models"
import {generateTestOutputFile} from "../../services/genereate-test-output-file"
import pino from "pino"
import * as processSuccesses from "./process.successes"
import * as taskSuccesses from "./task.successes"

const logger = pino()

beforeAll(async() => {
  if (process.env.UPDATE_PRESCRIPTIONS !== "false") {
    await updatePrescriptions(
      fetcher.prescriptionOrderExamples.filter(e => e.isSuccess),
      fetcher.prescriptionOrderUpdateExamples.filter(e => e.isSuccess),
      fetcher.prescriptionDispenseExamples.filter(e => e.isSuccess),
      fetcher.taskExamples.filter(e => e.isSuccess),
      fetcher.prescriptionClaimExamples.filter(e => e.isSuccess),
      logger
    )
  }
  generateTestOutputFile()
})

// Unused export to keep the linter happy.
// The purpose of this file is to run the update prescriptions function
// and then run all of the tests which depend on the result.
export const tests = [
  processSuccesses,
  taskSuccesses
]
