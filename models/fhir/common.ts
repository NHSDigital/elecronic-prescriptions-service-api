import {LosslessNumber} from "lossless-json"
import { PersonOrOrganization } from "."
import { fhir } from ".."
import { Organization } from "../hl7-v3"
import {Extension} from "./extension"

export abstract class Element {
  id?: string
  extension?: Array<Extension>
}

export abstract class Resource extends Element {
  meta?: Meta
  resourceType: string
}

export interface Meta {
  lastUpdated: string
}

export interface Identifier {
  use?: string
  system?: string
  value?: string
}

export function createIdentifier(system: string, value: string): Identifier {
  return {
    system: system,
    value: value
  }
}

export interface CodeableConcept {
  coding: Array<Coding>
}

export function createCodeableConcept(system: string, code: string, display: string): CodeableConcept {
  return {
    coding: [createCoding(system, code, display)]
  }
}

export interface Coding {
  system?: string
  code: string
  display?: string
  version?: string
}

export function createCoding(system: string, code: string, display: string): Coding {
  return {
    system, code, display
  }
}

// Matt and Dan -
export interface Reference<T extends Resource> {
  reference: string,
  display?: string
}

export function createReference<T extends Resource>(reference: string): Reference<T> {
  return {
    reference: getFullUrl(reference)
  }
}

export interface IdentifierReference<T extends Resource> {
  identifier: Identifier,
  display?: string
}

export function createIdentifierReference<T extends Resource>(
  identifier: Identifier, display?: string
): IdentifierReference<T> {
  return display ? {
    identifier: identifier,
    display: display
  } : {
    identifier: identifier
  }
}

export interface Quantity {
  value?: string | LosslessNumber
  comparator?: string
  unit?: string
  system?: string
  code?: string
}

export interface SimpleQuantity extends Quantity {
  comparator?: never
}

export interface Duration extends Quantity {
  system?: "http://unitsofmeasure.org"
}

export interface Range {
  low?: SimpleQuantity
  high?: SimpleQuantity
}

export interface Ratio {
  numerator?: Quantity
  denominator?: Quantity
}

export interface Period {
  start?: string
  end?: string
}

function getFullUrl(uuid: string):string {
  return `urn:uuid:${uuid}`
}
