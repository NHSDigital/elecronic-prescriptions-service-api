import {
  convertDispenseNotification,
  getFhirGroupIdentifierExtension,
  getPrescriptionItemNumber,
  getPrescriptionStatus
} from "../../../../../src/services/translation/request/dispense/dispense-notification"
import * as TestResources from "../../../../resources/test-resources"
import requireActual = jest.requireActual
import {MomentFormatSpecification, MomentInput} from "moment"
import {hl7V3, fhir} from "@models"
import {getExtensionForUrl, toArray} from "../../../../../src/services/translation/common"
import {clone} from "../../../../resources/test-helpers"
import {
  getMedicationDispenses,
  getMessageHeader
} from "../../../../../src/services/translation/common/getResourcesOfType"
import {ElementCompact} from "xml-js"
import pino = require("pino")
import {createAgentPersonForUnattendedAccess} from "../../../../../src/services/translation/request/agent-unattended"

const logger = pino()

const actualMoment = requireActual("moment")
jest.mock("moment", () => ({
  utc: (input?: MomentInput, format?: MomentFormatSpecification) =>
    actualMoment.utc(input || "2020-12-18T12:34:34Z", format)
}))
jest.mock("../../../../../src/services/translation/request/agent-unattended", () => ({
  createAgentPersonForUnattendedAccess: jest.fn()
}))

describe("convertPrescriptionDispense", () => {
  const cases = toArray(TestResources.examplePrescription3)
    .map((example: TestResources.ExamplePrescription) => [
      example.description,
      example.fhirMessageDispense,
      // eslint-disable-next-line max-len
      example.hl7V3MessageDispense.PORX_IN080101SM31.ControlActEvent.subject.DispenseNotification as hl7V3.DispenseNotification
    ])

  test.each(cases)("accepts %s", async(desc: string, input: fhir.Bundle) => {
    expect(async() => await convertDispenseNotification(input, logger)).not.toThrow()
  })
})

describe("getPrescriptionStatus", () => {
  const cases = [
    /* eslint-disable max-len */
    [{code: "0001", display: "To be Dispensed"}, createStatusCode("0001", "To be Dispensed")._attributes],
    [{code: "0002", display: "With Dispenser"}, createStatusCode("0002", "With Dispenser")._attributes],
    [{code: "0003", display: "With Dispenser - Active"}, createStatusCode("0003", "With Dispenser - Active")._attributes],
    [{code: "0004", display: "Expired"}, createStatusCode("0004", "Expired")._attributes],
    [{code: "0005", display: "Cancelled"}, createStatusCode("0005", "Cancelled")._attributes],
    [{code: "0006", display: "Dispensed"}, createStatusCode("0006", "Dispensed")._attributes],
    [{code: "0007", display: "Not Dispensed"}, createStatusCode("0007", "Not Dispensed")._attributes]
    /* eslint-enable max-len */
  ]

  test.each(cases)(
    "when status is %p, getPrescriptionStatus returns prescription status %p",
    (code: fhir.Coding, expected: ElementCompact) => {
      const bundle = clone(TestResources.examplePrescription3.fhirMessageDispense)
      const fhirMedicationDispenses = getMedicationDispenses(bundle)
      expect(fhirMedicationDispenses.length).toBeGreaterThan(0)
      fhirMedicationDispenses.map(medicationDispense => {
        setStatusCode(medicationDispense, code)
        const prescriptionStatus = getPrescriptionStatus(medicationDispense)
        expect(prescriptionStatus.valueCoding.code).toEqual(expected.code)
        expect(prescriptionStatus.valueCoding.display).toEqual(expected.displayName)
      })
    }
  )
})

describe("fhir MessageHeader maps correct values in DispenseNotification", () => {
  let dispenseNotification: fhir.Bundle
  let messageHeader: fhir.MessageHeader
  beforeEach(() => {
    dispenseNotification = clone(TestResources.examplePrescription3.fhirMessageDispense)
    messageHeader = getMessageHeader(dispenseNotification)
  })

  test("replacementOf extension maps to sequelTo.priorMessageRef.id when present", async() => {
    messageHeader.extension = [{
      url: "https://fhir.nhs.uk/StructureDefinition/Extension-replacementOf",
      valueIdentifier: {
        system: "TEST-SYSTEM",
        value: "TEST-VALUE"
      }
    }]

    const hl7dispenseNotification = await convertDispenseNotification(dispenseNotification, logger)

    expect(hl7dispenseNotification.replacementOf.priorMessageRef.id._attributes.root).toEqual("TEST-VALUE")
  })

  test("replacementOf extension doesn't map to sequelTo.priorMessageRef.id when missing", async() => {
    messageHeader.extension = []

    const hl7dispenseNotification = await convertDispenseNotification(dispenseNotification, logger)

    expect(hl7dispenseNotification.replacementOf).toBeUndefined()
  })
  test("response.identifier maps to sequelTo.priorPrescriptionReleaseEventRef.id", async() => {
    messageHeader.response.identifier = "XX-TEST-VALUE"

    const hl7dispenseNotification = await convertDispenseNotification(dispenseNotification, logger)

    expect(
      hl7dispenseNotification
        .sequelTo.priorPrescriptionReleaseEventRef.id._attributes.root
    ).toEqual(
      messageHeader.response.identifier
    )
  })
})

