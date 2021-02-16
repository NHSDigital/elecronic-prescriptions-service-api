import convertPrescriptionRoutes from "./prescribe/convert"
import preparePrescriptionRoutes from "./prescribe/prepare"
import processPrescriptionRoutes from "./prescribe/process"
import statusRoutes from "./health/get-status"
import pollingRoutes from "./prescribe/polling"
import releaseRoutes from "./dispense/release"

export default [
  ...convertPrescriptionRoutes,
  ...preparePrescriptionRoutes,
  ...processPrescriptionRoutes,
  ...releaseRoutes,
  ...statusRoutes,
  ...pollingRoutes
]
