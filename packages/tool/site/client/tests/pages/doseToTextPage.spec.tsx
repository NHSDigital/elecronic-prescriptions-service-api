import {waitFor} from "@testing-library/react"
import {fireEvent, screen} from "@testing-library/dom"
import pretty from "pretty"
import * as React from "react"
import MockAdapter from "axios-mock-adapter"
import {AppContextValue} from "../../src"
import {renderWithContext} from "../renderWithContext"
import {axiosInstance} from "../../src/requests/axiosInstance"
import {internalDevSandbox} from "../../src/services/environment"
import DoseToTextPage from "../../src/pages/doseToTextPage"
import userEvent from "@testing-library/user-event"
import {readBundleFromFile} from "../messages"
import {MemoryRouter} from "react-router"

const baseUrl = "baseUrl/"
const context: AppContextValue = {baseUrl, environment: internalDevSandbox}
const doseToTextUrl = `${baseUrl}dose-to-text`
const exampleBundle = JSON.stringify(readBundleFromFile("prescriptionOrder.json"))
const mockResponse = [
  {
    "identifier": [
      {
        "system": "https://fhir.nhs.uk/Id/prescription-order-item-number",
        "value": "a54219b8-f741-4c47-b662-e4f8dfa49ab6"
      }
    ],
    "dosageInstructionText": "Inject 5 times a day - Subcutaneous route - for 10 days"
  }
]

const mock = new MockAdapter(axiosInstance)

beforeEach(() => mock.reset())
afterEach(() => mock.reset())

test("Displays dose to text form on render", async () => {
  const container = await renderPage()
  expect(screen.getByText("Dose to Text")).toBeTruthy()
  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Displays dose to text result", async () => {
  mock.onAny(doseToTextUrl).reply(200, {
    success: true,
    results: mockResponse,
    request: {req: "JSON Request"},
    response: {res: "JSON Response"}
  })

  const container = await renderPage()
  const textArea = container.querySelector("[name='doseToTextRequest']")
  fireEvent.change(textArea, {target: {value: exampleBundle}})
  userEvent.click(screen.getByText("Convert"))
  await waitFor(() => screen.getByText("Dose to Text Result"))
  expect(screen.getByText((/JSON Request/))).toBeTruthy()
  expect(screen.getByText((/JSON Response/))).toBeTruthy()
  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

async function renderPage() {
  const {container} = renderWithContext(<MemoryRouter><DoseToTextPage /></MemoryRouter>, context)
  await waitFor(() => screen.getByText("Dose to Text"))
  return container
}
