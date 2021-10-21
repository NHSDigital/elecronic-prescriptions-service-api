import Hapi from "@hapi/hapi"
import {getSigningClient} from "../../services/communication/signing-client"
import {getSessionValue, getSessionValueOrDefault, setSessionValue} from "../../services/session"
import {getEpsClient} from "../../services/communication/eps-client"
import {Parameters} from "fhir/r4"
import {getPayload} from "../util"

export default [
  {
    method: "POST",
    path: "/prescribe/send",
    handler: async (request: Hapi.Request, responseToolkit: Hapi.ResponseToolkit): Promise<Hapi.ResponseObject> => {
      const accessToken = getSessionValueOrDefault("access_token", request, "")
      const authMethod = getSessionValueOrDefault("auth_method", request, "cis2")
      const parsedRequest = getPayload(request) as {signatureToken: string}
      const signingClient = getSigningClient(request, accessToken, authMethod)
      const signatureResponse = await signingClient.makeSignatureDownloadRequest(parsedRequest.signatureToken)
      const prescriptionIds = getSessionValue("prescription_ids", request)
      const prepareResponses: {prescriptionId: string, response: Parameters}[] = prescriptionIds.map((id: string) => {
        return {
          prescriptionId: id,
          response: getSessionValue(`prepare_response_${id}`, request)
        }
      })
      for (const [index, prepareResponse] of prepareResponses.entries()) {
        const payload = prepareResponse.response.parameter?.find(p => p.name === "digest")?.valueString ?? ""
        const signature = signatureResponse.signatures[index].signature
        const certificate = signatureResponse.certificate
        const payloadDecoded = Buffer.from(payload, "base64")
          .toString("utf-8")
          .replace('<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">', "<SignedInfo>")
        const xmlDsig =
          `<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">${payloadDecoded}'
            f"<SignatureValue>${signature}</SignatureValue>"
            f"<KeyInfo><X509Data><X509Certificate>${certificate}</X509Certificate></X509Data></KeyInfo>"
            f"</Signature>`
        const xmlDsigEncoded = Buffer.from(xmlDsig, "utf-8").toString("base64")
        const provenance = createProvenance(prepareResponse.response.parameter?.find(p => p.name === "timestamp")?.valueString ?? "", xmlDsigEncoded)
        const prepareRequest = getSessionValue(`prepare_request_${prepareResponse.prescriptionId}`, request)
        prepareRequest.entry.push(provenance)
        const sendRequest = prepareRequest
        setSessionValue(`prescription_order_send_request_${prepareResponse.prescriptionId}`, sendRequest, request)
      }
      const epsClient = getEpsClient(accessToken)
      if (prescriptionIds.length === 1) {
        const sendRequest = getSessionValue(`prescription_order_send_request_${prescriptionIds[0]}`, request)
        const sendResponse = await epsClient.makeSendRequest(sendRequest)
        const sendRequestHl7 = await epsClient.makeConvertRequest(sendRequest)
        return responseToolkit.response({
          prescription_ids: prescriptionIds,
          prescription_id: prescriptionIds[0],
          success: true,
          request_xml: sendRequestHl7,
          request: sendRequest,
          response: sendResponse.fhirResponse,
          response_xml: sendResponse.spineResponse
        }).code(200)
      }

      const results = []
      for (const id of prescriptionIds) {
        const sendRequest = getSessionValue(`prescription_order_send_request_${id}`, request)
        const sendResponseStatus = await (await epsClient.makeSendRequest(sendRequest)).statusCode
        results.push({
          prescription_id: id,
          success: sendResponseStatus === 200
        })
      }

      return responseToolkit.response({
        prescription_ids: prescriptionIds,
        success_list: results
      }).code(200)
    }
  }
]

function createProvenance(timestamp: string, signature: string) {
  return {
    "fullUrl": "urn:uuid:28828c55-8fa7-42d7-916f-fcf076e0c10e",
    "resource": {
      "resourceType": "Provenance",
      "id": "28828c55-8fa7-42d7-916f-fcf076e0c10e",
      "target": [
        {
          "reference": "urn:uuid:a54219b8-f741-4c47-b662-e4f8dfa49ab6"
        }
      ],
      "recorded": "2021-02-11T16:35:38+00:00",
      "agent": [
        {
          "who": {
            "reference": "urn:uuid:56166769-c1c4-4d07-afa8-132b5dfca666"
          }
        }
      ],
      "signature": [
        {
          "type": [
            {
              "system": "urn:iso-astm:E1762-95:2013",
              "code": "1.2.840.10065.1.12.1.1"
            }
          ],
          "when": timestamp,
          "who": {
            "reference": "urn:uuid:56166769-c1c4-4d07-afa8-132b5dfca666"
          },
          "data": signature
        }
      ]
    }
  }
}
