import * as core from "./core"
import * as codes from "./codes"
import {ElementCompact} from "xml-js"
import * as parentPrescription from "./parent-prescription"
import * as organisation from "./organization"
import * as prescription from "./prescription"
import * as lineItem from "./line-item"

//TODO - some of these types aren't common - move to dispense notification or claim as appropriate

/*
* A container for the collection of clinical statements that constitute Dispense Notification information
* to be available on PSIS.
*/
export abstract class SupplyHeader<T extends ElementCompact> implements ElementCompact {
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
 * An act relationship that associates the Dispense focal act with
 * SupplyHeader - the primary act of the PSIS clinical message.
 */
export class DispenseCommonPertinentInformation1<T extends ElementCompact> implements ElementCompact {
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
 * An act relationship that provides information about the actual supplied Line Item (medication).
 */
export class SupplyHeaderPertinentInformation1<T extends ElementCompact> implements ElementCompact {
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
* An identifier of the Act Relationship that relates clinical statements directly to the focal act.
*/
export class DispenseCommonPertinentInformation2 implements ElementCompact {
  _attributes: core.AttributeTypeCode = {
    typeCode: "PERT"
  }

  templateId: codes.TemplateIdentifier = new codes.TemplateIdentifier("CSAB_RM-NPfITUK10.pertinentInformation1")
  pertinentCareRecordElementCategory: parentPrescription.CareRecordElementCategory

  constructor(pertinentCareRecordElementCategory: parentPrescription.CareRecordElementCategory) {
    this.pertinentCareRecordElementCategory = pertinentCareRecordElementCategory
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
  pertinentPrescriptionStatus: PertinentPrescriptionStatus

  constructor(pertinentPrescriptionStatus: PertinentPrescriptionStatus) {
    this.pertinentPrescriptionStatus = pertinentPrescriptionStatus
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
* Details of the  status of the overall prescription as a function of the respective Medication item statuses.
*/
export class PertinentPrescriptionStatus implements ElementCompact {
  _attributes: core.AttributeClassCode & core.AttributeMoodCode = {
    classCode: "OBS",
    moodCode: "EVN"
  }

  code: codes.PrescriptionAnnotationCode
  value: codes.StatusCode

  constructor(value: codes.StatusCode) {
    this.code = new codes.PrescriptionAnnotationCode("PS")
    this.value = value
  }
}

/*
* Details about the medication Line Item dispensed to satisfy the requirements for the treatment specified
* in the Prescription Line Item.
*/
export class DispenseNotificationSuppliedLineItem implements ElementCompact {
  _attributes: core.AttributeClassCode & core.AttributeMoodCode = {
    classCode: "SBADM",
    moodCode: "PRMS"
  }

  id: codes.GlobalIdentifier
  code: codes.SnomedCode
  effectiveTime: core.Null
  repeatNumber?: core.Interval<core.NumericValue>
  // todo Dispense:? mim says do not use but will be available in future circa many years ago
  doseQuantity: undefined
  // todo Dispense: ? mim says do not use but will be available in future circa many years ago
  rateQuantity: undefined
  consumable: Consumable
  component: SuppliedLineItemComponent<DispenseNotificationSuppliedLineItemQuantity>
  component1: SuppliedLineItemComponent1
  pertinentInformation3: SuppliedLineItemPertinentInformation3
  inFulfillmentOf: SuppliedLineItemInFulfillmentOf

  constructor(id: codes.GlobalIdentifier, code: codes.SnomedCode) {
    this.id = id
    this.code = code
    this.effectiveTime = core.Null.NOT_APPLICABLE
  }
}

/*
* An act relationship to provide information on the actual quantity of medication dispensed in this Dispense event.
*/
export class SuppliedLineItemComponent<T extends ElementCompact> implements ElementCompact {
  _attributes: core.AttributeTypeCode = {
    typeCode: "COMP"
  }

  seperatableInd: core.BooleanValue = new core.BooleanValue(false)
  suppliedLineItemQuantity: T

  constructor(suppliedLineItemQuantity: T) {
    this.suppliedLineItemQuantity = suppliedLineItemQuantity
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
* Details of the actual medication treatment dispensed in this Dispense event for this Line Item.
*/
export class DispenseNotificationSuppliedLineItemQuantity implements ElementCompact {
  _attributes: core.AttributeClassCode & core.AttributeMoodCode = {
    classCode: "SPLY",
    moodCode: "EVN"
  }

  code: codes.SnomedCode
  quantity: core.QuantityInAlternativeUnits
  product: DispenseProduct
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
  pertinentSupplyInstructions: PertinentSupplyInstructions

  constructor(pertinentSupplyInstructions: PertinentSupplyInstructions) {
    this.pertinentSupplyInstructions = pertinentSupplyInstructions
  }
}

/*
* Medication administration instructions as supplied by the dispenser and printed on the supplied items.
* Normally, these should be the same as the prescriber instructions except when the supplied medication
* varies from the prescribed medication requiring more drug specification information.
*/
export class PertinentSupplyInstructions implements ElementCompact {
  _attributes: core.AttributeClassCode & core.AttributeMoodCode = {
    classCode: "OBS",
    moodCode: "EVN"
  }

  code: codes.PrescriptionAnnotationCode
  value: core.Text

  constructor(value: core.Text) {
    this.code = new codes.PrescriptionAnnotationCode("SI")
    this.value = value
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

export class PrimaryInformationRecipient implements ElementCompact {
  _attributes: core.AttributeTypeCode = {
    typeCode: "PRCP"
  }

  AgentOrg: organisation.AgentOrganization

  constructor(organisation: organisation.AgentOrganization) {
    this.AgentOrg = organisation
  }
}

export class DispenseCommonPrimaryInformationRecipient implements ElementCompact {
  _attributes: core.AttributeTypeCode & core.AttributeContextControlCode = {
    typeCode: "PRCP",
    contextControlCode: "ON"
  }

  AgentOrg: organisation.AgentOrganization

  constructor(organisation: organisation.AgentOrganization) {
    this.AgentOrg = organisation
  }
}

export class SuppliedLineItemPertinentInformation2 implements ElementCompact {
  _attributes: core.AttributeTypeCode & core.AttributeContextConductionInd = {
    typeCode: "PERT",
    contextConductionInd: "true"
  }

  seperatableInd: core.BooleanValue = new core.BooleanValue(false)
  pertinentNonDispensingReason: prescription.NonDispensingReason

  constructor(nonDispensingReason: prescription.NonDispensingReason) {
    this.pertinentNonDispensingReason = nonDispensingReason
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
  pertinentItemStatus: PertinentItemStatus

  constructor(pertinentItemStatus: PertinentItemStatus) {
    this.pertinentItemStatus = pertinentItemStatus
  }
}

/*
* Describes the status of the prescription Line Item as a result of the dispense event.
*/
export class PertinentItemStatus implements ElementCompact {
  _attributes: core.AttributeClassCode & core.AttributeMoodCode = {
    classCode: "OBS",
    moodCode: "EVN"
  }

  code: codes.PrescriptionAnnotationCode
  value: codes.ItemStatusCode

  constructor(value: codes.ItemStatusCode) {
    this.code = new codes.PrescriptionAnnotationCode("IS")
    this.value = value
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

