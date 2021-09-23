import * as agentPerson from "./agent-person"
import * as core from "./core"
import * as codes from "./codes"
import {ElementCompact} from "xml-js"
import * as patient from "./patient"
import * as prescription from "./prescription"

export class CancellationRequestRoot {
  CancellationRequest: CancellationRequest

  constructor(cancellationPrescription: CancellationRequest) {
    this.CancellationRequest = cancellationPrescription
  }
}

export class CancellationRequest implements ElementCompact {
  _attributes: core.AttributeClassCode & core.AttributeMoodCode = {
    classCode: "INFO",
    moodCode: "EVN"
  }

  id: codes.GlobalIdentifier
  effectiveTime: core.Timestamp
  typeId: codes.TypeIdentifier
  recordTarget: patient.RecordTarget
  author: agentPerson.Author
  responsibleParty: agentPerson.ResponsibleParty
  pertinentInformation1: CancellationRequestPertinentInformation1
  pertinentInformation2: CancellationRequestPertinentInformation2
  pertinentInformation: CancellationRequestPertinentInformation
  pertinentInformation3: CancellationRequestPertinentInformation3

  constructor(id: codes.GlobalIdentifier, effectiveTime: core.Timestamp) {
    this.id = id
    this.effectiveTime = effectiveTime
    this.typeId = new codes.TypeIdentifier("PORX_MT135001UK32")
  }
}

export class CancellationRequestPertinentInformation2 {
  _attributes: core.AttributeTypeCode & core.AttributeContextConductionInd = {
    typeCode: "PERT",
    contextConductionInd: "true"
  }
  seperatableInd: core.BooleanValue = new core.BooleanValue(false)
  pertinentPrescriptionID: prescription.PrescriptionId

  constructor(shortFormPrescriptionID: string){
    this.pertinentPrescriptionID = new prescription.PrescriptionId(shortFormPrescriptionID)
  }
}

export class CancellationRequestPertinentInformation1 {
  _attributes: {
    typeCode: string
    inversionInd: string
    negationInd: string
  }

  seperatableInd: core.BooleanValue = new core.BooleanValue(true)

  pertinentLineItemRef: PertinentLineItemRef

  constructor(lineItemRef: string) {
    this._attributes = {
      typeCode: "PERT",
      inversionInd: "false",
      negationInd: "false"
    }
    this.pertinentLineItemRef = new PertinentLineItemRef(lineItemRef)
  }
}

class PertinentLineItemRef {
  _attributes: {
    classCode: string
    moodCode: string
  }
  id: codes.GlobalIdentifier
  constructor(lineItemRef: string) {
    this._attributes = {
      classCode: "SBADM",
      moodCode: "RQO"
    }
    this.id = new codes.GlobalIdentifier(lineItemRef)
  }
}

export class CancellationRequestPertinentInformation {
  _attributes: {
    typeCode: string
    contextConductionInd: string
  }
  seperatableInd: core.BooleanValue = new core.BooleanValue(false)
  pertinentCancellationReason: CancellationReason
  constructor(cancellationCode: string, cancellationDisplay: string) {
    this._attributes = {
      typeCode: "PERT",
      contextConductionInd: "true"
    }
    this.pertinentCancellationReason = new CancellationReason(cancellationCode, cancellationDisplay)
  }
}

export class CancellationReason extends prescription.PrescriptionAnnotation {
  text: core.Text
  value: codes.CancellationCode

  //TODO - check whether the text should actually be free text and not the display
  constructor(cancellationCode: string, cancellationDisplay: string) {
    super(new codes.PrescriptionAnnotationCode("CR"))
    this.text = new core.Text(cancellationDisplay)
    this.value = new codes.CancellationCode(cancellationCode)
  }
}

export class CancellationRequestPertinentInformation3 {
  _attributes: {
    typeCode: string
    contextConductionInd: string
  }
  seperatableInd: core.BooleanValue = new core.BooleanValue(true)
  pertinentOriginalPrescriptionRef: PertinentOriginalPrescriptionRef
  constructor(lineItemRef: string) {
    this._attributes = {
      typeCode: "PERT",
      contextConductionInd: "false"
    }
    this.pertinentOriginalPrescriptionRef = new PertinentOriginalPrescriptionRef(lineItemRef)
  }
}

class PertinentOriginalPrescriptionRef {
  _attributes: {
    classCode: string
    moodCode: string
  }
  id: codes.GlobalIdentifier
  constructor(lineItemRef: string) {
    this._attributes = {
      classCode: "SBADM",
      moodCode: "RQO"
    }
    this.id = new codes.GlobalIdentifier(lineItemRef)
  }
}
