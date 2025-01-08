import pino from "pino"
import Hapi from "@hapi/hapi"
import {SandboxTrackerClient} from "./sandbox"
import {LiveTrackerClient} from "./live"
import {spine} from "@models"
import {isSandbox} from "../../../utils/feature-flags"

export interface TrackerClient {
  getPrescriptionsByPatientId(
    patientId: string,
    businessStatus: string,
    earliestDate: string,
    latestDate: string,
    headers: Hapi.Utils.Dictionary<string>,
    logger: pino.Logger
  ): Promise<spine.SummaryTrackerResponse>
  getPrescriptionById(
    prescriptionId: string,
    headers: Hapi.Utils.Dictionary<string>,
    logger: pino.Logger
  ): Promise<spine.DetailTrackerResponse>
}

function getTrackerClient(): TrackerClient {
  return isSandbox()
    ? new SandboxTrackerClient() : new LiveTrackerClient()
}

export const trackerClient = getTrackerClient()