describe("fhir MedicationDispense maps correct values in DispenseNotificiation", () => {
  let dispenseNotification: fhir.Bundle
  let medicationDispenses: Array<fhir.MedicationDispense>
  beforeEach(() => {
    dispenseNotification = clone(TestResources.examplePrescription3.fhirMessageDispense)
    medicationDispenses = getMedicationDispenses(dispenseNotification)
    expect(medicationDispenses.length).toBeGreaterThan(0)
  })

  // eslint-disable-next-line max-len
  test("performer.actor.(type === Organization) maps to primaryInformationRecipient.AgentOrg.agentOrganization", async() => {
    medicationDispenses.forEach(medicationDispense =>
      setOrganisation(medicationDispense, "XX-TEST-VALUE", "XX-TEST-VALUE-DISPLAY")
    )

    const hl7dispenseNotification = await convertDispenseNotification(dispenseNotification, logger)

    medicationDispenses.map((medicationDispense) => {
      const fhirOrganisation = medicationDispense.performer.find(p => p.actor.type === "Organization")
      expect(
        hl7dispenseNotification
          .primaryInformationRecipient.AgentOrg.agentOrganization.id._attributes.extension
      ).toEqual(
        fhirOrganisation.actor.identifier.value
      )

      expect(
        hl7dispenseNotification
          .primaryInformationRecipient.AgentOrg.agentOrganization.name._text
      ).toEqual(
        fhirOrganisation.actor.display
      )
    })
  })

  // eslint-disable-next-line max-len
  test("identifier.value maps to pertinentInformation1.pertinentSupplyHeader.pertinentInformation1.pertinentSuppliedLineItem.id", async() => {
    medicationDispenses.forEach(medicationDispense => setPrescriptionItemNumber(medicationDispense, "XX-TEST-VALUE"))

    const hl7dispenseNotification = await convertDispenseNotification(dispenseNotification, logger)

    medicationDispenses.map((medicationDispense, index) => {
      expect(
        hl7dispenseNotification
          .pertinentInformation1
          .pertinentSupplyHeader
          .pertinentInformation1[index]
          .pertinentSuppliedLineItem.id._attributes.root
      ).toEqual(
        getPrescriptionItemNumber(medicationDispense)
      )
    })
  })

  // eslint-disable-next-line max-len
  test("medicationCodeableConcept.coding maps to pertinentInformation1.pertinentSupplyHeader.pertinentInformation1.pertinentSuppliedLineItem.component.suppliedLineItemQuantity.product.suppliedManufacturedProduct.manufacturedSuppliedMaterial.code", async() => {
    medicationDispenses.forEach(medicationDispense =>
      setMedicationCodeableConcept(medicationDispense, "XX-TEST-VALUE", "XX-TEST-VALUE-DISPLAY")
    )

    const hl7dispenseNotification = await convertDispenseNotification(dispenseNotification, logger)

    medicationDispenses.map((_, index) => {
      expect(
        hl7dispenseNotification
          .pertinentInformation1
          .pertinentSupplyHeader
          .pertinentInformation1[index]
          .pertinentSuppliedLineItem
          .component
          .suppliedLineItemQuantity
          .product
          .suppliedManufacturedProduct
          .manufacturedSuppliedMaterial
          .code
          ._attributes.code
      ).toEqual(
        "XX-TEST-VALUE"
      )
      expect(
        hl7dispenseNotification
          .pertinentInformation1
          .pertinentSupplyHeader
          .pertinentInformation1[index]
          .pertinentSuppliedLineItem
          .component
          .suppliedLineItemQuantity
          .product
          .suppliedManufacturedProduct
          .manufacturedSuppliedMaterial
          .code
          ._attributes.displayName
      ).toEqual(
        "XX-TEST-VALUE-DISPLAY"
      )
    })
  })

  test("subject.Patient.value maps to recordTarget.patient.id.extension", async() => {
    medicationDispenses.forEach(medicationDispense => setPatientId(medicationDispense, "XX-TEST-VALUE"))

    const hl7dispenseNotification = await convertDispenseNotification(dispenseNotification, logger)

    medicationDispenses.map((medicationDispense) => {
      expect(
        hl7dispenseNotification.recordTarget.patient.id._attributes.extension
      ).toEqual(
        medicationDispense.subject.identifier.value
      )
    })
  })

  test("authorizingPrescription maps to pertinentInformation1.pertinentSupplyHeader", async() => {
    medicationDispenses.forEach(medicationDispense =>
      setAuthorizingPrescriptionValues(
        medicationDispense,
        "XX-TEST-VALUE-SHORTFORM",
        "XX-TEST-VALUE-UUID",
        "XX-TEST-VALUE-IDENTIFIER")
    )

    const hl7dispenseNotification = await convertDispenseNotification(dispenseNotification, logger)

    medicationDispenses.map((medicationDispense, index) => {
      expect(
        hl7dispenseNotification
          .pertinentInformation1
          .pertinentSupplyHeader
          .pertinentInformation4
          .pertinentPrescriptionID
          .value
          ._attributes
          .extension
      ).toEqual(
        getShortFormIdExtension(
          getFhirGroupIdentifierExtension(medicationDispense)
        ).valueIdentifier.value
      )
      expect(
        hl7dispenseNotification
          .pertinentInformation1
          .pertinentSupplyHeader
          .inFulfillmentOf
          .priorOriginalPrescriptionRef
          .id
          ._attributes
          .root
      ).toEqual(
        getUuidExtension(
          getFhirGroupIdentifierExtension(medicationDispense)
        ).valueIdentifier.value
      )
      expect(
        hl7dispenseNotification
          .pertinentInformation1
          .pertinentSupplyHeader
          .pertinentInformation1[index]
          .pertinentSuppliedLineItem
          .inFulfillmentOf
          .priorOriginalItemRef
          .id
          ._attributes
          .root
      ).toEqual(
        medicationDispense.authorizingPrescription
          .map(a => a.identifier)
          .filter(identifier =>
            identifier.system === "https://fhir.nhs.uk/Id/prescription-order-item-number"
          )[0]
          .value
      )
    })
  })

  // eslint-disable-next-line max-len
  test("quantity maps to pertinentInformation1.pertinentSupplyHeader.pertinentInformation1.pertinentSuppliedLineItem.component.suppliedLineItemQuantity", async() => {
    medicationDispenses.forEach(medicationDispense => {
      medicationDispense.quantity.value = "XX-TEST-VALUE"
      medicationDispense.quantity.unit = "XX-TEST-VALUE-UNIT"
      medicationDispense.quantity.code = "XX-TEST-VALUE-CODE"
    })

    const hl7dispenseNotification = await convertDispenseNotification(dispenseNotification, logger)

    medicationDispenses.map((medicationDispense, index) => {
      expect(
        hl7dispenseNotification
          .pertinentInformation1
          .pertinentSupplyHeader
          .pertinentInformation1[index]
          .pertinentSuppliedLineItem
          .component
          .suppliedLineItemQuantity
          .quantity
          ._attributes
          .value
      ).toEqual(
        medicationDispense.quantity.value
      )
      expect(
        hl7dispenseNotification
          .pertinentInformation1
          .pertinentSupplyHeader
          .pertinentInformation1[index]
          .pertinentSuppliedLineItem
          .component
          .suppliedLineItemQuantity
          .quantity
          .translation
          ._attributes
          .value
      ).toEqual(
        medicationDispense.quantity.value
      )
      expect(
        hl7dispenseNotification
          .pertinentInformation1
          .pertinentSupplyHeader
          .pertinentInformation1[index]
          .pertinentSuppliedLineItem
          .component
          .suppliedLineItemQuantity
          .quantity
          .translation
          ._attributes
          .displayName
      ).toEqual(
        medicationDispense.quantity.unit
      )
      expect(
        hl7dispenseNotification
          .pertinentInformation1
          .pertinentSupplyHeader
          .pertinentInformation1[index]
          .pertinentSuppliedLineItem
          .component
          .suppliedLineItemQuantity
          .quantity
          .translation
          ._attributes.code
      ).toEqual(
        medicationDispense.quantity.code
      )
    })
  })

  test("whenPrepared maps to pertinentInformation1.pertinentSupplyHeader.author.time", async() => {
    medicationDispenses.forEach(medicationDispense => medicationDispense.whenPrepared = "2020-03-10")

    const expected = "20200310000000"

    const hl7dispenseNotification = await convertDispenseNotification(dispenseNotification, logger)

    medicationDispenses.map(() => {
      expect(
        hl7dispenseNotification
          .pertinentInformation1
          .pertinentSupplyHeader
          .author
          .time
          ._attributes
          .value
      ).toEqual(
        expected
      )
    })
  })

  test("pertinentInformation1.pertinentSupplyHeader.author populated using ODS details", async () => {
    const mockAgentPersonResponse = new hl7V3.AgentPerson()
    const mockAgentPersonFunction = createAgentPersonForUnattendedAccess as jest.Mock
    mockAgentPersonFunction.mockReturnValueOnce(Promise.resolve(mockAgentPersonResponse))

    const hl7dispenseNotification = await convertDispenseNotification(dispenseNotification, logger)

    expect(mockAgentPersonFunction).toHaveBeenCalledWith("T1450", logger)
    expect(
      hl7dispenseNotification
        .pertinentInformation1
        .pertinentSupplyHeader
        .author
        .AgentPerson
    ).toEqual(
      mockAgentPersonResponse
    )
  })

  // eslint-disable-next-line max-len
  test("dosage maps to pertinentInformation1.pertinentSupplyHeader.pertinentInformation1.pertinentSuppliedLineItem.component.suppliedLineItemQuantity.pertinentInformation1.pertinentSupplyInstructions", async() => {
    medicationDispenses.forEach(medicationDispense =>
      medicationDispense.dosageInstruction.forEach(d => d.text = "XX-TEST-VALUE")
    )

    const hl7dispenseNotification = await convertDispenseNotification(dispenseNotification, logger)

    medicationDispenses.map((medicationDispense, index) => {
      expect(
        hl7dispenseNotification
          .pertinentInformation1
          .pertinentSupplyHeader
          .pertinentInformation1[index]
          .pertinentSuppliedLineItem
          .component
          .suppliedLineItemQuantity
          .pertinentInformation1
          .pertinentSupplyInstructions
          .value
          ._text
      ).toEqual(
        medicationDispense.dosageInstruction[0].text
      )
    })
  })
})

