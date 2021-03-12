import {convertParentPrescription} from "../../../../src/services/translation/request/prescribe/parent-prescription"
import {
  convertFragmentsToHashableFormat,
  extractFragments
} from "../../../../src/services/translation/request/signature"
import * as TestResources from "../../../resources/test-resources"
import * as XmlJs from "xml-js"
import {xmlTest} from "../../../resources/test-helpers"
import {Fragments} from "../../../../src/models/signature"
import requireActual = jest.requireActual
import {MomentFormatSpecification, MomentInput} from "moment"
import * as hl7V3 from "../../../../src/models/hl7-v3"

const actualMoment = requireActual("moment")
jest.mock("moment", () => ({
  utc: (input?: MomentInput, format?: MomentFormatSpecification) =>
    actualMoment.utc(input || "2020-12-18T12:34:34Z", format)
}))

let hl7V3ParentPrescription: hl7V3.ParentPrescription
let fragments: Fragments

beforeAll(() => {
  hl7V3ParentPrescription = convertParentPrescription(TestResources.examplePrescription1.fhirMessageUnsigned)
  fragments = extractFragments(hl7V3ParentPrescription)
})

test("convertFragmentsToHashableFormat returns correct value", () => {
  const output = convertFragmentsToHashableFormat(fragments)
  xmlTest(
    XmlJs.xml2js(output, {compact: true}),
    TestResources.examplePrescription1.hl7V3SignatureFragments
  )()
})
