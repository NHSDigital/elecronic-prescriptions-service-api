import axios from "axios"
import pino from "pino"
import * as fhir from "../../models/fhir"
import {OdsClient} from "./ods-client"
import {convertToOrganization, OdsOrganization} from "./ods-organization"

export class LiveOdsClient implements OdsClient {
  async lookupOrganization(odsCode: string, logger: pino.Logger): Promise<fhir.Organization> {
    logger.info(`Performing ODS lookup for code ${odsCode}`)
    const url = `https://${process.env.ODS_URL}/Organization/${odsCode}`
    try {
      const result = await axios.get<OdsOrganization>(url)
      if (result.status != 200) {
        logger.error(`Failed ODS lookup for path ${url}. StatusCode: ${result.status}`)
        return null
      }
      return convertToOrganization(result.data)
    } catch (error) {
      logger.error(`Failed ODS lookup for path ${url}. Error: ${error}`)
      return null
    }
  }
}
