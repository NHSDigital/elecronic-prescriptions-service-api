import {waitFor} from "@testing-library/react"
import {screen} from "@testing-library/dom"
import pretty from "pretty"
import * as React from "react"
import moxios from "moxios"
import {AppContextValue} from "../../src"
import {renderWithContext} from "../renderWithContext"
import SendPostSignPage from "../../src/pages/sendPostSignPage"

const baseUrl = "baseUrl/"
const token = "MzQxMWJmMjUtMDNlMy00N2FiLWEyOGItMGIyYjVlNTg4ZGU3"
const prescriptionId = "003D4D-A99968-4C5AAJ"
const context: AppContextValue = {baseUrl}

const sendUrl = `${baseUrl}prescribe/send`

beforeEach(() => moxios.install())

afterEach(() => moxios.uninstall())

test("Displays loading text while prescription is being sent", async () => {
  const {container} = renderWithContext(<SendPostSignPage token={token}/>, context)
  await waitFor(() => screen.getByText("Sending prescription."))

  expect(screen.getByText("Loading...")).toBeTruthy()
  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Displays confirmation page if prescription is sent successfully", async () => {
  moxios.stubRequest(sendUrl, {
    status: 200,
    response: {
      success: true,
      prescription_id: prescriptionId,
      request: "JSON Request",
      request_xml: "XML Request",
      response: "JSON Response",
      response_xml: "XML Response"
    }
  })

  const container = await renderPage()

  expect(screen.getByText(prescriptionId)).toBeTruthy()
  expect(screen.getByText(JSON.stringify("JSON Request"))).toBeTruthy()
  expect(screen.getByText("XML Request")).toBeTruthy()
  expect(screen.getByText(JSON.stringify("JSON Response"))).toBeTruthy()
  expect(screen.getByText("XML Response")).toBeTruthy()
  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

async function renderPage() {
  const {container} = renderWithContext(<SendPostSignPage token={token}/>, context)
  await waitFor(() => screen.getByText(/Send Result/))
  return container
}
