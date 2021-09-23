import * as core from "./core"
import * as codes from "./codes"
import {ElementCompact} from "xml-js"
import * as prescription from "./prescription"
import * as lineItem from "./line-item"

/*
 * An act relationship that associates the Dispense focal act with
 * SupplyHeader - the primary act of the PSIS clinical message.
 */
export class DispenseCommonPertinentInformation1<T extends SupplyHeader<DispenseCommonSuppliedLineItem>>
implements ElementCompact {
  _attributes: core.AttributeTypeCode & core.AttributeContextConductionInd = {
    typeCode: "PERT",
    contextConductionInd: "true"
  }

  templateId: codes.TemplateIdentifier = new codes.TemplateIdentifier("CSAB_RM-NPfITUK10.pertinentInformation")
  pertinentSupplyHeader: T

  constructor(pertinentSupplyHeader: T) {
    this.pertinentSupplyHeader = pertinentSupplyHeader
  }
}

/*
* A container for the collection of clinical statements that constitute Dispense Notification information
* to be available on PSIS.
*/
export abstract class SupplyHeader<T extends DispenseCommonSuppliedLineItem> implements ElementCompact {
  _attributes: core.AttributeClassCode & core.AttributeMoodCode = {
    classCode: "SBADM",
    moodCode: "EVN"
  }

  id: codes.GlobalIdentifier
  code: codes.SnomedCode
  effectiveTime: core.Null
  repeatNumber?: core.Interval<core.NumericValue>
  pertinentInformation1: Array<SupplyHeaderPertinentInformation1<T>>
  pertinentInformation3: SupplyHeaderPertinentInformation3
  pertinentInformation4: SupplyHeaderPertinentInformation4
  inFulfillmentOf: InFulfillmentOf

  constructor(id: codes.GlobalIdentifier) {
    this.id = id
    this.code = new codes.SnomedCode("225426007")
    this.effectiveTime = core.Null.NOT_APPLICABLE
  }
}

/*
 * An act relationship that provides information about the actual supplied Line Item (medication).
 */
export class SupplyHeaderPertinentInformation1<T extends DispenseCommonSuppliedLineItem> implements ElementCompact {
  _attributes: core.AttributeTypeCode & core.AttributeContextConductionInd = {
    typeCode: "PERT",
    contextConductionInd: "true",
    inversionInd: "false",
    negationInd: "false"
  }

  seperatableInd: core.BooleanValue = new core.BooleanValue(false)
  templateId: codes.TemplateIdentifier = new codes.TemplateIdentifier("CSAB_RM-NPfITUK10.sourceOf2")
  pertinentSuppliedLineItem: T

  constructor(suppliedLineItem: T) {
    this.pertinentSuppliedLineItem = suppliedLineItem
  }
}

export abstract class DispenseCommonSuppliedLineItem implements ElementCompact {
  _attributes: core.AttributeClassCode & core.AttributeMoodCode = {
    classCode: "SBADM",
    moodCode: "PRMS"
  }

  id: codes.GlobalIdentifier
  code: codes.SnomedCode
  effectiveTime: core.Null
  repeatNumber?: core.Interval<core.NumericValue>

  constructor(id: codes.GlobalIdentifier) {
    this.id = id
    this.code = new codes.SnomedCode("225426007", "Administration of therapeutic substance (procedure)")
    this.effectiveTime = core.Null.NOT_APPLICABLE
  }
}

/*
* An act relationship to provide information on the actual quantity of medication dispensed in this Dispense event.
*/
export class SuppliedLineItemComponent<T extends DispenseCommonSuppliedLineItemQuantity> implements ElementCompact {
  _attributes: core.AttributeTypeCode = {
    typeCode: "COMP"
  }

  seperatableInd: core.BooleanValue = new core.BooleanValue(false)
  suppliedLineItemQuantity: T

