import {waitFor} from "@testing-library/react"
import {screen} from "@testing-library/dom"
import pretty from "pretty"
import * as React from "react"
import moxios from "moxios"
import {AppContextValue} from "../../src"
import {renderWithContext} from "../renderWithContext"
import userEvent from "@testing-library/user-event"
import {axiosInstance} from "../../src/requests/axiosInstance"
import {internalDev} from "../../src/services/environment"
import ConfigPage from "../../src/pages/configPage"

const baseUrl = "baseUrl/"
const context: AppContextValue = {baseUrl, environment: internalDev}

const configUrl = `${baseUrl}config`

beforeEach(() => moxios.install(axiosInstance))

afterEach(() => moxios.uninstall(axiosInstance))

test("Displays config form", async () => {
  const container = await renderPage()

  expect(screen.getByText("Config")).toBeTruthy()
  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Displays config update result", async () => {
  moxios.stubRequest(configUrl, {
    status: 200,
    response: {
      success: true
    }
  })

  const container = await renderPage()
  userEvent.click(screen.getByText("Save"))
  await waitFor(() => screen.getByText(/Config Saved/))
  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

async function renderPage() {
  const {container} = renderWithContext(<ConfigPage/>, context)
  await waitFor(() => screen.getByText("Config"))
  return container
}
