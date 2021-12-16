import {fetcher, fhir, validationErrors as errors} from "@models"
import {clone} from "../../resources/test-helpers"
import {verifyTask} from "../../../src/services/validation/task-validator"
import {
  DISPENSING_APP_SCOPE,
  DISPENSING_USER_SCOPE,
  PRESCRIBING_APP_SCOPE,
  PRESCRIBING_USER_SCOPE
} from "../../../src/services/validation/scope-validator"

jest.spyOn(global.console, "warn").mockImplementation(() => null)

describe("verifyTask returns errors", () => {
  const validReturnTask = fetcher.taskReturnExamples[0].request
  const validWithdrawTask = fetcher.taskWithdrawExamples[0].request
  let invalidReturnTask: fhir.Task
  let invalidWithdrawTask: fhir.Task

  beforeEach(() => {
    invalidReturnTask = clone(validReturnTask)
    invalidWithdrawTask = clone(validWithdrawTask)
  })

  afterEach(() => {
    process.env.DISPENSE_ENABLED = "true"
  })

  test("rejects when resourceType not 'Task'", () => {
    const invalidTask = {...validReturnTask, resourceType: "bluh"}
    const returnedErrors = verifyTask(invalidTask as fhir.Task, DISPENSING_USER_SCOPE, "test_ods_code")
    expect(returnedErrors).toContainEqual(errors.createResourceTypeIssue("Task"))
  })

  test("verifyTask rejects a message when dispensing is disabled", () => {
    process.env.DISPENSE_ENABLED = "false"
    const result = verifyTask(validReturnTask, DISPENSING_USER_SCOPE, "test_ods_code")
    expect(result).toEqual([errors.createDisabledFeatureIssue("Dispensing")])
  })

  test("rejects when intent not 'order'", () => {
    invalidReturnTask.intent = "bluh" as fhir.TaskIntent
    const returnedErrors = verifyTask(invalidReturnTask, DISPENSING_USER_SCOPE, "test_ods_code")
    expect(returnedErrors).toContainEqual(errors.createTaskIncorrectValueIssue("intent", fhir.TaskIntent.ORDER))
  })

  test("rejects when status not 'in-progress' or 'rejected'", () => {
    invalidReturnTask.status = "bluh" as fhir.TaskStatus
    const returnedErrors = verifyTask(invalidReturnTask, DISPENSING_USER_SCOPE, "test_ods_code")
    expect(returnedErrors).toContainEqual(
      errors.createTaskIncorrectValueIssue("status", fhir.TaskStatus.IN_PROGRESS, fhir.TaskStatus.REJECTED)
    )
  })

  test("rejects withdraw where statusReason system is invalid", () => {
    const expectedSystem = invalidWithdrawTask.statusReason.coding[0].system
    invalidWithdrawTask.statusReason.coding[0].system = "bluh"
    const returnedErrors = verifyTask(invalidWithdrawTask, DISPENSING_USER_SCOPE, "test_ods_code")
    expect(returnedErrors).toContainEqual(errors.createTaskCodingSystemIssue("reasonCode", expectedSystem))
  })

  test("rejects return where statusReason system is invalid", () => {
    const expectedSystem = invalidReturnTask.statusReason.coding[0].system
    invalidReturnTask.statusReason.coding[0].system = "bluh"
    const returnedErrors = verifyTask(invalidReturnTask, DISPENSING_USER_SCOPE, "test_ods_code")
    expect(returnedErrors).toContainEqual(errors.createTaskCodingSystemIssue("reasonCode", expectedSystem))
  })

  test("rejects withdraw where code is not present", () => {
    delete invalidWithdrawTask.code
    const returnedErrors = verifyTask(invalidWithdrawTask, DISPENSING_USER_SCOPE, "test_ods_code")
    expect(returnedErrors).toHaveLength(1)
    expect(returnedErrors[0].diagnostics).toBe("Task.code is required when Task.status is 'in-progress'.")
  })

  test("rejects withdraw where code is not 'abort'", () => {
    invalidWithdrawTask.code.coding[0].code = "suspend"
    const returnedErrors = verifyTask(invalidWithdrawTask, DISPENSING_USER_SCOPE, "test_ods_code")
    expect(returnedErrors).toHaveLength(1)
    expect(returnedErrors[0].diagnostics).toBe("Task.code.coding.code must be one of: 'abort'.")
  })

  test("no errors for a valid Task", () => {
    expect(verifyTask(validReturnTask, DISPENSING_USER_SCOPE, "test_ods_code")).toHaveLength(0)
    expect(verifyTask(validWithdrawTask, DISPENSING_USER_SCOPE, "test_ods_code")).toHaveLength(0)
  })

  test("rejects a message when only prescribing user scope present", () => {
    const result = verifyTask(validReturnTask, PRESCRIBING_USER_SCOPE, "test_ods_code")
    expect(result).toEqual([errors.createMissingScopeIssue("Dispensing")])
  })

  test("rejects a message when only prescribing app scope present", () => {
    const result = verifyTask(validReturnTask, PRESCRIBING_APP_SCOPE, "test_ods_code")
    expect(result).toEqual([errors.createMissingScopeIssue("Dispensing")])
  })

  test("accepts a message when only dispensing user scope present", () => {
    const result = verifyTask(validReturnTask, DISPENSING_USER_SCOPE, "test_ods_code")
    expect(result).toEqual([])
  })

  test("rejects a message when only dispensing app scope present", () => {
    const result = verifyTask(validReturnTask, DISPENSING_APP_SCOPE, "test_ods_code")
    expect(result).toEqual([errors.createUserRestrictedOnlyScopeIssue("Dispensing")])
  })

  test("console warn when inconsistent accessToken and body ods codes", () => {
    const owner: fhir.IdentifierReference<fhir.PersonOrOrganization> = {
      identifier: {
        system: "test_system",
        value: "test_ods_code_2"
      }
    }
    const invalidTask: fhir.Task = {...validReturnTask, owner}

    verifyTask(invalidTask, DISPENSING_APP_SCOPE, "test_ods_code")
    expect(console.warn).toHaveBeenCalled()
  })
})
