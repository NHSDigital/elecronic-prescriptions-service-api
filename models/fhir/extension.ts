import {LosslessNumber} from "lossless-json"
import * as common from "./common"

export interface Extension extends common.Element {
  url: string
}

export interface IdentifierExtension extends Extension {
  valueIdentifier: common.Identifier
}

export interface CodingExtension extends Extension {
  valueCoding: common.Coding
}

export interface CodeableConceptExtension extends Extension {
  valueCodeableConcept: common.CodeableConcept
}

export interface StringExtension extends Extension {
  valueString: string
}

export interface ReferenceExtension<T extends common.Resource> extends Extension {
  valueReference: common.Reference<T>
}

export interface IdentifierReferenceExtension<T extends common.Resource> extends Extension {
  valueReference: common.IdentifierReference<T>
}

export interface UnsignedIntExtension extends Extension {
  valueUnsignedInt: LosslessNumber | string
}

export interface IntegerExtension extends Extension {
  valueInteger: LosslessNumber | string
}

export interface DateTimeExtension extends Extension {
  valueDateTime: string
}

export interface DateExtension extends Extension {
  valueDate: string
}

export interface ExtensionExtension<T extends Extension> extends Extension {
  extension: Array<T>
}

export interface BooleanExtension extends Extension {
  valueBoolean: boolean
}

export type RepeatInformationExtension = ExtensionExtension<UnsignedIntExtension | DateTimeExtension>
export type ControlledDrugExtension = ExtensionExtension<StringExtension | CodingExtension>
export type PrescriptionStatusHistoryExtension = ExtensionExtension<CodingExtension | DateTimeExtension>
export type DispensingInformationExtension = ExtensionExtension<CodingExtension | DateExtension>
export type DispensingReleaseInformationExtension = ExtensionExtension<DateExtension>
export type PrescriptionExtension = ExtensionExtension<CodingExtension>
export type GroupIdentifierExtension = ExtensionExtension<IdentifierExtension>
