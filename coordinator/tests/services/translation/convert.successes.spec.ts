import pino from "pino"
import * as TestResources from "../../resources/test-resources"
import {
  convertBundleToSpineRequest,
  convertParametersToSpineRequest,
  convertTaskToSpineRequest
} from "../../../src/services/translation/request"
import {isBundle, isParameters, isTask} from "../../../src/utils/type-guards"

const logger = pino()

describe("conversion tests", () => {
  test.each(TestResources.convertSuccessExamples)(
    "should be able to convert %s message to HL7V3",
    async (testname: string, request: unknown, response: string, responseMatcher: string) => {
      const regex = new RegExp(responseMatcher)
      const isMatch = regex.test(response)
      expect(isMatch).toBe(true)

      // copy of convert route logic, todo: either test injecting request into endpoint
      // or refactor these checks into a testable method and remove duplication
      if (isBundle(request)) {
        const result = await convertBundleToSpineRequest(request, TestResources.validTestHeaders, logger)
        const convertMatchesExpectation = regex.test(result.message)
        expect(convertMatchesExpectation).toBe(true)
      } else if (isParameters(request)) {
        const result = await convertParametersToSpineRequest(request, TestResources.validTestHeaders, logger)
        const convertMatchesExpectation = regex.test(result.message)
        expect(convertMatchesExpectation).toBe(true)
      } else if (isTask(request)) {
        const result = await convertTaskToSpineRequest(request, TestResources.validTestHeaders, logger)
        const convertMatchesExpectation = regex.test(result.message)
        expect(convertMatchesExpectation).toBe(true)
      }
    }
  )
})
