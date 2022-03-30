import Hapi from "@hapi/hapi"
import routes from "./routes"
import HapiPino from "hapi-pino"
import Vision from "@hapi/vision"
import * as inert from "@hapi/inert"
import Yar from "@hapi/yar"
import Cookie from "@hapi/cookie"
import {isDev, isLocal} from "./services/environment"
import axios from "axios"
import {CONFIG} from "./config"
import {getSessionValue, setSessionValue} from "./services/session"
import * as XLSX from "xlsx"

const init = async () => {
  axios.defaults.validateStatus = () => true

  const server = createServer()

  await registerAuthentication(server)
  await registerSession(server)
  await registerLogging(server)
  await registerStaticRouteHandlers(server)
  await registerViewRouteHandlers(server)

  addStaticRoutes(server)
  addDownloadRoutes(server)
  addApiRoutes(server)
  addViewRoutes(server)

  await server.start()
  server.log("info", `Server running on ${server.info.uri}`)
}

process.on("unhandledRejection", err => {
  console.log(err)
  process.exit(1)
})

function createServer() {
  return Hapi.server({
    port: 9000,
    host: "0.0.0.0",
    routes: {
      cors: true
    }
  })
}

async function registerAuthentication(server: Hapi.Server) {
  await server.register(Cookie)
  server.auth.strategy("session", "cookie", {
    cookie: {
      name: "auth",
      password: CONFIG.sessionKey,
      isSecure: true
    },
    redirectTo: (request: Hapi.Request) => {
      if (isDev(CONFIG.environment)) {
        setSessionValue(
          "use_signing_mock",
          request.query["use_signing_mock"],
          request
        )
      }
      return `${CONFIG.baseUrl}login`
    }
  })
  server.auth.default("session")
}

async function registerSession(server: Hapi.Server) {
  await server.register({
    plugin: Yar,
    options: {
      storeBlank: true,
      // Use "0" maxCookieSize to force all session data to be written to cache
      maxCookieSize: 0,
      cache: {
        expiresIn: 24 * 60 * 60 * 1000
      },
      cookieOptions: {
        password: CONFIG.sessionKey,
        isSecure: true,
        isSameSite: "None"
      }
    }
  })
}

async function registerLogging(server: Hapi.Server) {
  await server.register({
    plugin: HapiPino,
    options: {
      // Pretty print in local environment only to avoid spamming logs
      prettyPrint: isLocal(CONFIG.environment),
      // Redact Authorization headers, see https://getpino.io/#/docs/redaction
      redact: ["req.headers.authorization"]
    }
  })
}

async function registerStaticRouteHandlers(server: Hapi.Server) {
  await server.register(inert)
}

async function registerViewRouteHandlers(server: Hapi.Server) {
  await server.register(Vision)
  server.views({
    engines: {
      html: require("handlebars")
    },
    relativeTo: __dirname,
    path: "templates"
  })
}

function addStaticRoutes(server: Hapi.Server) {
  server.route({
    method: "GET",
    path: `/static/{param*}`,
    options: {
      auth: false
    },
    handler: {
      directory: {
        path: "static"
      }
    }
  })
}

function addDownloadRoutes(server: Hapi.Server) {
  server.route({
    method: "GET",
    path: "/download/exception-report",
    handler: downloadExceptionReport
  })

  function downloadExceptionReport(request: Hapi.Request, h: Hapi.ResponseToolkit) {
    const exceptions = getSessionValue("exception_report", request)
    const fileName = "exception-report"
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(exceptions)
    XLSX.utils.book_append_sheet(wb, ws, "Test Exception Report")

    return h.response(XLSX.write(wb, {type: "binary"}))
      .type("application/vnd.ms-excel")
      .header("content-disposition", `attachment; filename=${fileName}.xlsx;`)
      .encoding("binary")
      .code(200)
  }
}

function addApiRoutes(server: Hapi.Server) {
  server.route(routes)
}

function addViewRoutes(server: Hapi.Server) {
  server.route(addHomeView())
  server.route(addView("config"))
  server.route(addView("login", true))
  server.route(addView("my-prescriptions"))
  server.route(addView("validate"))
  server.route(addView("compare-prescriptions"))
  server.route(addView("search"))
  server.route(addView("view"))
  server.route(addView("prescribe/load"))
  server.route(addView("prescribe/send", true))
  server.route(addView("prescribe/cancel"))
  server.route(addView("dispense/release"))
  server.route(addView("dispense/verify"))
  server.route(addView("dispense/return"))
  server.route(addView("dispense/dispense"))
  server.route(addView("dispense/withdraw"))
  server.route(addView("dispense/claim"))

  function addHomeView() : Hapi.ServerRoute {
    return addView("/")
  }

  function addView(path: string, skipAuth?: boolean): Hapi.ServerRoute {
    const viewRoute = {
      method: "GET",
      path: path.startsWith("/") ? path : `/${path}`,
      handler: {
        view: {
          template: "index",
          context: {
            baseUrl: CONFIG.baseUrl,
            environment: CONFIG.environment
          }
        }
      }
    }

    if (skipAuth) {
      return {
        ...viewRoute,
        options: {
          auth: false
        }
      }
    }

    return viewRoute
  }
}

init()
