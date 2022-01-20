import {waitFor} from "@testing-library/react"
import {screen} from "@testing-library/dom"
import pretty from "pretty"
import * as React from "react"
import moxios from "moxios"
import {AppContextValue} from "../../src"
import {renderWithContext} from "../renderWithContext"
import userEvent from "@testing-library/user-event"
import {axiosInstance} from "../../src/requests/axiosInstance"
import ReturnPage from "../../src/pages/returnPage"

const baseUrl = "baseUrl/"
const prescriptionId = "7A9089-A83008-56A03J"
const context: AppContextValue = {baseUrl}

const returnUrl = `${baseUrl}dispense/return`

beforeEach(() => moxios.install(axiosInstance))

afterEach(() => moxios.uninstall(axiosInstance))

test("Displays return form", async () => {
  const container = await renderPage()

  expect(screen.getByText("Return prescription")).toBeTruthy()
  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Displays return result", async () => {
  moxios.stubRequest(returnUrl, {
    status: 200,
    response: {
      prescriptionIds: [],
      success: true,
      request: "JSON Request",
      request_xml: "XML Request",
      response: "JSON Response",
      response_xml: "XML Response"
    }
  })

  const container = await renderPage()
  // const pharmacyContainer = await screen.findByLabelText<HTMLElement>("Pharmacy returning prescription")
  // const pharmacyRadios = pharmacyContainer.getElementsByClassName("nhsuk-radios__input") as HTMLCollectionOf<HTMLInputElement>
  // userEvent.click(pharmacyRadios[0])
  userEvent.click(screen.getByText("Return"))
  await waitFor(() => screen.getByText("Sending return."))
  await waitFor(() => screen.getByText(/Return Result/))
  expect(screen.getByText(JSON.stringify("JSON Request"))).toBeTruthy()
  expect(screen.getByText("XML Request")).toBeTruthy()
  expect(screen.getByText(JSON.stringify("JSON Response"))).toBeTruthy()
  expect(screen.getByText("XML Response")).toBeTruthy()
  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

async function renderPage() {
  const {container} = renderWithContext(<ReturnPage prescriptionId={prescriptionId}/>, context)
  await waitFor(() => screen.getByText("Return prescription"))
  return container
}
