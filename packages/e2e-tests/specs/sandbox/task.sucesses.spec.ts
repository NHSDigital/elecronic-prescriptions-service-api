import {PactV3} from "@pact-foundation/pact"
import * as LosslessJson from "lossless-json"
import * as TestResources from "../../resources/test-resources"
import {
  createInteractionV3,
  CreatePactOptions,
  pactOptions,
  successfulOperationOutcome
} from "../../resources/common"
import {fhir} from "@models"

describe("sandbox release interactions", () => {
  test.each(TestResources.taskReleaseCases)(
    "should be able to acquire prescription info on a prescription release",
    async (description: string, request: fhir.Parameters, response: fhir.Bundle, statusCode: number) => {
      const options = new CreatePactOptions("sandbox", "task", "release")
      const provider = new PactV3(pactOptions(options))

      const interaction = createInteractionV3(
        options,
        request,
        LosslessJson.stringify(response),
        `a request to release a ${description} message`,
        statusCode
      )

      await provider.addInteraction(interaction)
    }
  )
})

describe("Task return sandbox e2e tests", () => {
  test.each(TestResources.taskReturnCases)(
    "should be able to process %s",
    async (desc: string, message: fhir.Task) => {
      const options = new CreatePactOptions("sandbox", "task", "return")
      const provider = new PactV3(pactOptions(options))

      const interaction = createInteractionV3(
        options,
        message,
        successfulOperationOutcome,
        `a request to return ${desc} message`
      )

      await provider.addInteraction(interaction)
    }
  )
})

describe("Task withdraw sandbox e2e tests", () => {
  test.each(TestResources.taskWithdrawCases)(
    "should be able to withdraw %s",
    async (desc: string, message: fhir.Task) => {
      const options = new CreatePactOptions("sandbox", "task", "withdraw")
      const provider = new PactV3(pactOptions(options))

      const interaction = createInteractionV3(
        options,
        message,
        successfulOperationOutcome,
        `a request to withdraw ${desc} message`
      )

      await provider.addInteraction(interaction)
    }
  )
})
