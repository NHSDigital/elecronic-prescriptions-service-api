//TODO - move everything in this file to the models section of the repo

interface Prescription {
  lastEventDate: string
  prescriptionIssueDate: string
  patientNhsNumber: string
  epsVersion: string
  repeatInstance: {
    currentIssue: string
    totalAuthorised: string
  }
  pendingCancellations: string
  prescriptionTreatmentType: string
  prescriptionStatus: string
}

export interface SummaryPrescription extends Prescription {
  lineItems: { [lineItemId: string]: string }
}

export interface DetailPrescription extends Prescription {
  prescriptionDownloadDate: string
  prescriptionDispensedDate: string
  prescriptionClaimedDate: string
  prescriptionLastIssueDispensedDate: string
  prescriber: Organization
  nominatedPharmacy: Organization
  dispensingPharmacy: Organization
  lineItems: { [lineItemId: string]: LineItemDetail }
}

interface Organization {
  name: string
  address: string
  phone: string
  ods: string
}

export interface LineItemDetail {
  description: string
  quantity: string
  uom: string
  dosage: string
  itemStatus: string
  code: string
}

export interface Prescriptions<T extends Prescription> {
  [prescriptionShortFormId: string]: T
}

export interface SummaryTrackerResponse {
  version: string
  reason: string
  statusCode: string
  prescriptions: Prescriptions<SummaryPrescription>
}

export type DetailTrackerResponse = {
  version: string
  reason: string
  statusCode: string
} & Prescriptions<DetailPrescription>
