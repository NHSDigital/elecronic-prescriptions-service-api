import statusRoutes from "./health/get-status"
import accessTokenRoutes from "./auth/login"
import sessionRoutes from "./state/session"
import editRoutes from "./prescribe/edit"
import signRoutes from "./prescribe/sign"
import sendRoutes from "./prescribe/send"
import searchRoutes from "./tracker/search"
import releaseRoutes from "./dispense/release"
import dispenseRoutes from "./dispense/dispense"

const authRoutes = [
  ...accessTokenRoutes
]

const stateRoutes = [
  ...sessionRoutes
]

const prescribingRoutes = [
  ...editRoutes,
  ...signRoutes,
  ...sendRoutes
]

const dispensingRoutes = [
  ...releaseRoutes,
  ...dispenseRoutes
]

const trackerRoutes = [
  ...searchRoutes
]

const healthcheckRoutes = [
  ...statusRoutes
]

const routes = [
  ...authRoutes,
  ...stateRoutes,
  ...healthcheckRoutes,
  ...prescribingRoutes,
  ...dispensingRoutes,
  ...trackerRoutes
]

export default routes
