import * as TestResources from "../../resources/test-resources"
import validator from "xsd-schema-validator"
import * as xml from "../../../src/services/serialisation/xml"

type Result = {
  valid: boolean;
  messages: Array<string>;
  result: string;
};

type ValidationResult = {
  result: Result;
  err: Error;
}

async function validate(xmlString: string, schemaPath: string, printXml=false): Promise<ValidationResult> {
  if (printXml) {
    console.log(xml.writeXmlStringPretty(xml.readXml(xmlString)))
  }

  return new Promise((resolve) => validator.validateXML(xmlString, schemaPath, (err, result) => {
    resolve({
      result: result,
      err: err
    })
  }))
}

describe("Validation tests:", () => {
  test.each(TestResources.convertSuccessClaimExamples)(
    "%s message should validate against Claim BSA schema.",
    async (testname: string, response: string) => {
      const schemaPath = TestResources.dispensingValidationSchema.Claim

      const {result, err} = await validate(response, schemaPath)

      expect(err).toBeNull()
      expect(result.valid).toBeTruthy()
    }
  )

  test.each(TestResources.convertSuccessDispenseExamples)(
    "%s message should validate against DispenseNotification BSA schema.",
    async (testname: string, response: string) => {
      const schemaPath = TestResources.dispensingValidationSchema.DispenseNotification

      const {result, err} = await validate(response, schemaPath)

      expect(err).toBeNull()
      expect(result.valid).toBeTruthy()
    }
  )

  test.each(TestResources.convertSuccessReleaseExamples)(
    "%s message should validate against PatientRelease BSA schema.",
    async (testname: string, response: string) => {
      const schemaPath = TestResources.dispensingValidationSchema.PatientRelease

      const {result, err} = await validate(response, schemaPath)

      expect(err).toBeNull()
      expect(result.valid).toBeTruthy()
    }
  )

  test.each(TestResources.convertSuccessReturnExamples)(
    "%s message should validate against Return BSA schema.",
    async (testname: string, response: string) => {
      const schemaPath = TestResources.dispensingValidationSchema.Return

      const {result, err} = await validate(response, schemaPath)

      expect(err).toBeNull()
      expect(result.valid).toBeTruthy()
    }
  )

  test.each(TestResources.convertSuccessWithdrawExamples)(
    "%s message should validate against Withdraw BSA schema.",
    async (testname: string, response: string) => {
      const schemaPath = TestResources.dispensingValidationSchema.Withdraw

      const {result, err} = await validate(response, schemaPath)

      expect(err).toBeNull()
      expect(result.valid).toBeTruthy()
    }
  )
})
