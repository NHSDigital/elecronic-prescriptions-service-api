import {hl7V3, spine} from "@models"
import pino from "pino"
import {readXml} from "../../serialisation/xml"
import {SpineClient, spineClient} from "../spine-client"
import {PrescriptionRequestBuilder, makeTrackerSoapMessageRequest} from "./spine-request-builder"
import {
  createTrackerError,
  createTrackerResponse,
  TrackerError,
  TrackerErrorString
} from "./tracker-response-builder"
import {extractPrescriptionDocumentKey} from "./spine-response-parser"
import {isSandbox} from "../../../utils/feature-flags"

interface TrackerResponse {
    statusCode: number
    prescription?: hl7V3.ParentPrescription
    error?: TrackerError
}

export interface TrackerClient {
  track(
    request_id: string,
    prescription_id: string,
    repeat_number: string,
    fromAsid: string,
    logger: pino.Logger
  ): Promise<TrackerResponse>
}

/**
 * LiveTrackerClient handles the retrieval of prescriptions from Spine.
 *
 * The process is roughly the following:
 * 1. The prescription metadata is fetched from Spine
 * 2. The prescription document key is extracted from the metadata
 * 3. The prescription document is fetched from Spine using the document key
 *
 * @implements {TrackerClient}
 */
class LiveTrackerClient implements TrackerClient {
  private readonly spineClient: SpineClient

  constructor() {
    this.spineClient = spineClient
  }

  async track(
    request_id: string,
    prescription_id: string,
    repeat_number: string,
    fromAsid: string,
    logger: pino.Logger
  ): Promise<TrackerResponse> {
    const requestBuilder = new PrescriptionRequestBuilder(request_id, prescription_id)
    const moduleLogger = logger.child({module: "TrackerClient", ...requestBuilder})

    try {
      // Prescription Metadata - QURX_IN000005UK99
      const metadataRequest = requestBuilder.makePrescriptionMetadataRequest(repeat_number)
      const metadataResponse = await this.getPrescriptionMetadata(metadataRequest, fromAsid, moduleLogger)

      // Prescription Document - GET_PRESCRIPTION_DOCUMENT_INUK01
      const prescriptionDocumentKey = extractPrescriptionDocumentKey(metadataResponse.body)
      const documentRequest = requestBuilder.makePrescriptionDocumentRequest(prescriptionDocumentKey)
      const documentResponse = await this.getPrescriptionDocument(documentRequest, fromAsid, moduleLogger)

      // Extract prescription
      return createTrackerResponse(documentResponse, moduleLogger)
    } catch (error) {
      return {
        statusCode: error.statusCode ?? 500,
        error: createTrackerError(
          TrackerErrorString.FAILED_TRACKER_REQUEST,
          error
        )
      }
    }
  }

  // eslint-disable-next-line max-len
  private async getPrescriptionMetadata(request: spine.PrescriptionMetadataRequest, fromAsid: string, logger: pino.Logger): Promise<spine.SpineDirectResponse<string>> {
    logger.info(`Tracker - Sending prescription metadata request: ${JSON.stringify(request)}`)

    const trackerRequest: spine.TrackerRequest = {
      name: "prescription metadata",
      body: makeTrackerSoapMessageRequest(request),
      headers: {
        "SOAPAction": "urn:nhs:names:services:mmquery/QURX_IN000005UK99"
      }
    }

    return await this.spineClient.send(
      trackerRequest,
      fromAsid,
      logger) as spine.SpineDirectResponse<string>
  }

  // eslint-disable-next-line max-len
  private async getPrescriptionDocument(request: spine.PrescriptionDocumentRequest, fromAsid: string, logger: pino.Logger): Promise<spine.SpineDirectResponse<string>> {
    logger.info(`Tracker - Sending prescription document request: ${JSON.stringify(request)}`)

    const trackerRequest: spine.TrackerRequest = {
      name: "prescription document",
      body: makeTrackerSoapMessageRequest(request),
      headers: {
        "SOAPAction": `urn:nhs:names:services:mmquery/GET_PRESCRIPTION_DOCUMENT_INUK01`
      }
    }

    return await this.spineClient.send(
      trackerRequest,
      fromAsid,
      logger) as spine.SpineDirectResponse<string>
  }
}

