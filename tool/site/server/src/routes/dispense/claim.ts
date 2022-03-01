import Hapi from "@hapi/hapi"
import {appendToSessionValue, getSessionValue, removeFromSessionValue, setSessionValue} from "../../services/session"
import {Claim} from "fhir/r4"
import {getEpsClient} from "../../services/communication/eps-client"

export default [
  {
    method: "POST",
    path: "/dispense/claim",
    handler: async (request: Hapi.Request, responseToolkit: Hapi.ResponseToolkit): Promise<Hapi.ResponseObject> => {
      const payload = request.payload as {prescriptionId: string, claim: Claim}
      const prescriptionId = payload.prescriptionId
      const claimRequest = payload.claim
      const accessToken = getSessionValue("access_token", request)
      const epsClient = getEpsClient(accessToken, request)
      const claimResponse = await epsClient.makeClaimRequest(claimRequest)
      const claimResponseHl7 = await epsClient.makeConvertRequest(claimRequest)
      const success = claimResponse.statusCode === 200

      if (success) {
        setSessionValue(`claim_request_${prescriptionId}`, claimRequest, request)
        removeFromSessionValue("dispensed_prescription_ids", prescriptionId, request)
        appendToSessionValue("claimed_prescription_ids", prescriptionId, request)
      }

      return responseToolkit.response({
        success: success,
        request_xml: claimResponseHl7,
        request: claimRequest,
        response: claimResponse.fhirResponse,
        response_xml: claimResponse.spineResponse
      }).code(200)
    }
  }
]
