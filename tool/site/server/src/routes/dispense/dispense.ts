import Hapi from "@hapi/hapi"
import {getSessionValue, getSessionValueOrDefault, setSessionValue, appendToSessionValue, removeFromSessionValue} from "../../services/session"
import * as fhir from "fhir/r4"
import {getEpsClient} from "../../services/communication/eps-client"

export interface MedicationDispense extends fhir.MedicationDispense {
  contained: Array<MedicationRequest>
}

export interface MedicationRequest extends fhir.MedicationRequest{
  identifier: Array<fhir.Identifier>
  groupIdentifier: fhir.Identifier
}

export default [
  {
    method: "POST",
    path: "/dispense/dispense",
    handler: async (request: Hapi.Request, responseToolkit: Hapi.ResponseToolkit): Promise<Hapi.ResponseObject> => {
      const dispenseNotificationRequest = request.payload as fhir.Bundle

      const accessToken = getSessionValue("access_token", request)
      const epsClient = getEpsClient(accessToken, request)
      const dispenseNotificationResponse = await epsClient.makeSendRequest(dispenseNotificationRequest)
      const dispenseNotificationRequestHl7 = await epsClient.makeConvertRequest(dispenseNotificationRequest)
      const success = dispenseNotificationResponse.statusCode === 200
      if (success) {
        const medicationDispense = dispenseNotificationRequest?.entry
          ?.flatMap(entry => entry?.resource)
          ?.find(resource => resource?.resourceType === "MedicationDispense") as MedicationDispense

        const messageHeader = dispenseNotificationRequest?.entry
          ?.flatMap(entry => entry?.resource)
          ?.find(resource => resource?.resourceType === "MessageHeader") as fhir.MessageHeader
        const replacementOfId = messageHeader.extension
          ?.find(entry => entry.url === "https://fhir.nhs.uk/StructureDefinition/Extension-replacementOf")
          ?.valueIdentifier
          ?.value

        const containedMedicationRequest = medicationDispense.contained[0]
        const prescriptionId = containedMedicationRequest.groupIdentifier.value

        const key = `dispense_notification_requests_${prescriptionId}`
        const dispenseNotificationRequests = getSessionValueOrDefault(key, request, []) as Array<fhir.Bundle>

        if (replacementOfId) {
          const replacementIndex = dispenseNotificationRequests
            .findIndex(request => request.identifier?.value === replacementOfId)
          dispenseNotificationRequests[replacementIndex] = dispenseNotificationRequest
        } else {
          dispenseNotificationRequests.push(dispenseNotificationRequest)
        }

        setSessionValue(key, dispenseNotificationRequests, request)

        const isFirstDispenseForPrescription = dispenseNotificationRequests.length === 1
        if (isFirstDispenseForPrescription) {
          removeFromSessionValue("released_prescription_ids", prescriptionId, request)
          appendToSessionValue("dispensed_prescription_ids", [prescriptionId], request)
        }
      }

      return responseToolkit.response({
        success: success,
        request_xml: dispenseNotificationRequestHl7,
        request: dispenseNotificationRequest,
        response: dispenseNotificationResponse.fhirResponse,
        response_xml: dispenseNotificationResponse.spineResponse
      }).code(200)
    }
  },
  {
    method: "GET",
    path: "/dispenseNotifications/{prescriptionId}",
    handler: async (request: Hapi.Request, h: Hapi.ResponseToolkit): Promise<Hapi.ResponseObject> => {
      const prescriptionId = request.params.prescriptionId
      if (!prescriptionId) {
        return h.response("Prescription id required in path").code(400)
      }
      const key = `dispense_notification_requests_${prescriptionId}`
      const dispenseNotificationRequests = getSessionValueOrDefault(key, request, [])
      return h.response(dispenseNotificationRequests).code(200)
    }
  }
]
