import * as fhir from "../../../../models/fhir"
import * as hl7V3 from "../../../../models/hl7-v3"
import {getCodeableConceptCodingForSystem} from "../../common"
import {convertIsoDateTimeStringToHl7V3DateTime} from "../../common/dateTime"
import * as pino from "pino"
import {
  createAuthorFromTaskOwnerIdentifier,
  createIdFromTaskIdentifier,
  getMessageIdFromTaskFocusIdentifier,
  getPrescriptionShortFormIdFromTaskGroupIdentifier
} from "../task"

export async function convertTaskToDispenseProposalReturn(
  task: fhir.Task,
  logger: pino.Logger
): Promise<hl7V3.DispenseProposalReturn> {
  const id = createIdFromTaskIdentifier(task.identifier)
  const effectiveTime = convertIsoDateTimeStringToHl7V3DateTime(task.authoredOn, "Task.authoredOn")
  const dispenseProposalReturn = new hl7V3.DispenseProposalReturn(id, effectiveTime)

  dispenseProposalReturn.author = await createAuthorFromTaskOwnerIdentifier(task.owner.identifier, logger)
  dispenseProposalReturn.pertinentInformation1 = createPertinentInformation1(task.groupIdentifier)
  dispenseProposalReturn.pertinentInformation3 = createPertinentInformation3(task.reasonCode)
  dispenseProposalReturn.reversalOf = createReversalOf(task.focus.identifier)

  return dispenseProposalReturn
}

function createPertinentInformation1(groupIdentifier: fhir.Identifier) {
  const prescriptionIdValue = getPrescriptionShortFormIdFromTaskGroupIdentifier(groupIdentifier)
  const prescriptionId = new hl7V3.PrescriptionId(prescriptionIdValue)
  return new hl7V3.DispenseProposalReturnPertinentInformation1(prescriptionId)
}

function createPertinentInformation3(reasonCode: fhir.CodeableConcept) {
  const reasonCoding = getCodeableConceptCodingForSystem(
    [reasonCode],
    "https://fhir.nhs.uk/CodeSystem/EPS-task-dispense-return-status-reason",
    "Task.reasonCode"
  )
  const returnReasonCode = new hl7V3.ReturnReasonCode(reasonCoding.code, reasonCoding.display)
  const returnReason = new hl7V3.ReturnReason(returnReasonCode)
  return new hl7V3.DispenseProposalReturnPertinentInformation3(returnReason)
}

function createReversalOf(identifier: fhir.Identifier) {
  const prescriptionReleaseResponseId = getMessageIdFromTaskFocusIdentifier(identifier)
  const prescriptionReleaseResponseRef = new hl7V3.PrescriptionReleaseResponseRef(prescriptionReleaseResponseId)
  return new hl7V3.DispenseProposalReturnReversalOf(prescriptionReleaseResponseRef)
}
