import React, {useContext, useState} from "react"
import {CrossIcon, Label, TickIcon} from "nhsuk-react-components"
import {
  getMedicationDispenseResources,
  getMedicationRequestResources,
  getMessageHeaderResources,
  getPatientResources
} from "../fhir/bundleResourceFinder"
import * as fhir from "fhir/r4"
import DispenseForm, {
  DispenseFormValues,
  StaticLineItemInfo,
  StaticPrescriptionInfo
} from "../components/dispense/dispenseForm"
import {createDispenseNotification} from "../components/dispense/createDispenseNotification"
import {getTaskBusinessStatusExtension} from "../fhir/customExtensions"
import MessageExpanders from "../components/messageExpanders"
import ButtonList from "../components/buttonList"
import {LineItemStatus, PrescriptionStatus} from "../fhir/reference-data/valueSets"
import {
  getMedicationDispenseLineItemId,
  getMedicationRequestLineItemId,
  MedicationDispense,
  MedicationRequest
} from "../fhir/helpers"
import LongRunningTask from "../components/longRunningTask"
import {AppContext} from "../index"
import PrescriptionActions from "../components/prescriptionActions"
import {getResponseDataIfValid} from "../requests/getValidResponse"
import {getArrayTypeGuard, isBundle} from "../fhir/typeGuards"
import {axiosInstance} from "../requests/axiosInstance"
import {ApiResult, isApiResult} from "../requests/apiResult"
import ReloadButton from "../components/reloadButton"

interface DispensePageProps {
  prescriptionId: string
}

const DispensePage: React.FC<DispensePageProps> = ({
  prescriptionId
}) => {
  const {baseUrl} = useContext(AppContext)
  const [dispenseFormValues, setDispenseFormValues] = useState<DispenseFormValues>()

  const retrievePrescriptionTask = () => retrievePrescriptionDetails(baseUrl, prescriptionId)
  return (
    <LongRunningTask<PrescriptionDetails> task={retrievePrescriptionTask} loadingMessage="Retrieving prescription details.">
      {prescriptionDetails => {
        if (!dispenseFormValues) {
          const lineItems = createStaticLineItemInfoArray(
            prescriptionDetails.medicationRequests,
            prescriptionDetails.medicationDispenses
          )
          const prescription = createStaticPrescriptionInfo(prescriptionDetails.medicationDispenses)
          return (
            <>
              <Label isPageHeading>Dispense Prescription</Label>
              <DispenseForm lineItems={lineItems} prescription={prescription} onSubmit={setDispenseFormValues}/>
            </>
          )
        }

        const sendDispenseNotificationTask = () => sendDispenseNotification(baseUrl, prescriptionDetails, dispenseFormValues)
        return (
          <LongRunningTask<ApiResult> task={sendDispenseNotificationTask} loadingMessage="Sending dispense notification.">
            {dispenseResult => (
              <>
                <Label isPageHeading>Dispense Result {dispenseResult.success ? <TickIcon/> : <CrossIcon/>}</Label>
                <PrescriptionActions prescriptionId={prescriptionId} claim withdraw view/>
                <MessageExpanders
                  fhirRequest={dispenseResult.request}
                  hl7V3Request={dispenseResult.request_xml}
                  fhirResponse={dispenseResult.response}
                  hl7V3Response={dispenseResult.response_xml}
                />
                <ButtonList>
                  <ReloadButton/>
                </ButtonList>
              </>
            )}
          </LongRunningTask>
        )
      }}
    </LongRunningTask>
  )
}

async function retrievePrescriptionDetails(baseUrl: string, prescriptionId: string): Promise<PrescriptionDetails> {
  const prescriptionOrderResponse = await axiosInstance.get<fhir.Bundle>(`${baseUrl}dispense/release/${prescriptionId}`)
  const prescriptionOrder = getResponseDataIfValid(prescriptionOrderResponse, isBundle)

  const dispenseNotificationsResponse = await axiosInstance.get<Array<fhir.Bundle>>(`${baseUrl}dispenseNotifications/${prescriptionId}`)
  const dispenseNotifications = getResponseDataIfValid(dispenseNotificationsResponse, getArrayTypeGuard(isBundle))

  return {
    messageHeader: getMessageHeaderResources(prescriptionOrder)[0],
    patient: getPatientResources(prescriptionOrder)[0],
    medicationRequests: getMedicationRequestResources(prescriptionOrder),
    medicationDispenses: dispenseNotifications.flatMap(getMedicationDispenseResources)
  }
}