  constructor(suppliedLineItemQuantity: T) {
    this.suppliedLineItemQuantity = suppliedLineItemQuantity
  }
}

export abstract class DispenseCommonSuppliedLineItemQuantity implements ElementCompact {
  _attributes: core.AttributeClassCode & core.AttributeMoodCode = {
    classCode: "SPLY",
    moodCode: "EVN"
  }

  code: codes.SnomedCode
  quantity: core.QuantityInAlternativeUnits
  product: DispenseProduct

  constructor(
    quantity: core.QuantityInAlternativeUnits,
    product: DispenseProduct
  ) {
    this.code = new codes.SnomedCode("373784005", "Dispensing medication (procedure)")
    this.quantity = quantity
    this.product = product
  }
}

/**
 * A participation that establishes product specific data for the medication prescribed.
 */
export class DispenseProduct implements ElementCompact {
  _attributes: core.AttributeTypeCode & core.AttributeContextControlCode = {
    typeCode: "PRD",
    contextControlCode: "OP"
  }

  suppliedManufacturedProduct: SuppliedManufacturedProduct

  constructor(suppliedManufacturedProduct: SuppliedManufacturedProduct) {
    this.suppliedManufacturedProduct = suppliedManufacturedProduct
  }
}

/**
 * Details about the physical characteristics of the treatment prescribed.
 */
export class SuppliedManufacturedProduct implements ElementCompact {
  _attributes: core.AttributeClassCode = {
    classCode: "MANU"
  }

  manufacturedSuppliedMaterial: lineItem.ManufacturedRequestedMaterial

  constructor(manufacturedSuppliedMaterial: lineItem.ManufacturedRequestedMaterial) {
    this.manufacturedSuppliedMaterial = manufacturedSuppliedMaterial
  }
}

/*
* An act relationship that considers the status of the original prescription Line Item
* prior to the dispense of the medication.
*/
export class SuppliedLineItemPertinentInformation3 implements ElementCompact {
  _attributes: core.AttributeTypeCode & core.AttributeContextConductionInd = {
    typeCode: "PERT",
    contextConductionInd: "true"
  }

  seperatableInd: core.BooleanValue = new core.BooleanValue(false)
  pertinentItemStatus: lineItem.ItemStatus

  constructor(pertinentItemStatus: lineItem.ItemStatus) {
    this.pertinentItemStatus = pertinentItemStatus
  }
}

/*
* An act relationship to determine that this medication Line Item Dispense event satisifies the
* treatment ordered in the original prescription Line Item which is identified by the prescription
* Line Item id. Details on the original treatment ordered are determined through an act ref that
* points to the data on PSIS.
*/
export class SuppliedLineItemInFulfillmentOf implements ElementCompact {
  _attributes: core.AttributeTypeCode & core.AttributeInversionInd & core.AttributeNegationInd = {
    typeCode: "FLFS",
    inversionInd: "false",
    negationInd: "false"
  }

  seperatableInd: core.BooleanValue = new core.BooleanValue(true)
  templateId: codes.TemplateIdentifier
  priorOriginalItemRef: OriginalPrescriptionRef

  constructor(priorOriginalItemRef: OriginalPrescriptionRef) {
    this.templateId = new codes.TemplateIdentifier("CSAB_RM-NPfITUK10.sourceOf1")
    this.priorOriginalItemRef = priorOriginalItemRef
  }
}

export class OriginalPrescriptionRef implements ElementCompact {
  _attributes: core.AttributeClassCode & core.AttributeMoodCode = {
    classCode: "SBADM",
    moodCode: "RQO"
  }

  id: codes.GlobalIdentifier

  constructor(id: codes.GlobalIdentifier) {
    this.id = id
  }
}

/*
* Details of the status of the Prescription as a function of the dispense progress of the individual medication items.
*/
export class SupplyHeaderPertinentInformation3 implements ElementCompact {
  _attributes: core.AttributeTypeCode & core.AttributeContextConductionInd = {
    typeCode: "PERT",
    contextConductionInd: "true"
  }

