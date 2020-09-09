import * as fhir from "../../model/fhir-resources"
import * as core from "../../model/hl7-v3-datatypes-core"
import * as codes from "../../model/hl7-v3-datatypes-codes"
import {InvalidValueError} from "../../model/errors"

export function convertName(fhirHumanName: fhir.HumanName, fhirPath: string): core.Name {
  const name = new core.Name()
  if (fhirHumanName.use) {
    name._attributes = {
      use: convertNameUse(fhirHumanName.use, fhirPath)
    }
  }
  if (fhirHumanName.prefix) {
    name.prefix = fhirHumanName.prefix.map(name => new core.Text(name))
  }
  if (fhirHumanName.given) {
    name.given = fhirHumanName.given.map(name => new core.Text(name))
  }
  if (fhirHumanName.family) {
    name.family = new core.Text(fhirHumanName.family)
  }
  if (fhirHumanName.suffix) {
    name.suffix = fhirHumanName.suffix.map(name => new core.Text(name))
  }
  return name
}

function convertNameUse(fhirNameUse: string, fhirPath: string) {
  switch (fhirNameUse) {
  case "usual":
  case "official":
    return core.NameUse.USUAL
  case "nickname":
    return core.NameUse.ALIAS
  default:
    throw new InvalidValueError(`Unhandled name use '${fhirNameUse}'.`, fhirPath + ".use")
  }
}

export function convertTelecom(fhirTelecom: fhir.ContactPoint, fhirPath: string): core.Telecom {
  const hl7V3TelecomUse = convertTelecomUse(fhirTelecom.use, fhirPath)
  //TODO - do we need to add "tel:", "mailto:" to the value?
  return new core.Telecom(hl7V3TelecomUse, fhirTelecom.value)
}

function convertTelecomUse(fhirTelecomUse: string, fhirPath: string) {
  switch (fhirTelecomUse) {
  case "home":
    return core.TelecomUse.PERMANENT_HOME
  case "work":
    return core.TelecomUse.WORKPLACE
  case "temp":
    return core.TelecomUse.TEMPORARY
  case "mobile":
    return core.TelecomUse.MOBILE
  default:
    throw new InvalidValueError(`Unhandled telecom use '${fhirTelecomUse}'.`, fhirPath + ".use")
  }
}

export function convertAddress(fhirAddress: fhir.Address, fhirPath: string): core.Address {
  const allAddressLines = [
    fhirAddress.line,
    fhirAddress.city,
    fhirAddress.district,
    fhirAddress.state
  ].flat().filter(Boolean)
  const hl7V3Address = new core.Address(convertAddressUse(fhirAddress.use, fhirAddress.type, fhirPath))
  hl7V3Address.streetAddressLine = allAddressLines.map(line => new core.Text(line))
  if (fhirAddress.postalCode !== undefined){
    hl7V3Address.postalCode = new core.Text(fhirAddress.postalCode)
  }
  return hl7V3Address
}

function convertAddressUse(fhirAddressUse: string, fhirAddressType: string, fhirPath: string) {
  if (fhirAddressUse === undefined && fhirAddressType === undefined){
    return undefined
  }
  if (fhirAddressType === "postal") {
    return core.AddressUse.POSTAL
  }
  switch (fhirAddressUse) {
  case "home":
    return core.AddressUse.HOME
  case "work":
    return core.AddressUse.WORK
  case "temp":
    return core.AddressUse.TEMPORARY
  default:
    throw new InvalidValueError(`Unhandled address use '${fhirAddressUse}'.`, fhirPath + ".use")
  }
}

export function convertGender(fhirGender: string, fhirPath: string): codes.SexCode {
  switch (fhirGender) {
  case "male":
    return codes.SexCode.MALE
  case "female":
    return codes.SexCode.FEMALE
  case "other":
    return codes.SexCode.INDETERMINATE
  case "unknown":
    return codes.SexCode.UNKNOWN
  default:
    throw new InvalidValueError(`Unhandled gender '${fhirGender}'.`, fhirPath)
  }
}