async function sendDispenseNotification(
  baseUrl: string,
  prescriptionDetails: PrescriptionDetails,
  dispenseFormValues: DispenseFormValues
): Promise<ApiResult> {
  const dispenseNotification = createDispenseNotification(
    prescriptionDetails.messageHeader,
    prescriptionDetails.patient,
    prescriptionDetails.medicationRequests,
    dispenseFormValues
  )
  const response = await axiosInstance.post<ApiResult>(`${baseUrl}dispense/dispense`, dispenseNotification)
  return getResponseDataIfValid(response, isApiResult)
}

interface PrescriptionDetails {
  messageHeader: fhir.MessageHeader
  patient: fhir.Patient
  medicationRequests: Array<MedicationRequest>
  medicationDispenses: Array<MedicationDispense>
}

export function createStaticLineItemInfoArray(
  medicationRequests: Array<fhir.MedicationRequest>,
  medicationDispenses: Array<MedicationDispense>
): Array<StaticLineItemInfo> {
  return medicationRequests.map(medicationRequest => {
    const lineItemId = getMedicationRequestLineItemId(medicationRequest)
    const medicationDispensesForItem = medicationDispenses.filter(medicationDispense =>
      getMedicationDispenseLineItemId(medicationDispense) === lineItemId
    )
    return createStaticLineItemInfo(medicationRequest, medicationDispensesForItem)
  })
}

function getTotalDispensed(medicationDispenses: Array<fhir.MedicationDispense>) {
  return medicationDispenses
    .map(medicationDispense => medicationDispense.quantity.value)
    .reduce((previousQuantity, currentQuantity) => previousQuantity + currentQuantity)
}

export function createStaticLineItemInfo(
  medicationRequest: fhir.MedicationRequest,
  medicationDispenses: Array<fhir.MedicationDispense>
): StaticLineItemInfo {
  //TODO - use release response not process-message request
  const lineItemInfo: StaticLineItemInfo = {
    id: getMedicationRequestLineItemId(medicationRequest),
    name: medicationRequest.medicationCodeableConcept.coding[0].display,
    prescribedQuantityUnit: medicationRequest.dispenseRequest.quantity.unit,
    prescribedQuantityValue: medicationRequest.dispenseRequest.quantity.value,
    priorStatusCode: LineItemStatus.TO_BE_DISPENSED
  }

  if (medicationDispenses.length > 0) {
    lineItemInfo.dispensedQuantityValue = getTotalDispensed(medicationDispenses)

    const latestMedicationDispense = medicationDispenses.pop()
    lineItemInfo.priorNonDispensingReasonCode = latestMedicationDispense.statusReasonCodeableConcept?.coding?.[0]?.code
    lineItemInfo.priorStatusCode = getLineItemStatus(latestMedicationDispense)
  }

  lineItemInfo.alternativeMedicationAvailable = containsParacetamol(medicationRequest)

  return lineItemInfo
}

export function createStaticPrescriptionInfo(medicationDispenses: Array<fhir.MedicationDispense>): StaticPrescriptionInfo {
  //TODO - use release response
  return {
    dispenseDate: new Date(),
    priorStatusCode: medicationDispenses.length
      ? getPrescriptionStatus(medicationDispenses[medicationDispenses.length - 1])
      : PrescriptionStatus.TO_BE_DISPENSED
  }
}

function getLineItemStatus(medicationDispense: fhir.MedicationDispense): LineItemStatus {
  return medicationDispense.type.coding[0].code as LineItemStatus
}

function getPrescriptionStatus(medicationDispense: fhir.MedicationDispense): PrescriptionStatus {
  return getTaskBusinessStatusExtension(medicationDispense.extension).valueCoding.code as PrescriptionStatus
}

function containsParacetamol(medicationRequest: fhir.MedicationRequest): boolean {
  return medicationRequest.medicationCodeableConcept.coding[0].code === "39720311000001101"
}

export default DispensePage
