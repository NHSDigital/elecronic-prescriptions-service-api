import * as core from "./core"
import * as codes from "./codes"
import * as messaging from "./messaging"
import * as prescription from "./prescription"

export class DispenseProposalReturn {
  _attributes: core.AttributeClassCode & core.AttributeMoodCode = {
    classCode: "INFO",
    moodCode: "EVN"
  }

  id: codes.GlobalIdentifier
  effectiveTime: core.Timestamp
  author: messaging.SendMessagePayloadAuthorAgentPerson
  pertinentInformation1: DispenseProposalReturnPertinentInformation1
  pertinentInformation3: DispenseProposalReturnPertinentInformation3
  reversalOf: DispenseProposalReturnReversalOf

  constructor(id: codes.GlobalIdentifier, effectiveTime: core.Timestamp) {
    this.id = id
    this.effectiveTime = effectiveTime
  }
}

export class DispenseProposalReturnPertinentInformation1 {
  _attributes: core.AttributeTypeCode & core.AttributeContextConductionInd = {
    typeCode: "PERT",
    contextConductionInd: "true"
  }

  seperatableInd: core.BooleanValue = new core.BooleanValue(false)
  pertinentPrescriptionID: PrescriptionId

  constructor(prescriptionId: PrescriptionId) {
    this.pertinentPrescriptionID = prescriptionId
  }
}

export class PrescriptionId extends prescription.PrescriptionAnnotation {
  value: codes.ShortFormPrescriptionIdentifier

  constructor(value: string) {
    super(new codes.PrescriptionAnnotationCode("PID"))
    this.value = new codes.ShortFormPrescriptionIdentifier(value)
  }
}

export class DispenseProposalReturnPertinentInformation3 {
  _attributes: core.AttributeTypeCode & core.AttributeContextConductionInd = {
    typeCode: "PERT",
    contextConductionInd: "false"
  }

  seperatableInd: core.BooleanValue = new core.BooleanValue(false)
  pertinentReturnReason: ReturnReason

  constructor(returnReason: ReturnReason) {
    this.pertinentReturnReason = returnReason
  }
}

export class ReturnReason extends prescription.PrescriptionAnnotation {
  value: codes.ReturnReasonCode

  constructor(value: codes.ReturnReasonCode) {
    super(new codes.PrescriptionAnnotationCode("RR"))
    this.value = value
  }
}

export class DispenseProposalReturnReversalOf {
  _attributes: core.AttributeTypeCode & core.AttributeInversionInd & core.AttributeNegationInd = {
    typeCode: "REV",
    inversionInd: "true",
    negationInd: "false"
  }

  seperatableInd: core.BooleanValue = new core.BooleanValue(true)
  priorPrescriptionReleaseResponseRef: PrescriptionReleaseResponseRef

  constructor(prescriptionReleaseResponseRef: PrescriptionReleaseResponseRef) {
    this.priorPrescriptionReleaseResponseRef = prescriptionReleaseResponseRef
  }
}

export class PrescriptionReleaseResponseRef {
  _attributes: core.AttributeClassCode & core.AttributeMoodCode = {
    classCode: "INFO",
    moodCode: "EVN"
  }

  id: codes.GlobalIdentifier

  constructor(value: string) {
    this.id = new codes.GlobalIdentifier(value)
  }
}
