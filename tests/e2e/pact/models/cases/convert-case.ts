/* eslint-disable */
import * as fs from "fs"
import * as fhir from "../fhir/fhir-resources"
import * as child from "child_process"
import moment from "moment"
import {Case} from "./case"

const prescriptionIds = child.execSync("poetry run python resources/generate_prescription_ids.py")
  .toString()
  .split("\n")

const prescriptionId = prescriptionIds[0]
const shortPrescriptionId = prescriptionIds[1]

export class ConvertCase extends Case {
  description: string
  request: fhir.Bundle
  response: string
  responseMatcher: string

  constructor(description: string, requestFilePath: string, responseFilePath: string) {
    super(description, requestFilePath)

    const responseXmlString = fs.readFileSync(responseFilePath, "utf-8")
    this.response = responseXmlString
    this.responseMatcher = this.buildResponseMatcher(responseXmlString).trimEnd()
  }

  private buildResponseMatcher(responseXml: string): string {
    const regexPattern = this.escapeRegexSpecialCharacters(responseXml)
    const responseMatcher = this.replaceDynamicsWithRegexPatterns(regexPattern)
    return responseMatcher
  }

  /* Build up a response match regex pattern by taking the response xml and escaping:
    *   Regex special characters^,
    *   Quotes,
    *   Runtime variables
    * 
    *  ^  Note that pact-js is a wrapper for the ruby cli so the regex format must follow ruby conventions
    *     See https://bneijt.nl/pr/ruby-regular-expressions
    */
  private escapeRegexSpecialCharacters(responseXml: string): string {
    return responseXml
      .replace(/\\/g, "\\")     // prepend backslash with backslash
      .replace(/\./g, "\\.")    // prepend fullstop with backslash
      .replace(/\|/g, "\\|")    // prepend pipe with backslash
      .replace(/\(/g, "\\(")    // prepend opening bracket with backslash 
      .replace(/\)/g, "\\)")    // prepend closing bracket with backslash
      .replace(/\[/g, "\\[")    // prepend opening square bracket with backslash 
      .replace(/\]/g, "\\]")    // prepend closing square bracket with backslash
      .replace(/\{/g, "\\{")    // prepend opening braces with backslash 
      .replace(/\}/g, "\\}")    // prepend closing braces with backslash
      .replace(/\+/g, "\\+")    // prepend plus with backslash
      .replace(/\^/g, "\\^")    // prepend ^ with backslash
      .replace(/\$/g, "\\$")    // prepend dollarsign with backslash
      .replace(/\*/g, "\\*")    // prepend star with backslash
      .replace(/\?/g, "\\?")    // prepend question mark with backslash
      .replace(/\"/g, "\\\"")   // prepend quotes with backslash
      .replace(/\//g, "\\/")    // prepend forward slash with backslash
      .replace(/\n/g, "\n")     // replace newlines
  }

  /*
  * Replace any dynamic fields in the response xml which change at runtime with regex pattern match
  */
  private replaceDynamicsWithRegexPatterns(responseXml: string): string {
    const responseMatch = responseXml
      .replace(
        /<creationTime value=\\\"[0-9]*\\\"\\\/>/g,
        "<creationTime value=\\\"[0-9]*\\\"\\\/>")

      if (process.env.APIGEE_ENVIRONMENT !== "int") {
        return responseMatch
      }

      /* Replace ids and authored on to create valid, easily traceable prescriptions in Spine int */
      return responseMatch
        .replace(
          /<id root=\\\"[0-9A-F\\-]*\\\"\\\/>/i,
          "<id root=\\\"[0-9A-F-]*\\\"\\\/>")
        .replace(
          /<id extension=\\\"[0-9A-Z\\-]*\\\" root=\\\"2\\\.16\\\.840\\\.1\\\.113883\\\.2\\\.1\\\.3\\\.2\\\.4\\\.18\\\.8\\\"\\\/>/g,
          "<id extension=\\\"[0-9A-Z-]*\\\" root=\\\"2\\\.16\\\.840\\\.1\\\.113883\\\.2\\\.1\\\.3\\\.2\\\.4\\\.18\\\.8\\\"\\\/>")
        .replace(
          /<value extension=\\\"[0-9A-Z\\-]*\\\" root=\\\"2\\\.16\\\.840\\\.1\\\.113883\\\.2\\\.1\\\.3\\\.2\\\.4\\\.18\\\.8\\\"\\\/>/g,
          "<value extension=\\\"[0-9A-Z-]*\\\" root=\\\"2\\\.16\\\.840\\\.1\\\.113883\\\.2\\\.1\\\.3\\\.2\\\.4\\\.18\\\.8\\\"\\\/>")
        .replace(
          /<effectiveTime value=\\\"[0-9]*\\\"\\\/>/g,
          "<effectiveTime value=\\\"[0-9]*\\\"\\\/>")
        .replace(
          /<time value=\\\"[0-9]*\\\"\\\/>/g,
          "<time value=\\\"[0-9]*\\\"\\\/>")
  }

  /* Replace ids and authored on to create valid, easily traceable prescriptions in Spine int */
  updateIdsAndAuthoredOn(requestJson: fhir.Bundle) {
    if (process.env.APIGEE_ENVIRONMENT !== "int") {
      return
    }

    requestJson.identifier.value = prescriptionId
    const medicationRequests = (requestJson.entry
      .map(entry => entry.resource)
      .filter(resource => resource.resourceType === "MedicationRequest") as Array<fhir.MedicationRequest>)
  
    medicationRequests.forEach(medicationRequest => {
      medicationRequest.authoredOn = moment.utc().toISOString(true)
      medicationRequest.groupIdentifier.value = shortPrescriptionId
    })
  }
}