import {ProcessCase} from "../cases/process-case"
import {exampleFiles} from "./example-files-fetcher"
import {ExampleFile} from "../example-file"

const processRequestFiles = exampleFiles
  .filter(exampleFile => exampleFile.isRequest && exampleFile.endpoint === "process")
const processResponseFiles = exampleFiles
  .filter(exampleFile => exampleFile.isResponse && exampleFile.endpoint === "process")

const prescriptionOrderFiles = processRequestFiles
  .filter(processRequestFile => processRequestFile.operation === "send")
const prescriptionOrderUpdateFiles = processRequestFiles
  .filter(processRequestFile => processRequestFile.operation === "cancel")
const prescriptionDispenseFiles = processRequestFiles
  .filter(processRequestFile => processRequestFile.operation === "dispense")
const prescriptionClaimFiles = processRequestFiles
  .filter(processRequestFile => processRequestFile.operation === "claim")

export const prescriptionOrderExamples: Array<ProcessCase> = prescriptionOrderFiles
  .filter(orderFile => !orderFile.dir.includes("prescription-refactor"))
  .map(processRequestFile => new ProcessCase(processRequestFile, getResponseFile(processRequestFile)))
export const prescriptionOrderUpdateExamples: Array<ProcessCase> = prescriptionOrderUpdateFiles.map(
  processRequestFile => new ProcessCase(processRequestFile, getResponseFile(processRequestFile))
)
export const prescriptionDispenseExamples: Array<ProcessCase> = prescriptionDispenseFiles.map(processRequestFile =>
  new ProcessCase(processRequestFile, getResponseFile(processRequestFile))
)
export const prescriptionClaimExamples: Array<ProcessCase> = prescriptionClaimFiles.map(processRequestFile =>
  new ProcessCase(processRequestFile, getResponseFile(processRequestFile))
)

function getResponseFile(processRequestFile: ExampleFile) {
  return processResponseFiles.find(processResponseFile =>
    processResponseFile.dir === processRequestFile.dir
    && processResponseFile.operation === processRequestFile.operation
    && processResponseFile.number === processRequestFile.number
    && processResponseFile.isResponse
  )
}

export const processExamples = [
  ...prescriptionOrderExamples,
  ...prescriptionOrderUpdateExamples,
  ...prescriptionDispenseExamples,
  ...prescriptionClaimExamples
]
