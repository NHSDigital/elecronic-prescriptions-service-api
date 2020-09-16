import * as fhir from "../../model/fhir-resources"
import {convertPatient} from "./patient"
import * as prescriptions from "../../model/hl7-v3-prescriptions"
import * as cancellations from "../../model/hl7-v3-cancellation"
import * as codes from "../../model/hl7-v3-datatypes-codes"
import {getPatient, getMedicationRequests} from "./common/getResourcesOfType"
import {convertAuthor, convertResponsibleParty} from "./practitioner"
import * as common from "./common"

export function convertCancellation(
  fhirBundle: fhir.Bundle,
  convertPatientFn = convertPatient,
): cancellations.CancellationPrescription {

  const hl7V3CancellationPrescription = new cancellations.CancellationPrescription(
    new codes.GlobalIdentifier(fhirBundle.id)
  )

  const fhirPatient = getPatient(fhirBundle)
  const hl7V3Patient = convertPatientFn(fhirBundle, fhirPatient)
  hl7V3CancellationPrescription.recordTarget = new prescriptions.RecordTarget(hl7V3Patient)

  const fhirFirstMedicationRequest = getMedicationRequests(fhirBundle)[0]
  hl7V3CancellationPrescription.author = convertAuthor(fhirBundle, fhirFirstMedicationRequest, true)
  hl7V3CancellationPrescription.responsibleParty = convertResponsibleParty(fhirBundle, fhirFirstMedicationRequest, true)

  hl7V3CancellationPrescription.pertinentInformation2 = new cancellations.PertinentInformation2(fhirFirstMedicationRequest.groupIdentifier.value)
  hl7V3CancellationPrescription.pertinentInformation1 = new cancellations.PertinentInformation1(fhirFirstMedicationRequest.id)
  const statusReason = common.getCodingForSystem(
    fhirFirstMedicationRequest.statusReason[0].coding,
    "https://fhir.nhs.uk/R4/CodeSystem/medicationrequest-status-reason",
    "MedicationRequest.statusReason")
  hl7V3CancellationPrescription.pertinentInformation = new cancellations.PertinentInformation(statusReason.code, statusReason.display)
  hl7V3CancellationPrescription.pertinentInformation3 = new cancellations.PertinentInformation3(fhirFirstMedicationRequest.id)

  return hl7V3CancellationPrescription
}
