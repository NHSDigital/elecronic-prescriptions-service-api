import {waitFor} from "@testing-library/react"
import {screen} from "@testing-library/dom"
import pretty from "pretty"
import * as React from "react"
import moxios from "moxios"
import ClaimPage from "../../src/pages/claimPage"
import userEvent from "@testing-library/user-event"
import {readMessage} from "../messages/messages"
import {AppContextValue} from "../../src"
import {renderWithContext} from "../renderWithContext"
import {axiosInstance} from "../../src/requests/axiosInstance"
import {internalDev} from "../../src/services/environment"

const baseUrl = "baseUrl/"
const prescriptionId = "7A9089-A83008-56A03J"
const context: AppContextValue = {baseUrl, environment: internalDev}

const releaseResponseUrl = `${baseUrl}dispense/release/${prescriptionId}`
const dispenseNotificationUrl = `${baseUrl}dispenseNotifications/${prescriptionId}`
const claimUrl = `${baseUrl}claim/${prescriptionId}`

const prescriptionOrder = readMessage("prescriptionOrder.json")
const dispenseNotification = readMessage("dispenseNotification.json")
const claim = readMessage("claim.json")

beforeEach(() => moxios.install(axiosInstance))

afterEach(() => moxios.uninstall(axiosInstance))

test("Displays loading text while prescription data is being requested", async () => {
  const {container} = renderWithContext(<ClaimPage prescriptionId={prescriptionId}/>, context)
  await waitFor(() => screen.getByText("Loading..."))

  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Displays claim form if prescription details are retrieved successfully", async () => {
  moxios.stubRequest(releaseResponseUrl, {
    status: 200,
    response: prescriptionOrder
  })
  moxios.stubRequest(dispenseNotificationUrl, {
    status: 200,
    response: [dispenseNotification]
  })

  const container = await renderClaimPage()

  expect(screen.getByText("Claim")).toBeTruthy()
  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Displays an error if prescription-order not found", async () => {
  moxios.stubRequest(releaseResponseUrl, {
    status: 200,
    response: null
  })

  const {container} = renderWithContext(<ClaimPage prescriptionId={prescriptionId}/>, context)
  await waitFor(() => screen.getByText("Error"))

  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Displays an error if dispense-notification not found", async () => {
  moxios.stubRequest(releaseResponseUrl, {
    status: 200,
    response: prescriptionOrder
  })
  moxios.stubRequest(dispenseNotificationUrl, {
    status: 200,
    response: []
  })

  const {container} = renderWithContext(<ClaimPage prescriptionId={prescriptionId}/>, context)
  await waitFor(() => screen.getByText("Error"))

  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Displays an error on invalid response", async () => {
  moxios.stubRequest(releaseResponseUrl, {
    status: 500,
    statusText: "Internal Server Error",
    response: {}
  })

  const {container} = renderWithContext(<ClaimPage prescriptionId={prescriptionId}/>, context)
  await waitFor(() => screen.getByText("Error"))

  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Displays loading text while claim is being submitted", async () => {
  moxios.stubRequest(releaseResponseUrl, {
    status: 200,
    response: prescriptionOrder
  })
  moxios.stubRequest(dispenseNotificationUrl, {
    status: 200,
    response: [dispenseNotification]
  })

  const container = await renderClaimPage()
  userEvent.click(screen.getByText("Claim"))
  await waitFor(() => screen.getByText("Loading..."))

  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Displays claim result", async () => {
  moxios.stubRequest(releaseResponseUrl, {
    status: 200,
    response: prescriptionOrder
  })
  moxios.stubRequest(dispenseNotificationUrl, {
    status: 200,
    response: [dispenseNotification]
  })
  moxios.stubRequest(claimUrl, {
    status: 200,
    response: {
      success: true,
      request: "JSON Request",
      request_xml: "XML Request",
      response: "JSON Response",
      response_xml: "XML Response"
    }
  })

  const container = await renderClaimPage()
  userEvent.click(screen.getByText("Claim"))
  await waitFor(() => screen.getByText(/Claim Result/))

  expect(screen.getByText(JSON.stringify("JSON Request"))).toBeTruthy()
  expect(screen.getByText("XML Request")).toBeTruthy()
  expect(screen.getByText(JSON.stringify("JSON Response"))).toBeTruthy()
  expect(screen.getByText("XML Response")).toBeTruthy()
  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Displays claim amend form if prescription details are retrieved successfully", async () => {
  moxios.stubRequest(releaseResponseUrl, {
    status: 200,
    response: prescriptionOrder
  })
  moxios.stubRequest(dispenseNotificationUrl, {
    status: 200,
    response: [dispenseNotification]
  })
  moxios.stubRequest(claimUrl, {
    status: 200,
    response: claim
  })

  const container = await renderClaimAmendPage()

  expect(screen.getByText("Claim")).toBeTruthy()
  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Displays an error if previous claim not found for amend", async () => {
  moxios.stubRequest(releaseResponseUrl, {
    status: 200,
    response: prescriptionOrder
  })
  moxios.stubRequest(dispenseNotificationUrl, {
    status: 200,
    response: [dispenseNotification]
  })
  moxios.stubRequest(claimUrl, {
    status: 200,
    response: null
  })

  const {container} = renderWithContext(<ClaimPage prescriptionId={prescriptionId} amend/>, context)
  await waitFor(() => screen.getByText("Error"))

  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

async function renderClaimPage() {
  const {container} = renderWithContext(<ClaimPage prescriptionId={prescriptionId}/>, context)
  await waitFor(() => screen.getByText("Claim for Dispensed Prescription"))
  return container
}

async function renderClaimAmendPage() {
  const {container} = renderWithContext(<ClaimPage prescriptionId={prescriptionId} amend/>, context)
  await waitFor(() => screen.getByText("Claim for Dispensed Prescription"))
  return container
}
