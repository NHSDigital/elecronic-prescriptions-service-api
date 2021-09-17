import {ElementCompact} from "xml-js"
import {AgentPerson} from "./agent-person"
import * as codes from "./codes"
import * as core from "./core"
import * as dispenseCommon from "./dispense-common"
import * as prescription from "./prescription"

export class DispenseClaimInformationRoot {
  DispenseClaimInformation: DispenseClaimInformation

  constructor(dispenseClaimInformation: DispenseClaimInformation) {
    this.DispenseClaimInformation = dispenseClaimInformation
  }
}

export class DispenseClaimInformation implements ElementCompact {
  _attributes: core.AttributeClassCode & core.AttributeMoodCode = {
    classCode: "INFO",
    moodCode: "EVN"
  }

  id: codes.GlobalIdentifier
  code: codes.SnomedCode
  effectiveTime: core.Timestamp
  typeId: codes.TypeIdentifier
  primaryInformationRecipient: dispenseCommon.PrimaryInformationRecipient
  //TODO - receiver
  pertinentInformation1: dispenseCommon.DispenseCommonPertinentInformation1<DispenseClaimSupplyHeader>
  //TODO - pertinentInformation2
  replacementOf: dispenseCommon.ReplacementOf
  coverage: Coverage
  sequelTo: dispenseCommon.SequelTo

  constructor(id: codes.GlobalIdentifier, effectiveTime: core.Timestamp) {
    this.id = id
    this.code = new codes.SnomedCode(
      "163541000000107",
      "Dispensed Medication - FocusActOrEvent (administrative concept)"
    )
    this.effectiveTime = effectiveTime
    this.typeId = new codes.TypeIdentifier("PORX_MT142001UK31")
  }
}

export class DispenseClaimSupplyHeader extends dispenseCommon.SupplyHeader<DispenseClaimSuppliedLineItem> {
  legalAuthenticator: LegalAuthenticator
}

export class DispenseClaimSuppliedLineItem implements ElementCompact {
  _attributes: core.AttributeClassCode & core.AttributeMoodCode = {
    classCode: "SBADM",
    moodCode: "PRMS"
  }

  id: codes.GlobalIdentifier
  code: codes.SnomedCode
  effectiveTime: core.Null
  repeatNumber?: core.Interval<core.NumericValue>
  component: Array<dispenseCommon.SuppliedLineItemComponent<DispenseClaimSuppliedLineItemQuantity>>
  pertinentInformation2: dispenseCommon.SuppliedLineItemPertinentInformation2
  pertinentInformation3: dispenseCommon.SuppliedLineItemPertinentInformation3
  inFulfillmentOf: dispenseCommon.SuppliedLineItemInFulfillmentOf

  constructor(id: codes.GlobalIdentifier) {
    this.id = id
    this.code = new codes.SnomedCode("225426007")
    this.effectiveTime = core.Null.NOT_APPLICABLE
  }
}

export class DispenseClaimSuppliedLineItemQuantity implements ElementCompact {
  _attributes: core.AttributeClassCode & core.AttributeMoodCode = {
    classCode: "SPLY",
    moodCode: "EVN"
  }

  code: codes.SnomedCode
  quantity: core.QuantityInAlternativeUnits
  product: dispenseCommon.DispenseProduct
  pertinentInformation1: DispenseClaimSuppliedLineItemQuantityPertinentInformation1
  pertinentInformation2: Array<DispenseClaimSuppliedLineItemQuantityPertinentInformation2>

  constructor(
    quantity: core.QuantityInAlternativeUnits,
    product: dispenseCommon.DispenseProduct,
    pertinentInformation1: DispenseClaimSuppliedLineItemQuantityPertinentInformation1,
    pertinentInformation2: Array<DispenseClaimSuppliedLineItemQuantityPertinentInformation2>
  ) {
    this.code = new codes.SnomedCode("373784005")
    this.quantity = quantity
    this.product = product
    this.pertinentInformation1 = pertinentInformation1
    this.pertinentInformation2 = pertinentInformation2
  }
}

export class DispenseClaimSuppliedLineItemQuantityPertinentInformation2 implements ElementCompact {
  _attributes: core.AttributeTypeCode & core.AttributeContextConductionInd = {
    typeCode: "PERT",
    contextConductionInd: "true"
  }

  seperatableInd: core.BooleanValue
  pertinentDispensingEndorsement: DispensingEndorsement

  constructor(pertinentDispensingEndorsement: DispensingEndorsement) {
    this.seperatableInd = new core.BooleanValue(true)
    this.pertinentDispensingEndorsement = pertinentDispensingEndorsement
  }
}

export class DispensingEndorsement extends prescription.PrescriptionAnnotation {
  text: string
  value: codes.DispensingEndorsementCode

  constructor() {
    super(new codes.PrescriptionAnnotationCode("DE"))
  }
}

export class DispenseClaimSuppliedLineItemQuantityPertinentInformation1 implements ElementCompact {
  _attributes: core.AttributeTypeCode & core.AttributeContextConductionInd = {
    typeCode: "PERT",
    contextConductionInd: "true"
  }

  seperatableInd: core.BooleanValue = new core.BooleanValue(false)
  pertinentChargePayment: ChargePayment

  constructor(pertinentChargePayment: ChargePayment) {
    this.pertinentChargePayment = pertinentChargePayment
  }
}

export class ChargePayment extends prescription.PrescriptionAnnotation {
  value: boolean

  constructor(value: boolean) {
    super(new codes.PrescriptionAnnotationCode("CP"))
    this.value = value
  }
}

export class LegalAuthenticator extends prescription.PrescriptionAuthor {
  _attributes: core.AttributeTypeCode & core.AttributeContextControlCode = {
    typeCode: "LA",
    contextControlCode: "OP"
  }

  constructor(time: core.Timestamp, agentPerson: AgentPerson) {
    super()
    this.time = time
    this.signatureText = core.Null.NOT_APPLICABLE
    this.AgentPerson = agentPerson
  }
}

export class Coverage implements ElementCompact {
  _attributes: core.AttributeTypeCode & core.AttributeContextConductionInd = {
    typeCode: "COVBY",
    contextConductionInd: "true"
  }

  seperatableInd = new core.BooleanValue(false)
  coveringChargeExempt: ChargeExempt

  constructor(chargeExempt: ChargeExempt) {
    this.coveringChargeExempt = chargeExempt
  }
}

export class ChargeExempt extends prescription.PrescriptionAnnotation {
  negationInd: core.BooleanValue
  value: codes.PrescriptionChargeExemptionCode
  authorization?: Authorization

  constructor(chargeExempt: boolean, value: string) {
    super(new codes.PrescriptionAnnotationCode("EX"))
    this.negationInd = new core.BooleanValue(!chargeExempt)
    this.value = new codes.PrescriptionChargeExemptionCode(value)
  }
}

export class EvidenceSeen extends prescription.PrescriptionAnnotation {
  negationInd: core.BooleanValue

  constructor(evidenceSeen: boolean) {
    super(new codes.PrescriptionAnnotationCode("ES"))
    this.negationInd = new core.BooleanValue(!evidenceSeen)
  }
}

export class Authorization implements ElementCompact {
  _attributes: core.AttributeTypeCode & core.AttributeContextConductionInd = {
    typeCode: "AUTH",
    contextConductionInd: "true"
  }

  seperatableInd = new core.BooleanValue(false)
  authorizingEvidenceSeen: EvidenceSeen

  constructor(evidenceSeen: EvidenceSeen) {
    this.authorizingEvidenceSeen = evidenceSeen
  }
}
