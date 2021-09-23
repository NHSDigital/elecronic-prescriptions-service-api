/* eslint-disable-next-line */
import * as fs from "fs"
import {Case} from "./case"
import * as LosslessJson from "lossless-json"
import {ExampleFile} from "../example-file"
import * as fhir from "../../fhir"

export class ConvertCase extends Case {
  description: string
  request: fhir.Bundle
  response: string
  responseMatcher: string
  statusText: string

  constructor(requestFile: ExampleFile, responseFile: ExampleFile) {
    super(requestFile, responseFile)

    const responseString = fs.readFileSync(responseFile.path, "utf-8")
    this.response = this.isSuccess ? responseString : JSON.parse(LosslessJson.stringify(responseString))
    this.responseMatcher = this.isSuccess
      ? this.buildResponseMatcher(requestFile.operation, this.response).trimEnd()
      : ""
  }

  private buildResponseMatcher(operation: string, responseXml: string): string {
    const regexPattern = this.escapeRegexSpecialCharacters(responseXml)
    return this.replaceDynamicsWithRegexPatterns(operation, regexPattern)
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
      .replace(/\\/g, "\\") // prepend backslash with backslash
      .replace(/\./g, "\\.") // prepend fullstop with backslash
      .replace(/\|/g, "\\|") // prepend pipe with backslash
      .replace(/\(/g, "\\(") // prepend opening bracket with backslash
      .replace(/\)/g, "\\)") // prepend closing bracket with backslash
      .replace(/\[/g, "\\[") // prepend opening square bracket with backslash
      .replace(/]/g, "\\]") // prepend closing square bracket with backslash
      .replace(/{/g, "\\{") // prepend opening braces with backslash
      .replace(/}/g, "\\}") // prepend closing braces with backslash
      .replace(/\+/g, "\\+") // prepend plus with backslash
      .replace(/\^/g, "\\^") // prepend ^ with backslash
      .replace(/\$/g, "\\$") // prepend dollarsign with backslash
      .replace(/\*/g, "\\*") // prepend star with backslash
      .replace(/\?/g, "\\?") // prepend question mark with backslash
      .replace(/"/g, "\\\"") // prepend quotes with backslash
      .replace(/\//g, "\\/") // prepend forward slash with backslash
      .replace(/\n/g, "\n") // replace newlines
  }

  /*
  * Replace any dynamic fields in the response xml which change at runtime with regex pattern match
  */
  private replaceDynamicsWithRegexPatterns(operation: string, responseXml: string): string {
    responseXml = responseXml.replace(
      /<creationTime value=\\"[0-9]*\\"\\\/>/g,
      "<creationTime value=\\\"[0-9]*\\\"\\/>"
    )

    responseXml = responseXml.replace(
      /<id extension=\\"[0-9]*\\" root=\\"1\\.2\\.826\\.0\\.1285\\.0\\.2\\.0\\.107\\"\\\/>/g,
      "<id extension=\\\"[0-9]*\\\" root=\\\"1\\.2\\.826\\.0\\.1285\\.0\\.2\\.0\\.107\\\"\\/>"
    )

    if (operation === "dispense" || operation === "release" || operation === "claim") {
      responseXml = responseXml.replace(
        /<effectiveTime value=\\"[0-9]*\\"\\\/>/g,
        "<effectiveTime value=\\\"[0-9]*\\\"\\/>"
      )
    }

    if (operation === "release") {
      responseXml = responseXml.replace(
        /<id root=\\"[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}\\"\\\/>/g,
        "<id root=\\\"[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}\\\"\\/>"
      )
    }

    if (operation === "claim") {
      responseXml = responseXml.replace(
        /<time value=\\"[0-9]*\\"\\\/>/g,
        "<time value=\\\"[0-9]*\\\"\\/>"
      )
    }

    return responseXml
  }

  toSuccessJestCase(): [string, fhir.Bundle, string, string, number] {
    return [this.description, this.request, this.response, this.responseMatcher, this.statusCode]
  }

  toErrorJestCase(): [string, fhir.Bundle, string, number] {
    return [this.description, this.request, this.response, this.statusCode]
  }
}
