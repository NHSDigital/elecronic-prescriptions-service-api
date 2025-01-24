import {waitFor} from "@testing-library/react"
import {screen} from "@testing-library/dom"
import pretty from "pretty"
import * as React from "react"
import MockAdapter from "axios-mock-adapter"
import userEvent from "@testing-library/user-event"
import {readBundleFromFile} from "../messages"
import {AppContextValue} from "../../src"
import {renderWithContext} from "../renderWithContext"
import DispensePage from "../../src/pages/dispensePage"
import {axiosInstance} from "../../src/requests/axiosInstance"
import {internalDev} from "../../src/services/environment"
import {MemoryRouter} from "react-router"

const baseUrl = "baseUrl/"
const prescriptionId = "7A9089-A83008-56A03J"
const context: AppContextValue = {baseUrl, environment: internalDev}

const releaseResponseUrl = `${baseUrl}dispense/release/${prescriptionId}`
const dispenseNotificationUrl = `${baseUrl}dispenseNotifications/${prescriptionId}`
const dispenseUrl = `${baseUrl}dispense/dispense`

const prescriptionOrder = readBundleFromFile("prescriptionOrder.json")
const dispenseNotification = readBundleFromFile("dispenseNotificationPartial.json")

const mock = new MockAdapter(axiosInstance)

beforeEach(() => mock.reset())
afterEach(() => mock.reset())

test("Displays loading text while prescription data is being requested", async () => {
  const {container} = renderWithContext(<DispensePage prescriptionId={prescriptionId}/>, context)
  await waitFor(() => screen.getByText("Loading"))

  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Displays dispense form if prescription details are retrieved successfully (no previous dispense notification)", async () => {
  mock.onAny(releaseResponseUrl).reply(200, prescriptionOrder)
  mock.onAny(dispenseNotificationUrl).reply(200, [])

  const container = await renderPage()
  // wait 2 seconds for page to finish rendering
  await new Promise(r => setTimeout(r, 2000))

  expect(screen.getByText("Dispense")).toBeTruthy()
  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Displays dispense form if prescription details are retrieved successfully (previous dispense notifications)", async () => {
  mock.onAny(releaseResponseUrl).reply(200, prescriptionOrder)
  mock.onAny(dispenseNotificationUrl).reply(200, [dispenseNotification, dispenseNotification])

  const container = await renderPage()
  // wait 2 seconds for page to finish rendering
  await new Promise(r => setTimeout(r, 2000))

  expect(screen.getByText("Dispense")).toBeTruthy()
  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Displays an error if prescription-order not found", async () => {
  mock.onAny(releaseResponseUrl).reply(200, null)

  const {container} = renderWithContext(<MemoryRouter><DispensePage prescriptionId={prescriptionId} amendId={null}/></MemoryRouter>, context)
  await waitFor(() => screen.getByText("Error"))

  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Displays an error on invalid response", async () => {
  mock.onAny(releaseResponseUrl).reply(500, {})

  const {container} = renderWithContext(<MemoryRouter><DispensePage prescriptionId={prescriptionId} amendId={null}/></MemoryRouter>, context)
  await waitFor(() => screen.getByText("Error"))

  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Displays loading text while dispense notification is being submitted", async () => {
  mock.onAny(releaseResponseUrl).reply(200, prescriptionOrder)
  mock.onAny(dispenseNotificationUrl).reply(200, [dispenseNotification])

  const container = await renderPage()
  userEvent.click(screen.getByText("Dispense"))
  await waitFor(() => screen.getByText("Sending dispense notification."))

  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Displays dispense result", async () => {
  mock.onAny(releaseResponseUrl).reply(200, prescriptionOrder)
  mock.onAny(dispenseNotificationUrl).reply(200, [dispenseNotification])
  mock.onAny(dispenseUrl).reply(200, {
    success: true,
    request: {req: "JSON Request"},
    request_xml: "XML Request",
    response: {res: "JSON Response"},
    response_xml: "XML Response"
  })

  const container = await renderPage()
  userEvent.click(screen.getByText("Dispense"))
  await waitFor(() => screen.getByText(/Dispense Result/))

  expect(screen.getByText((/JSON Request/))).toBeTruthy()
  expect(screen.getByText("XML Request")).toBeTruthy()
  expect(screen.getByText((/JSON Response/))).toBeTruthy()
  expect(screen.getByText("XML Response")).toBeTruthy()
  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Displays the amend id when amending a dispense notification", async () => {
  mock.onAny(releaseResponseUrl).reply(200, prescriptionOrder)
  mock.onAny(dispenseNotificationUrl).reply(200, [])

  renderWithContext(<MemoryRouter><DispensePage prescriptionId={prescriptionId} amendId="test-id"/></MemoryRouter>, context)

  expect(await screen.findByText("Amending Dispense: test-id")).toBeTruthy()
})

async function renderPage() {
  const {container} = renderWithContext(<MemoryRouter><DispensePage prescriptionId={prescriptionId} amendId={null}/></MemoryRouter>, context)
  await waitFor(() => screen.getByText("Dispense Prescription"))
  return container
}
