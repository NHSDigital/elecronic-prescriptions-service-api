import {createInteraction, CreatePactOptions, pactOptions} from "../../resources/common"
import {PactV3} from "@pact-foundation/pact"
import {fetcher, fhir} from "@models"

test("verify-signature using release response as request tests", async() => {
  const options = new CreatePactOptions("live", "verify-signature")
  const provider = new PactV3(pactOptions(options))

  const innerBundles = [
    fetcher.prescriptionOrderExamples[0].request,
    fetcher.prescriptionOrderExamples[1].request,
    fetcher.prescriptionOrderExamples[2].request
  ]
  const outerBundle = createOuterBundle(innerBundles)

  const interaction = createInteraction(options, outerBundle)
  interaction.withRequest.headers = {
    ...interaction.withRequest.headers,
    "X-Skip-Validation": "true"
  }

  await provider.addInteraction(interaction)
})

test("verify-signature using fhir bundle request", async() => {
  const options = new CreatePactOptions("live", "verify-signature")
  const provider = new PactV3(pactOptions(options))
  const bundle = fetcher.prescriptionOrderExamples[0].request
  const interaction = createInteraction(options, bundle)
  await provider.addInteraction(interaction)
})

function createOuterBundle(bundles: Array<fhir.Bundle>): fhir.Bundle {
  return {
    resourceType: "Bundle",
    id: "0cb82cfa-76c8-4fb2-a08e-bf0e326e5487",
    identifier: {
      system: "https://tools.ietf.org/html/rfc4122",
      value: "be66584d-10da-4212-9c95-303b2a1c950b"
    },
    type: "searchset",
    entry: bundles.map(bundle => ({
      resource: bundle,
      fullUrl: "urn:uuid:bluh"
    }))
  }
}
