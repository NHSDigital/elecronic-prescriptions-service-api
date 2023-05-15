import {Matchers, Pact} from "@pact-foundation/pact"
import * as TestResources from "../../resources/test-resources"
import {
  createInteraction,
  CreatePactOptions,
  getStringParameterByName,
  pactOptions
} from "../../resources/common"
import {fhir} from "@models"

describe("prepare sandbox e2e tests", () => {
  test.each(TestResources.prepareCaseGroups)("should be able to prepare a %s message", async (
    desc: string, request: fhir.Bundle, response: fhir.Parameters
  ) => {
    const options = new CreatePactOptions("sandbox", "prepare")
    const provider = new Pact(pactOptions(options))
    await provider.setup()

    const interaction = createInteraction(
      options,
      request,
      getResponseExpectation(response),
      `a request to prepare a ${desc} message`
    )

    await provider.addInteraction(interaction)
    await provider.writePact()
    await provider.finalize()
  })
})

function getResponseExpectation(response: fhir.Parameters) {
  return {
    resourceType: "Parameters",
    parameter: [
      {
        name: "digest",
        valueString: Matchers.like(getStringParameterByName(response, "digest").valueString)
      },
      {
        name: "timestamp",
        valueString: Matchers.like(getStringParameterByName(response, "timestamp").valueString)
      },
      {
        name: "algorithm",
        valueString: "RS256"
      }
    ]
  }
}
