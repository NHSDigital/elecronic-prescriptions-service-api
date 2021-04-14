import {fhir, processingErrors as errors} from "@models"
import {LosslessNumber} from "lossless-json"
import {getMessageHeader} from "./getResourcesOfType"

export const UNKNOWN_GP_ODS_CODE = "V81999"

export function getMessageId(identifier: Array<fhir.Identifier>, fhirPath: string): string {
  return getIdentifierValueForSystem(
    identifier,
    "https://tools.ietf.org/html/rfc4122",
    fhirPath
  )
}

export function identifyMessageType(bundle: fhir.Bundle): string {
  return getMessageHeader(bundle).eventCoding?.code
}

export function getMessageIdFromBundle(bundle: fhir.Bundle): string {
  return getMessageId([bundle.identifier], "Bundle.identifier")
}

export function getMessageIdFromTask(task: fhir.Task): string {
  return getMessageId(task.identifier, "Task.identifier")
}

export function onlyElement<T>(iterable: Iterable<T>, fhirPath: string, additionalContext?: string): T {
  if (!iterable) {
    throw new errors.InvalidValueError("Required field missing.", fhirPath)
  }
  const iterator = iterable[Symbol.iterator]()
  const first = iterator.next()
  if (first.done) {
    throw new errors.TooFewValuesError(`Too few values submitted. Expected 1 element${
      additionalContext ? " where " : ""
    }${
      additionalContext ? additionalContext : ""
    }.`, fhirPath)
  }
  const value = first.value
  if (!iterator.next().done) {
    throw new errors.TooManyValuesError(`Too many values submitted. Expected 1 element${
      additionalContext ? " where " : ""
    }${
      additionalContext ? additionalContext : ""
    }.`, fhirPath)
  }
  return value
}

export function onlyElementOrNull<T>(iterable: Iterable<T>, fhirPath: string, additionalContext?: string): T {
  if (!iterable) {
    return null
  }
  const iterator = iterable[Symbol.iterator]()
  const value = iterator.next().value
  if (!iterator.next().done) {
    throw new errors.TooManyValuesError(`Too many values submitted. Expected at most 1 element${
      additionalContext ? " where " : ""
    }${
      additionalContext ? additionalContext : ""
    }.`, fhirPath)
  }
  return value
}

export function getResourceForFullUrl(bundle: fhir.Bundle, resourceFullUrl: string): fhir.Resource {
  return onlyElement(
    bundle.entry.filter(entry => entry.fullUrl === resourceFullUrl),
    "Bundle.entry",
    `fullUrl == '${resourceFullUrl}'`
  ).resource
}

export function resolveReference<T extends fhir.Resource>(bundle: fhir.Bundle, reference: fhir.Reference<T>): T {
  return getResourceForFullUrl(bundle, reference.reference) as T
}

export function getIdentifierValueForSystem(
  identifiers: Array<fhir.Identifier>,
  system: string,
  fhirPath: string
): string {
  if (!identifiers) {
    throw new errors.InvalidValueError("Required field missing.", fhirPath)
  }
  return onlyElement(
    identifiers.filter(identifier => identifier.system === system),
    fhirPath,
    `system == '${system}'`
  ).value
}

export function getIdentifierValueOrNullForSystem(
  identifiers: Array<fhir.Identifier>,
  system: string,
  fhirPath: string
): string {
  if (!identifiers) {
    return null
  }
  return onlyElementOrNull(
    identifiers.filter(identifier => identifier.system === system),
    fhirPath,
    `system == '${system}'`
  )?.value
}

export function getCodingForSystem(codings: Array<fhir.Coding>, system: string, fhirPath: string): fhir.Coding {
  return onlyElement(
    codings.filter(coding => coding.system === system),
    fhirPath,
    `system == '${system}'`
  )
}

export function getCodingForSystemOrNull(codings: Array<fhir.Coding>, system: string, fhirPath: string): fhir.Coding {
  return onlyElementOrNull(
    codings.filter(coding => coding.system === system),
    fhirPath,
    `system == '${system}'`
  )
}

export function getExtensionForUrl(extensions: Array<fhir.Extension>, url: string, fhirPath: string): fhir.Extension {
  return onlyElement(
    extensions?.filter(extension => extension.url === url),
    fhirPath,
    `url == '${url}'`
  )
}

export function getExtensionForUrlOrNull(
  extensions: Array<fhir.Extension>,
  url: string,
  fhirPath: string
): fhir.Extension {
  return onlyElementOrNull(
    extensions.filter(extension => extension.url === url),
    fhirPath,
    `url == '${url}'`
  )
}

export function getCodeableConceptCodingForSystem(
  codeableConcepts: Array<fhir.CodeableConcept>,
  system: string,
  fhirPath: string
): fhir.Coding {
  if (!codeableConcepts) {
    throw new errors.InvalidValueError("Required field missing.", fhirPath)
  }
  const coding = codeableConcepts.flatMap(codeableConcept => codeableConcept.coding)
  return getCodingForSystem(coding, system, fhirPath + ".coding")
}

export function getCodeableConceptCodingForSystemOrNull(
  codeableConcepts: Array<fhir.CodeableConcept>,
  system: string,
  fhirPath: string
): fhir.Coding {
  if (!codeableConcepts) {
    return null
  }
  const coding = codeableConcepts.flatMap(codeableConcept => codeableConcept.coding)
  return getCodingForSystemOrNull(coding, system, fhirPath + ".coding")
}

export function toArray<T>(thing: T | Array<T>): Array<T> {
  return Array.isArray(thing) ? thing : [thing]
}

export const isTruthy = Boolean

export function getNumericValueAsString(numericValue: string | number | LosslessNumber): string {
  if (typeof numericValue === "number") {
    throw new TypeError(
      "Got a number but expected a LosslessNumber." +
      " Use LosslessJson.parse() instead of JSON.parse() or precision may be lost."
    )
  } else if (typeof numericValue === "string") {
    return numericValue
  } else {
    return numericValue.toString()
  }
}

function isStringParameter(parameter: fhir.Parameter): parameter is fhir.StringParameter {
  return (parameter as fhir.StringParameter).valueString !== undefined
}

function isIdentifierParameter(parameter: fhir.Parameter): parameter is fhir.IdentifierParameter {
  return (parameter as fhir.IdentifierParameter).valueIdentifier !== undefined
}

export function getStringParameterByName(
  parameters: Array<fhir.ParameterTypes>,
  name: string
): fhir.StringParameter {
  return onlyElement(parameters.filter(isStringParameter).filter(parameter => parameter.name === name),
    "Parameters.parameter",
    `name == '${name}'`
  ) as fhir.StringParameter
}

export function getIdentifierParameterByName(
  parameters: Array<fhir.ParameterTypes>,
  name: string
): fhir.IdentifierParameter {
  return onlyElement(parameters.filter(isIdentifierParameter).filter(parameter => parameter.name === name),
    "Parameters.parameter",
    `name == '${name}'`
  ) as fhir.IdentifierParameter
}