function createStatusCode(code: string, display: string): hl7V3.PrescriptionStatusCode {
  const statusCode = new hl7V3.PrescriptionStatusCode(code)
  statusCode._attributes.displayName = display
  return statusCode
}

function setStatusCode(
  medicationDispense: fhir.MedicationDispense,
  newStatusCoding: fhir.Coding
): void {
  const prescriptionStatus = getPrescriptionStatus(medicationDispense)
  prescriptionStatus.valueCoding.code = newStatusCoding.code
  prescriptionStatus.valueCoding.display = newStatusCoding.display
}

function setPrescriptionItemNumber(
  medicationDispense: fhir.MedicationDispense,
  newPrescriptionItemNumber: string
): void {
  medicationDispense.identifier
    .forEach(i => {
      if (i.system === "https://fhir.nhs.uk/Id/prescription-dispense-item-number") {
        i.value = newPrescriptionItemNumber
      }
    })
}

function setMedicationCodeableConcept(
  medicationDispense: fhir.MedicationDispense,
  newMedicationCode: string,
  newMedicationDisplay: string
): void {
  medicationDispense.medicationCodeableConcept.coding.forEach(c => {
    c.code = newMedicationCode
    c.display = newMedicationDisplay
  })
}

function setOrganisation(
  medicationDispense: fhir.MedicationDispense,
  newOrganisationCode: string,
  newOrganisationName: string
): void {
  const org = medicationDispense.performer.find(p => p.actor.type === "Organization")
  org.actor.identifier.value = newOrganisationCode
  org.actor.display = newOrganisationName
}

