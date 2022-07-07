import convertPrescriptionRoutes from "./debug/convert"
import validatorRoutes from "./debug/validate"
import doseToTextRoutes from "./debug/dose-to-text"
import preparePrescriptionRoutes from "./prescribe/prepare"
import processPrescriptionRoutes from "./prescribe/process"
import statusRoutes from "./health/get-status"
import metadataRoutes from "./metadata"
import pollingRoutes from "./polling"
import releaseRoutes from "./dispense/release"
import taskRoutes from "./dispense/task"
import claimRoutes from "./dispense/claim"
import trackerRoutes from "./tracker/task"
import verifySignatureRoutes from "./dispense/verify-signature"
import {isProd} from "../utils/environment"

const debugRoutes = [
  ...convertPrescriptionRoutes,
  ...validatorRoutes,
  ...doseToTextRoutes
]

const mainRoutes = [
  ...preparePrescriptionRoutes,
  ...processPrescriptionRoutes,
  ...releaseRoutes,
  ...pollingRoutes,
  ...taskRoutes,
  ...claimRoutes,
  ...trackerRoutes,
  ...verifySignatureRoutes,
  ...metadataRoutes
]

const healthcheckRoutes = [
  ...statusRoutes
]

const routes = [
  ...healthcheckRoutes,
  ...mainRoutes
]

if (!isProd()) {
  routes.push(...debugRoutes)
}

export default routes
