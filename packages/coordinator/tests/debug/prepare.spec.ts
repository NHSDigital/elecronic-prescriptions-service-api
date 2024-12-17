import {fetcher} from "@models"
import pino from "pino"
import * as translator from "../../src/services/translation/request"

const logger = pino()

const allExpectedPassingPrepareExamples = fetcher.prepareExamples.filter(e => e.isSuccess)
test.skip.each(allExpectedPassingPrepareExamples)(
  "regenerate prepare responses",
  async (prepareCase) => {
    const request = prepareCase.request
    const prepareResponse = await translator.convertFhirMessageToSignedInfoMessage(request, "fakeApplicationId", logger)
    prepareCase.rewriteResponseFile(JSON.stringify(prepareResponse, null, 2))
  }
)
