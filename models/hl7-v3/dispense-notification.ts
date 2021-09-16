import {ElementCompact} from "xml-js"
import * as codes from "./codes"
import * as core from "./core"
import * as prescription from "./prescription"
import {
  DispenseCommonPertinentInformation1,
  DispenseNotificationSuppliedLineItem,
  DispenseCommonPertinentInformation2,
  DispenseCommonPrimaryInformationRecipient,
  ReplacementOf,
  SequelTo,
  SupplyHeader
} from "./dispense-common"
import * as patient from "./patient"

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
  primaryInformationRecipient: DispenseCommonPrimaryInformationRecipient
  pertinentInformation1: DispenseCommonPertinentInformation1<DispenseNotificationSupplyHeader>
  pertinentInformation2: DispenseCommonPertinentInformation2
  replacementOf?: ReplacementOf
  sequelTo: SequelTo

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

export class DispenseNotificationSupplyHeader extends SupplyHeader<DispenseNotificationSuppliedLineItem> {
  author: prescription.PrescriptionAuthor

  constructor(id: codes.GlobalIdentifier, author: prescription.PrescriptionAuthor) {
    super(id)
    this.author = author
  }
}
