import {waitFor} from "@testing-library/react"
import {screen} from "@testing-library/dom"
import pretty from "pretty"
import * as React from "react"
import MockAdapter from "axios-mock-adapter"
import {AppContextValue} from "../../src"
import {renderWithContext} from "../renderWithContext"
import SendPage from "../../src/pages/sendPage"
import {axiosInstance} from "../../src/requests/axiosInstance"
import {internalDev} from "../../src/services/environment"
import {MemoryRouter} from "react-router"

const baseUrl = "baseUrl/"
const token = "MzQxMWJmMjUtMDNlMy00N2FiLWEyOGItMGIyYjVlNTg4ZGU3"
const context: AppContextValue = {baseUrl, environment: internalDev}

const downloadSignaturesUrl = `${baseUrl}sign/download-signatures`
const sendUrl = `${baseUrl}api/prescribe/send`

const mock = new MockAdapter(axiosInstance)

beforeEach(() => mock.reset())
afterEach(() => mock.reset())

test("Displays confirmation page if single prescription is sent successfully", async () => {
  const prescriptionId = "003D4D-A99968-4C5AAJ"
  mock.onAny(downloadSignaturesUrl).reply(200, {
    results: [
      {
        prescription_id: prescriptionId,
        bundle_id: "1",
        success: "unknown"
      }
    ]
  })

  mock.onAny(sendUrl).reply(200, {
    results: [{
      prescription_id: prescriptionId,
      bundle_id: "1",
      request: {},
      request_xml: "XML Request",
      response: {},
      response_xml: "XML Response",
      success: true
    }]
  })

  const container = await renderPage()

  await waitFor(() => screen.getByText(prescriptionId))
  expect(screen.getByText("XML Request")).toBeTruthy()
  expect(screen.getByText("XML Response")).toBeTruthy()
  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Displays confirmation page if multiple prescriptions are sent successfully", async () => {
  mock.onAny(downloadSignaturesUrl).reply(200, {
    results: [
      {
        prescription_id: "003D4D-A99968-4C5AAJ",
        bundle_id: "1",
        success: true
      },
      {
        prescription_id: "008070-A99968-41CD9V",
        bundle_id: "2",
        success: true
      },
      {
        prescription_id: "010E34-A99968-467D9Z",
        bundle_id: "3",
        success: true
      }
    ]
  })

  const container = await renderPage()

  expect(screen.getByText("003D4D-A99968-4C5AAJ")).toBeTruthy()
  expect(screen.getByText("008070-A99968-41CD9V")).toBeTruthy()
  expect(screen.getByText("010E34-A99968-467D9Z")).toBeTruthy()
  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Exception report button not shown if there are pending prescriptions", async () => {
  mock.onAny(downloadSignaturesUrl).reply(200, {
    results: [
      {
        prescription_id: "003D4D-A99968-4C5AAJ",
        bundle_id: "1",
        success: true
      },
      {
        prescription_id: "008070-A99968-41CD9V",
        bundle_id: "2",
        success: "unknown"
      },
      {
        prescription_id: "010E34-A99968-467D9Z",
        bundle_id: "3",
        success: false
      }
    ]
  })
  mock.onAny(sendUrl).reply(function (config) {
    return new Promise(function (resolve) {
      const body = JSON.parse(config.data)
      const prescriptionID = body.results[0].prescription_id
      const response = {
        results: [{
          prescription_id: prescriptionID,
          bundle_id: "1",
          request: {},
          request_xml: "XML Request",
          response: {},
          response_xml: "XML Response",
          success: true
        }]
      }
      resolve([200, response])
    })
  })
  const container = await renderPage()

  expect(screen.getByText("003D4D-A99968-4C5AAJ")).toBeTruthy()
  expect(screen.getByText("008070-A99968-41CD9V")).toBeTruthy()
  expect(screen.getByText("010E34-A99968-467D9Z")).toBeTruthy()
  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Exception report button shown if there are failed prescriptions", async () => {
  mock.onAny(downloadSignaturesUrl).reply(200, {
    results: [
      {
        prescription_id: "003D4D-A99968-4C5AAJ",
        bundle_id: "1",
        success: true
      },
      {
        prescription_id: "008070-A99968-41CD9V",
        bundle_id: "2",
        success: false
      },
      {
        prescription_id: "010E34-A99968-467D9Z",
        bundle_id: "3",
        success: false
      }
    ]
  })

  const container = await renderPage()

  expect(screen.getByText("003D4D-A99968-4C5AAJ")).toBeTruthy()
  expect(screen.getByText("008070-A99968-41CD9V")).toBeTruthy()
  expect(screen.getByText("010E34-A99968-467D9Z")).toBeTruthy()
  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

async function renderPage() {
  let container
  await React.act(async () => {
    container = renderWithContext(<MemoryRouter><SendPage token={token}/></MemoryRouter>, context).container
  })
  await waitFor(() => screen.getByText(/Send Result/))
  return container
}