function setPatientId(
  medicationDispense: fhir.MedicationDispense,
  newPatientId: string
): void {
  medicationDispense.subject.identifier.value = newPatientId
}

function setAuthorizingPrescriptionValues(
  medicationDispense: fhir.MedicationDispense,
  newShortForm: string,
  newUuid: string,
  newIdentifier: string
): void {
  const groupIdExtension = getFhirGroupIdentifierExtension(medicationDispense)
  const shortFormIdExtension = getShortFormIdExtension(groupIdExtension)
  shortFormIdExtension.valueIdentifier.value = newShortForm
  const uuidExtension = getUuidExtension(groupIdExtension)
  uuidExtension.valueIdentifier.value = newUuid
  medicationDispense.authorizingPrescription.map(a => a.identifier).forEach(i => {
    if (i.system === "https://fhir.nhs.uk/Id/prescription-order-item-number") {
      i.value = newIdentifier
    }
  })
}

function getShortFormIdExtension(
  groupIdExtension: fhir.ExtensionExtension<fhir.Extension>
): fhir.IdentifierExtension {
  return getExtensionForUrl(
    groupIdExtension.extension,
    "shortForm",
    "MedicationDispense.authorizingPrescription.extension.valueIdentifier"
  ) as fhir.IdentifierExtension
}

function getUuidExtension(
  groupIdExtension: fhir.ExtensionExtension<fhir.Extension>
): fhir.IdentifierExtension {
  return getExtensionForUrl(
    groupIdExtension.extension,
    "UUID",
    "MedicationDispense.authorizingPrescription.extension.valueIdentifier"
  ) as fhir.IdentifierExtension
}
