import {
  spine,
  fhir,
  hl7V3,
  spineResponses
} from "@models"
import {SpineClient} from "./spine-client"
import {StatusCheckResponse} from "../../utils/status"
import {isTrackerRequest} from "../../../../models/spine"

export class SandboxSpineClient implements SpineClient {
  async send(clientRequest: spine.ClientRequest): Promise<spine.SpineResponse<unknown>> {
    if(isTrackerRequest(clientRequest)) {
      return await this.handleTrackerRequest()
    } else {
      return await this.handleSpineRequest(clientRequest)
    }
  }

  async poll(): Promise<spine.SpineResponse<fhir.OperationOutcome>> {
    return Promise.resolve({
      statusCode: 400,
      body: notSupportedOperationOutcome
    })
  }

  async getStatus(): Promise<StatusCheckResponse> {
    return {
      status: "pass",
      timeout: "false",
      responseCode: 200
    }
  }

  async handleTrackerRequest(): Promise<spine.SpineResponse<unknown>> {
    return Promise.resolve({body: "Not Supported", statusCode: 400})
  }

  async handleSpineRequest(spineRequest: spine.SpineRequest): Promise<spine.SpineResponse<unknown>> {
    switch (spineRequest.interactionId) {
      case hl7V3.Hl7InteractionIdentifier.PARENT_PRESCRIPTION_URGENT._attributes.extension:
        return Promise.resolve({
          statusCode: 200,
          body: spineResponses.APPLICATION_ACKNOWLEDGEMENT
        })
      case hl7V3.Hl7InteractionIdentifier.CANCEL_REQUEST._attributes.extension:
        return Promise.resolve({
          statusCode: 200,
          body: spineResponses.CANCEL
        })
      case hl7V3.Hl7InteractionIdentifier.NOMINATED_PRESCRIPTION_RELEASE_REQUEST._attributes.extension:
        return Promise.resolve({
          statusCode: 200,
          body: spineResponses.NOMINATED_PRESCRIPTION_RELEASE
        })
      case hl7V3.Hl7InteractionIdentifier.PATIENT_PRESCRIPTION_RELEASE_REQUEST._attributes.extension:
        return Promise.resolve({
          statusCode: 200,
          body: spineResponses.NOMINATED_PRESCRIPTION_RELEASE
        })
      case hl7V3.Hl7InteractionIdentifier.DISPENSE_NOTIFICATION._attributes.extension:
        return Promise.resolve({
          statusCode: 200,
          body: spineResponses.APPLICATION_ACKNOWLEDGEMENT
        })
      case hl7V3.Hl7InteractionIdentifier.DISPENSE_CLAIM_INFORMATION._attributes.extension:
        return Promise.resolve({
          statusCode: 200,
          body: spineResponses.APPLICATION_ACKNOWLEDGEMENT
        })
      case hl7V3.Hl7InteractionIdentifier.DISPENSER_WITHDRAW._attributes.extension:
        return Promise.resolve({
          statusCode: 200,
          body: spineResponses.DISPENSER_WITHDRAW
        })
      case hl7V3.Hl7InteractionIdentifier.DISPENSE_PROPOSAL_RETURN._attributes.extension:
        return Promise.resolve({
          statusCode: 200,
          body: spineResponses.DISPENSE_PROPOSAL_RETURN
        })
      default:
        return Promise.resolve({
          statusCode: 400,
          body: notSupportedOperationOutcome
        })
    }
  }
}

const notSupportedOperationOutcome: fhir.OperationOutcome = {
  resourceType: "OperationOutcome",
  issue: [
    {
      code: fhir.IssueCodes.INFORMATIONAL,
      severity: "information",
      details: {
        coding: [
          {
            code: "INTERACTION_NOT_SUPPORTED_BY_SANDBOX",
            display: "Interaction not supported by sandbox",
            system: "https://fhir.nhs.uk/R4/CodeSystem/Spine-ErrorOrWarningCode",
            version: "1"
          }
        ]
      }
    }
  ]
}
