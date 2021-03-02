import {JestPactOptions} from "jest-pact"
import path from "path"
import {ExampleFile} from "../models/files/example-file"
import * as fhir from "../models/fhir"

export const basePath = "/FHIR/R4"

export type ApiMode = "live" | "sandbox"
export type ApiEndpoint = "prepare" | "process" | "convert" | "release"
export type ApiOperation = "send" | "dispense" | "cancel"

// to use groups the group added must match a subfolder under
// models/examples with path separator replaced by space
// or set pactGroups = [""] to run all together
export const pactGroups = [
  "secondary-care community acute",
  "secondary-care community repeat-dispensing",
  "secondary-care homecare",
  "primary-care"
] as const

export const dispensePactGroups = [
  "secondary-care homecare"
] as const

export const cancelPactGroups = [
  "secondary-care community acute"
] as const

export const releasePactGroups = [
  ""
]

export const failurePactGroups = [
  "failures"
] as const

export const miscPactGroups = [
  "accept_headers"
] as const

export const allPactGroups = [...pactGroups, ...cancelPactGroups, ...failurePactGroups, ...miscPactGroups]
export type AllPactGroups = typeof pactGroups[number] | typeof dispensePactGroups[number] | typeof cancelPactGroups[number] | typeof failurePactGroups[number] | typeof miscPactGroups[number]

export class PactGroupCases {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
  constructor(name: AllPactGroups, cases: any) {
    this.name = name
    this.cases = cases
  }
  name: AllPactGroups
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cases: any
}

// used to add type-safety for adding a new pact
export function pactOptions(mode: ApiMode, endpoint: ApiEndpoint, group?: AllPactGroups, operation?: ApiOperation): JestPactOptions
{
  const sandbox = mode === "sandbox"
  const groupName = group ? convertPactDescriptionToPactName(group) : ""
  const operationName = operation === "send" ? "" : operation
  return {
    spec: 3,
    consumer: `nhsd-apim-eps-test-client+${process.env.PACT_VERSION}`,
    provider: `nhsd-apim-eps${sandbox ? "-sandbox" : ""}+${endpoint}${groupName ? "-" + groupName : ""}${operationName ? "-" + operationName : ""}+${process.env.PACT_VERSION}`,
    pactfileWriteMode: "merge"
  }
}

// get pact groups for verification
export const pactGroupNames = convertPactDescriptionsToPactNames(pactGroups)
const releasePactGroupNames = convertPactDescriptionsToPactNames(releasePactGroups)
const cancelPactGroupNames = convertPactDescriptionsToPactNames(cancelPactGroups)

// convert pact group name from description search string format to single string
// matching the published pact's name
function convertPactDescriptionsToPactNames(descriptions: readonly string[]) {
 return descriptions.map(g => convertPactDescriptionToPactName(g))
}

function convertPactDescriptionToPactName(pactDescription: string): string {
  return pactDescription.replace(/-/g, "").replace(/\s/g, "-")
}

const isSandbox = process.env.APIGEE_ENVIRONMENT?.includes("sandbox")

export function getConvertPactGroups(): string[] {
  return [...pactGroupNames, ...failurePactGroups]
}

export function getPreparePactGroups(): string[] {
  return isSandbox
    ? pactGroupNames
    : [...pactGroupNames, ...failurePactGroups]
}

export function getProcessSendPactGroups(): string[] {
  return isSandbox
    ? [...pactGroupNames, ...miscPactGroups]
    : [...pactGroupNames, ...failurePactGroups, ...miscPactGroups]
}

export function getProcessCancelPactGroups(): string[] {
  return cancelPactGroupNames
}

export function getReleasePactGroups(): string[] {
  return isSandbox
    ? releasePactGroupNames
    : [] // todo: verify release for live proxy once this has been added
}

// helper functions
function isStringParameter(parameter: fhir.Parameter): parameter is fhir.StringParameter {
  return (parameter as fhir.StringParameter).valueString !== undefined
}

export function getStringParameterByName(parameters: fhir.Parameters, name: string): fhir.StringParameter {
  const stringParams = parameters.parameter.filter(param => isStringParameter(param)) as Array<fhir.StringParameter>
  const namedStringParams = stringParams.filter(param => param.name === name)
  if (namedStringParams.length === 1) return namedStringParams[0]
}

const examplesRootPath = "../resources/parent-prescription"
export function createExampleDescription(exampleFile: ExampleFile): string {
  return path.parse(path.relative(path.join(__dirname, examplesRootPath), exampleFile.path))
    .dir
    .replace(/\//g, " ")
    .replace(/\\/g, " ")
    + " "
    + `${exampleFile.number} ${exampleFile.statusText} ${exampleFile.operation}`
}
