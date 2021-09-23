import {ElementCompact} from "xml-js"
import * as codes from "./codes"
import * as core from "./core"
import * as prescription from "./prescription"
import * as dispenseCommon from "./dispense-common"
import * as patient from "./patient"
import * as parentPrescription from "./parent-prescription"
import * as lineItem from "./line-item"
import * as organisation from "./organization"

export class DispenseNotificationRoot {
  DispenseNotification: DispenseNotification

  constructor(dispenseNotification: DispenseNotification) {
    this.DispenseNotification = dispenseNotification
  }
}

export class DispenseNotification implements ElementCompact {
  _attributes: core.AttributeClassCode & core.AttributeMoodCode = {
    classCode: "INFO",
    moodCode: "EVN"
  }
  id: codes.GlobalIdentifier
  code: codes.SnomedCode
  effectiveTime: core.Timestamp
  typeId: codes.TypeIdentifier
  recordTarget: patient.RecordTargetReference
  primaryInformationRecipient: DispenseNotificationPrimaryInformationRecipient
  pertinentInformation1: dispenseCommon.DispenseCommonPertinentInformation1<DispenseNotificationSupplyHeader>
  pertinentInformation2: DispenseNotificationPertinentInformation2
  replacementOf?: dispenseCommon.ReplacementOf
  sequelTo: dispenseCommon.SequelTo

  constructor(id: codes.GlobalIdentifier) {
    this.id = id
    this.code = new codes.SnomedCode(
      "163541000000107",
      "Dispensed Medication - FocusActOrEvent (administrative concept)"
    )
    this.effectiveTime = new core.Timestamp("PLACEHOLDER")
    this.typeId = new codes.TypeIdentifier("PORX_MT024001UK31")
  }
}

export class DispenseNotificationPrimaryInformationRecipient implements ElementCompact {
  _attributes: core.AttributeTypeCode & core.AttributeContextControlCode = {
    typeCode: "PRCP",
    contextControlCode: "ON"
  }

  AgentOrg: organisation.AgentOrganization

  constructor(organisation: organisation.AgentOrganization) {
    this.AgentOrg = organisation
  }
}

export class DispenseNotificationSupplyHeader
  extends dispenseCommon.SupplyHeader<DispenseNotificationSuppliedLineItem> {
  author: prescription.PrescriptionAuthor

  constructor(id: codes.GlobalIdentifier, author: prescription.PrescriptionAuthor) {
    super(id)
    this.author = author
  }
}

/*
* Details of the treatment ordered on the prescription Line Item.
* May not be queried from PSIS but sourced from elsewhere.
*/
export class RequestedManufacturedProduct implements ElementCompact {
  _attributes: core.AttributeClassCode = {
    classCode: "MANU"
  }
  manufacturedRequestedMaterial: lineItem.ManufacturedRequestedMaterial

  constructor(manufacturedRequestedMaterial: lineItem.ManufacturedRequestedMaterial) {
    this.manufacturedRequestedMaterial = manufacturedRequestedMaterial
  }
}

/*
* Details about the medication Line Item dispensed to satisfy the requirements for the treatment specified
* in the Prescription Line Item.
*/
export class DispenseNotificationSuppliedLineItem extends dispenseCommon.DispenseCommonSuppliedLineItem {
  consumable: Consumable
  component: dispenseCommon.SuppliedLineItemComponent<DispenseNotificationSuppliedLineItemQuantity>
  component1: SuppliedLineItemComponent1
  pertinentInformation3: dispenseCommon.SuppliedLineItemPertinentInformation3
  inFulfillmentOf: dispenseCommon.SuppliedLineItemInFulfillmentOf
}

/*
* Provides information against the original prescription Line Item against which
* this medication is being dispensed. In this instance, the original prescription
* Line Item is not automatically cross-referenced to reduce overhead on PSIS, so
* the data may be derived from alternative sources which may include visual inspection
* of the prescription by the dispenser.
*/
export class Consumable implements ElementCompact {
  _attributes: core.AttributeTypeCode & core.AttributeContextControlCode = {
    typeCode: "CSM",
    contextControlCode: "OP"
  }

  requestedManufacturedProduct: RequestedManufacturedProduct

  constructor(requestedManufacturedProduct: RequestedManufacturedProduct) {
    this.requestedManufacturedProduct = requestedManufacturedProduct
  }
}

/*
* Details of the actual medication treatment dispensed in this Dispense event for this Line Item.
*/
export class DispenseNotificationSuppliedLineItemQuantity
  extends dispenseCommon.DispenseCommonSuppliedLineItemQuantity {
  pertinentInformation1: DispenseNotificationSuppliedLineItemQuantityPertinentInformation1
}

/*
* This act relationship enables tracking of partial dispenses through the monitor of total medication dispensed to-date.
*/
export class DispenseNotificationSuppliedLineItemQuantityPertinentInformation1 implements ElementCompact {
  _attributes: core.AttributeTypeCode & core.AttributeContextConductionInd = {
    typeCode: "PERT",
    contextConductionInd: "true"
  }

  seperatableInd: core.BooleanValue = new core.BooleanValue(false)
  pertinentSupplyInstructions: SupplyInstructions

  constructor(supplyInstructions: SupplyInstructions) {
    this.pertinentSupplyInstructions = supplyInstructions
  }
}

export class SupplyInstructions extends prescription.PrescriptionAnnotation {
  value: core.Text

  constructor(value: string) {
    super(new codes.PrescriptionAnnotationCode("SI"))
    this.value = new core.Text(value)
  }
}

/*
* An act relationship that relates to the quantity of the medication treatment ordered in the original
* prescription line item. This information might not necessarily be derived from PSIS.
*/
export class SuppliedLineItemComponent1 implements ElementCompact {
  _attributes: core.AttributeTypeCode = {
    typeCode: "COMP"
  }

  seperatableInd: core.BooleanValue = new core.BooleanValue(false)
  supplyRequest: SupplyRequest

  constructor(supplyRequest: SupplyRequest) {
    this.supplyRequest = supplyRequest
  }
}

/*
* Details of the quantity of medication requested.
*/
export class SupplyRequest implements ElementCompact {
  _attributes: core.AttributeClassCode & core.AttributeMoodCode = {
    classCode: "SPLY",
    moodCode: "RQO"
  }

  code: codes.SnomedCode
  quantity: core.QuantityInAlternativeUnits

  constructor(code: codes.SnomedCode, quantity: core.QuantityInAlternativeUnits) {
    this.code = code
    this.quantity = quantity
  }
}

/*
* An identifier of the Act Relationship that relates clinical statements directly to the focal act.
*/
export class DispenseNotificationPertinentInformation2 implements ElementCompact {
  _attributes: core.AttributeTypeCode = {
    typeCode: "PERT"
  }

  templateId: codes.TemplateIdentifier = new codes.TemplateIdentifier("CSAB_RM-NPfITUK10.pertinentInformation1")
  pertinentCareRecordElementCategory: parentPrescription.CareRecordElementCategory

  constructor(pertinentCareRecordElementCategory: parentPrescription.CareRecordElementCategory) {
    this.pertinentCareRecordElementCategory = pertinentCareRecordElementCategory
  }
}