  seperatableInd: core.BooleanValue = new core.BooleanValue(false)
  pertinentPrescriptionStatus: PrescriptionStatus

  constructor(pertinentPrescriptionStatus: PrescriptionStatus) {
    this.pertinentPrescriptionStatus = pertinentPrescriptionStatus
  }
}

export class PrescriptionStatus extends prescription.PrescriptionAnnotation {
  value: codes.PrescriptionStatusCode

  constructor(valueCode: string, valueDesc: string) {
    super(new codes.PrescriptionAnnotationCode("PS"))
    this.value = new codes.PrescriptionStatusCode(valueCode, valueDesc)
  }
}

/*
* A link to the identify the original prescription.
*/
export class SupplyHeaderPertinentInformation4 implements ElementCompact {
  _attributes: core.AttributeTypeCode & core.AttributeContextConductionInd = {
    typeCode: "PERT",
    contextConductionInd: "true"
  }
  seperatableInd: core.BooleanValue = new core.BooleanValue(false)
  pertinentPrescriptionID: prescription.PrescriptionId

  constructor(pertinentPrescriptionID: prescription.PrescriptionId) {
    this.pertinentPrescriptionID = pertinentPrescriptionID
  }
}

/*
* An act relationship to denote that this medication dispense is
* satisfying the requirements from the original prescription.
*/
export class InFulfillmentOf implements ElementCompact {
  _attributes: core.AttributeTypeCode & core.AttributeInversionInd & core.AttributeNegationInd = {
    typeCode: "FLFS",
    inversionInd: "false",
    negationInd: "false"
  }

  seperatableInd: core.BooleanValue = new core.BooleanValue(true)
  templateId: codes.TemplateIdentifier
  priorOriginalPrescriptionRef: OriginalPrescriptionRef

  constructor(originalPrescriptionRef: OriginalPrescriptionRef) {
    this.templateId = new codes.TemplateIdentifier("CSAB_RM-NPfITUK10.sourceOf1")
    this.priorOriginalPrescriptionRef = originalPrescriptionRef
  }
}

/*
* An act relationship indicating that Dispense Notification sequentially follows the Prescription Release Event.
*/
export class ReplacementOf implements ElementCompact {
  _attributes: core.AttributeTypeCode = {
    typeCode: "RPLC"
  }

  priorMessageRef: MessageRef

  constructor(messageRef: MessageRef) {
    this.priorMessageRef = messageRef
  }
}

/*
An act used to identify the dispense event which this Dispense Notification is to replace.
*/
export class MessageRef implements ElementCompact {
  _attributes: core.AttributeClassCode & core.AttributeMoodCode = {
    classCode: "INFO",
    moodCode: "EVN"
  }

  id: codes.GlobalIdentifier

  constructor(id: codes.GlobalIdentifier) {
    this.id = id
  }
}

/*
* An act relationship indicating that Dispense Notification sequentially follows the Prescription Release Event.
*/
export class SequelTo implements ElementCompact {
  _attributes: core.AttributeTypeCode = {
    typeCode: "SEQL"
  }

  priorPrescriptionReleaseEventRef: PriorPrescriptionReleaseEventRef

  constructor(priorPrescriptionReleaseEventRef: PriorPrescriptionReleaseEventRef) {
    this.priorPrescriptionReleaseEventRef = priorPrescriptionReleaseEventRef
  }
}

/*
* Details about the Patient Prescription Release Response or the Nominated Prescription Release Response
* that authorised the Dispense event.
*/
export class PriorPrescriptionReleaseEventRef implements ElementCompact {
  _attributes: core.AttributeClassCode & core.AttributeMoodCode = {
    classCode: "INFO",
    moodCode: "RQO"
  }

  id: codes.GlobalIdentifier

  constructor(id: codes.GlobalIdentifier) {
    this.id = id
  }
}
