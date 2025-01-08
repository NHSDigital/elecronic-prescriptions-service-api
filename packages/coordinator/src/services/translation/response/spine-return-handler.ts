import Hapi from "@hapi/hapi"
import pino from "pino"
import {DispenseProposalReturnRoot} from "../../../../../models/hl7-v3"
import {ReturnPayloadFactory} from "../request/return/payload/return-payload-factory"
import * as requestBuilder from "../../communication/ebxml-request-builder"
import {SpineClient, spineClient} from "../../../services/communication/spine-client"
import {getAsid} from "../../../utils/headers"

export interface SpineReturnHandler {
   handle(
    logger: pino.Logger,
    dispenseProposalReturns : Array<DispenseProposalReturnRoot>)
    : void
}

export class DispensePropsalReturnHandler implements SpineReturnHandler {

  private readonly requestHeaders : Hapi.Utils.Dictionary<string>
  private readonly payloadFactory: ReturnPayloadFactory
  private readonly spineClient: SpineClient

  constructor(
    headers: Hapi.Utils.Dictionary<string>,
    returnPayloadFactory: ReturnPayloadFactory,
    spineClient : SpineClient) {
    this.requestHeaders = headers
    this.payloadFactory = returnPayloadFactory
    this.spineClient = spineClient
  }
  handle(logger: pino.Logger,
    dispenseProposalReturnRoots: Array<DispenseProposalReturnRoot>) : void {
    Promise.all(
      dispenseProposalReturnRoots.map(async proposal => {
        const payload = this.payloadFactory.createPayload(proposal, this.requestHeaders)
        const request = requestBuilder.toSpineRequest(payload, this.requestHeaders, payload.id._attributes.root)
        const response = await spineClient.send(request, getAsid(this.requestHeaders), logger)
        if(this.isFailedRequest(response.statusCode)) {
          const prescriptionId = proposal.DispenseProposalReturn.id._attributes.root
          logger.error(
            `Prescription return failed for prescription ID: ${prescriptionId}. Status code: ${response.statusCode}`)
        }
      })
    ).catch(rejectedPromise => {
      logger.error(`${rejectedPromise}, Prescription return failed to complete`)
    })
  }

  private isFailedRequest(statusCode: number): boolean {
    const successStatusCodes = [200, 201, 202]
    return !successStatusCodes.includes(statusCode)
  }

}
