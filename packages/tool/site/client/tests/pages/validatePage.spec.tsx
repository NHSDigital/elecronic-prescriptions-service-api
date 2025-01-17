import {waitFor} from "@testing-library/react"
import {fireEvent, screen} from "@testing-library/dom"
import pretty from "pretty"
import * as React from "react"
import MockAdapter from "axios-mock-adapter"
import {AppContextValue} from "../../src"
import {renderWithContext} from "../renderWithContext"
import userEvent from "@testing-library/user-event"
import {axiosInstance} from "../../src/requests/axiosInstance"
import ValidatePage from "../../src/pages/validatePage"
import {internalDev} from "../../src/services/environment"
import {MemoryRouter} from "react-router"

const baseUrl = "baseUrl/"
const context: AppContextValue = {baseUrl, environment: internalDev}

const validateUrl = `${baseUrl}validate`

const mock = new MockAdapter(axiosInstance)

beforeEach(() => mock.reset())
afterEach(() => mock.reset())

test("Displays validate form", async () => {
  const container = await renderPage()

  expect(screen.getByText("Validate a FHIR Resource")).toBeTruthy()
  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Displays validate result", async () => {
  mock.onAny(validateUrl).reply(200, {
    success: true,
    request: {req: "JSON Request"},
    response: {res: "JSON Response"}
  })

  const container = await renderPage()
  const textArea = container.querySelector("[name='validatePayload']")
  fireEvent.change(textArea, {target: {value: "{}"}})
  userEvent.click(screen.getByText("Validate"))
  await waitFor(() => screen.getByText("Sending validation request."))
  await waitFor(() => screen.getByText(/Validate Result/))
  expect(screen.getByText((/JSON Request/))).toBeTruthy()
  expect(screen.getByText((/JSON Response/))).toBeTruthy()
  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

async function renderPage() {
  const {container} = renderWithContext(<MemoryRouter><ValidatePage/></MemoryRouter>, context)
  await waitFor(() => screen.getByText("Validate a FHIR Resource"))
  return container
}