class SandboxTrackerClient implements TrackerClient {
  track(): Promise<TrackerResponse> {
    return Promise.resolve({
      statusCode: 200,
      // eslint-disable-next-line max-len
      prescription: readXml("<ParentPrescription classCode=\"INFO\" moodCode=\"EVN\"><id root=\"E14AF4FF-EC28-40E4-93D4-41A9120BA524\"/><code code=\"163501000000109\" codeSystem=\"2.16.840.1.113883.2.1.3.2.4.15\" displayName=\"Prescription - FocusActOrEvent (record artifact)\"/><effectiveTime value=\"20220802000000\"/><typeId extension=\"PORX_MT132004UK31\" root=\"2.16.840.1.113883.2.1.3.2.4.18.7\"/><recordTarget typeCode=\"RCT\"><Patient classCode=\"PAT\"><id extension=\"9449304130\" root=\"2.16.840.1.113883.2.1.4.1\"/><addr use=\"H\"><streetAddressLine>10 HEATHFIELD</streetAddressLine><streetAddressLine>COBHAM</streetAddressLine><streetAddressLine>SURREY</streetAddressLine><postalCode>KT11 2QY</postalCode></addr><patientPerson classCode=\"PSN\" determinerCode=\"INSTANCE\"><name use=\"L\"><prefix>MS</prefix><given>STACEY</given><given>MARISA</given><family>TWITCHETT</family></name><administrativeGenderCode code=\"2\" codeSystem=\"2.16.840.1.113883.2.1.3.2.4.16.25\"/><birthTime value=\"19480430\"/><playedProviderPatient classCode=\"PAT\"><subjectOf typeCode=\"SBJ\"><patientCareProvision classCode=\"PCPR\" moodCode=\"EVN\"><code code=\"1\" codeSystem=\"2.16.840.1.113883.2.1.3.2.4.17.37\"/><responsibleParty typeCode=\"RESP\"><healthCareProvider classCode=\"PROV\"><id extension=\"A83008\" root=\"1.2.826.0.1285.0.1.10\"/></healthCareProvider></responsibleParty></patientCareProvision></subjectOf></playedProviderPatient></patientPerson></Patient></recordTarget><pertinentInformation1 contextConductionInd=\"true\" typeCode=\"PERT\"><templateId extension=\"CSAB_RM-NPfITUK10.pertinentInformation\" root=\"2.16.840.1.113883.2.1.3.2.4.18.2\"/><pertinentPrescription classCode=\"SBADM\" moodCode=\"RQO\"><id root=\"24150080-53CA-409E-85C5-8F953F372AA0\"/><id extension=\"58EFB9-A83008-27693K\" root=\"2.16.840.1.113883.2.1.3.2.4.18.8\"/><code code=\"225426007\" codeSystem=\"2.16.840.1.113883.2.1.3.2.4.15\" displayName=\"Administration of therapeutic substance (procedure)\"/><effectiveTime nullFlavor=\"NA\"/><performer contextControlCode=\"OP\" typeCode=\"PRF\"><AgentOrgSDS classCode=\"AGNT\"><agentOrganizationSDS classCode=\"ORG\" determinerCode=\"INSTANCE\"><id extension=\"FCG71\" root=\"1.2.826.0.1285.0.1.10\"/></agentOrganizationSDS></AgentOrgSDS></performer><author contextControlCode=\"OP\" typeCode=\"AUT\"><time value=\"20220802215856\"/><signatureText nullFlavor=\"NA\"/><AgentPerson classCode=\"AGNT\"><id extension=\"200102238987\" root=\"1.2.826.0.1285.0.2.0.67\"/><code code=\"R8000\" codeSystem=\"1.2.826.0.1285.0.2.1.104\"/><telecom use=\"WP\" value=\"tel:01234567890\"/><agentPerson classCode=\"PSN\" determinerCode=\"INSTANCE\"><id extension=\"6095103\" root=\"1.2.826.0.1285.0.2.1.54\"/><name><prefix>DR</prefix><given>C</given><family>BOIN</family></name></agentPerson><representedOrganization classCode=\"ORG\" determinerCode=\"INSTANCE\"><id extension=\"A83008\" root=\"1.2.826.0.1285.0.1.10\"/><code code=\"999\" codeSystem=\"2.16.840.1.113883.2.1.3.2.4.17.94\"/><name>HALLGARTH SURGERY</name><telecom use=\"WP\" value=\"tel:01159737320\"/><addr use=\"WP\"><streetAddressLine>HALLGARTH SURGERY</streetAddressLine><streetAddressLine>CHEAPSIDE</streetAddressLine><streetAddressLine>SHILDON</streetAddressLine><streetAddressLine>COUNTY DURHAM</streetAddressLine><postalCode>DL4 2HP</postalCode></addr><healthCareProviderLicense classCode=\"PROV\"><Organization classCode=\"ORG\" determinerCode=\"INSTANCE\"><id extension=\"84H\" root=\"1.2.826.0.1285.0.1.10\"/><code code=\"999\" codeSystem=\"2.16.840.1.113883.2.1.3.2.4.17.94\"/><name>NHS COUNTY DURHAM CCG</name></Organization></healthCareProviderLicense></representedOrganization></AgentPerson></author><responsibleParty contextControlCode=\"OP\" typeCode=\"RESP\"><AgentPerson classCode=\"AGNT\"><id extension=\"200102238987\" root=\"1.2.826.0.1285.0.2.0.67\"/><code code=\"R8000\" codeSystem=\"1.2.826.0.1285.0.2.1.104\"/><telecom use=\"WP\" value=\"tel:01234567890\"/><agentPerson classCode=\"PSN\" determinerCode=\"INSTANCE\"><id extension=\"977677\" root=\"1.2.826.0.1285.0.2.1.54\"/><name><prefix>DR</prefix><given>C</given><family>BOIN</family></name></agentPerson><representedOrganization classCode=\"ORG\" determinerCode=\"INSTANCE\"><id extension=\"A83008\" root=\"1.2.826.0.1285.0.1.10\"/><code code=\"999\" codeSystem=\"2.16.840.1.113883.2.1.3.2.4.17.94\"/><name>HALLGARTH SURGERY</name><telecom use=\"WP\" value=\"tel:01159737320\"/><addr use=\"WP\"><streetAddressLine>HALLGARTH SURGERY</streetAddressLine><streetAddressLine>CHEAPSIDE</streetAddressLine><streetAddressLine>SHILDON</streetAddressLine><streetAddressLine>COUNTY DURHAM</streetAddressLine><postalCode>DL4 2HP</postalCode></addr><healthCareProviderLicense classCode=\"PROV\"><Organization classCode=\"ORG\" determinerCode=\"INSTANCE\"><id extension=\"84H\" root=\"1.2.826.0.1285.0.1.10\"/><code code=\"999\" codeSystem=\"2.16.840.1.113883.2.1.3.2.4.17.94\"/><name>NHS COUNTY DURHAM CCG</name></Organization></healthCareProviderLicense></representedOrganization></AgentPerson></responsibleParty><pertinentInformation5 contextConductionInd=\"true\" typeCode=\"PERT\"><seperatableInd value=\"false\"/><pertinentPrescriptionTreatmentType classCode=\"OBS\" moodCode=\"EVN\"><code code=\"PTT\" codeSystem=\"2.16.840.1.113883.2.1.3.2.4.17.30\"/><value code=\"0001\" codeSystem=\"2.16.840.1.113883.2.1.3.2.4.16.36\"/></pertinentPrescriptionTreatmentType></pertinentInformation5><pertinentInformation1 contextConductionInd=\"true\" typeCode=\"PERT\"><seperatableInd value=\"true\"/><pertinentDispensingSitePreference classCode=\"OBS\" moodCode=\"EVN\"><code code=\"DSP\" codeSystem=\"2.16.840.1.113883.2.1.3.2.4.17.30\"/><value code=\"P1\" codeSystem=\"2.16.840.1.113883.2.1.3.2.4.17.21\"/></pertinentDispensingSitePreference></pertinentInformation1><pertinentInformation2 contextConductionInd=\"true\" inversionInd=\"false\" negationInd=\"false\" typeCode=\"PERT\"><seperatableInd value=\"true\"/><templateId extension=\"CSAB_RM-NPfITUK10.sourceOf2\" root=\"2.16.840.1.113883.2.1.3.2.4.18.2\"/><pertinentLineItem classCode=\"SBADM\" moodCode=\"RQO\"><id root=\"DD99E4EF-2924-4BA7-9A6A-63F82300F851\"/><code code=\"225426007\" codeSystem=\"2.16.840.1.113883.2.1.3.2.4.15\" displayName=\"Administration of therapeutic substance (procedure)\"/><effectiveTime nullFlavor=\"NA\"/><product contextControlCode=\"OP\" typeCode=\"PRD\"><manufacturedProduct classCode=\"MANU\"><manufacturedRequestedMaterial classCode=\"MMAT\" determinerCode=\"KIND\"><code code=\"39720311000001101\" codeSystem=\"2.16.840.1.113883.2.1.3.2.4.15\" displayName=\"Paracetamol 500mg soluble tablets\"/></manufacturedRequestedMaterial></manufacturedProduct></product><component typeCode=\"COMP\"><seperatableInd value=\"false\"/><lineItemQuantity classCode=\"SPLY\" moodCode=\"RQO\"><code code=\"373784005\" codeSystem=\"2.16.840.1.113883.2.1.3.2.4.15\" displayName=\"Dispensing medication (procedure)\"/><quantity unit=\"1\" value=\"60\"><translation code=\"428673006\" codeSystem=\"2.16.840.1.113883.2.1.3.2.4.15\" displayName=\"tablet\" value=\"60\"/></quantity></lineItemQuantity></component><pertinentInformation2 contextConductionInd=\"true\" typeCode=\"PERT\"><seperatableInd value=\"false\"/><pertinentDosageInstructions classCode=\"OBS\" moodCode=\"EVN\"><code code=\"DI\" codeSystem=\"2.16.840.1.113883.2.1.3.2.4.17.30\"/><value>4 times a day - Oral</value></pertinentDosageInstructions></pertinentInformation2></pertinentLineItem></pertinentInformation2><pertinentInformation2 contextConductionInd=\"true\" inversionInd=\"false\" negationInd=\"false\" typeCode=\"PERT\"><seperatableInd value=\"true\"/><templateId extension=\"CSAB_RM-NPfITUK10.sourceOf2\" root=\"2.16.840.1.113883.2.1.3.2.4.18.2\"/><pertinentLineItem classCode=\"SBADM\" moodCode=\"RQO\"><id root=\"D8A37AA1-8C92-47E1-A257-ED4D506C9421\"/><code code=\"225426007\" codeSystem=\"2.16.840.1.113883.2.1.3.2.4.15\" displayName=\"Administration of therapeutic substance (procedure)\"/><effectiveTime nullFlavor=\"NA\"/><product contextControlCode=\"OP\" typeCode=\"PRD\"><manufacturedProduct classCode=\"MANU\"><manufacturedRequestedMaterial classCode=\"MMAT\" determinerCode=\"KIND\"><code code=\"39113611000001102\" codeSystem=\"2.16.840.1.113883.2.1.3.2.4.15\" displayName=\"Salbutamol 100micrograms/dose inhaler CFC free\"/></manufacturedRequestedMaterial></manufacturedProduct></product><component typeCode=\"COMP\"><seperatableInd value=\"false\"/><lineItemQuantity classCode=\"SPLY\" moodCode=\"RQO\"><code code=\"373784005\" codeSystem=\"2.16.840.1.113883.2.1.3.2.4.15\" displayName=\"Dispensing medication (procedure)\"/><quantity unit=\"1\" value=\"200\"><translation code=\"3317411000001100\" codeSystem=\"2.16.840.1.113883.2.1.3.2.4.15\" displayName=\"dose\" value=\"200\"/></quantity></lineItemQuantity></component><pertinentInformation2 contextConductionInd=\"true\" typeCode=\"PERT\"><seperatableInd value=\"false\"/><pertinentDosageInstructions classCode=\"OBS\" moodCode=\"EVN\"><code code=\"DI\" codeSystem=\"2.16.840.1.113883.2.1.3.2.4.17.30\"/><value>5 times a day - Inhalation</value></pertinentDosageInstructions></pertinentInformation2></pertinentLineItem></pertinentInformation2><pertinentInformation8 contextConductionInd=\"true\" typeCode=\"PERT\"><seperatableInd value=\"false\"/><pertinentTokenIssued classCode=\"OBS\" moodCode=\"EVN\"><code code=\"TI\" codeSystem=\"2.16.840.1.113883.2.1.3.2.4.17.30\"/><value value=\"false\"/></pertinentTokenIssued></pertinentInformation8><pertinentInformation4 contextConductionInd=\"true\" typeCode=\"PERT\"><seperatableInd value=\"false\"/><pertinentPrescriptionType classCode=\"OBS\" moodCode=\"EVN\"><code code=\"PT\" codeSystem=\"2.16.840.1.113883.2.1.3.2.4.17.30\"/><value code=\"0101\" codeSystem=\"2.16.840.1.113883.2.1.3.2.4.17.25\"/></pertinentPrescriptionType></pertinentInformation4></pertinentPrescription></pertinentInformation1><pertinentInformation2 typeCode=\"PERT\"><templateId extension=\"CSAB_RM-NPfITUK10.pertinentInformation1\" root=\"2.16.840.1.113883.2.1.3.2.4.18.2\"/><pertinentCareRecordElementCategory classCode=\"CATEGORY\" moodCode=\"EVN\"><code code=\"185361000000102\" codeSystem=\"2.16.840.1.113883.2.1.3.2.4.15\" displayName=\"Medication - care record element (record artifact)\"/><component typeCode=\"COMP\"><actRef classCode=\"SBADM\" moodCode=\"RQO\"><id root=\"DD99E4EF-2924-4BA7-9A6A-63F82300F851\"/></actRef></component><component typeCode=\"COMP\"><actRef classCode=\"SBADM\" moodCode=\"RQO\"><id root=\"D8A37AA1-8C92-47E1-A257-ED4D506C9421\"/></actRef></component></pertinentCareRecordElementCategory></pertinentInformation2></ParentPrescription>").ParentPrescription as hl7V3.ParentPrescription
    })
  }
}

function getTrackerClient(): TrackerClient {
  return isSandbox()
    ? new SandboxTrackerClient() : new LiveTrackerClient()
}

export const trackerClient = getTrackerClient()
