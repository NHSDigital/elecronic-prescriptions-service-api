import {waitFor} from "@testing-library/react"
import {screen} from "@testing-library/dom"
import pretty from "pretty"
import * as React from "react"
import MockAdapter from "axios-mock-adapter"
import {AppContextValue} from "../../src"
import {renderWithContext} from "../renderWithContext"
import ReleasePage, {DispenserDetails, createRelease} from "../../src/pages/releasePage"
import userEvent from "@testing-library/user-event"
import {axiosInstance} from "../../src/requests/axiosInstance"
import {internalDev} from "../../src/services/environment"
import {ReleaseFormValues} from "../../src/components/release/releaseForm"
import * as fhir from "fhir/r4"
import {MemoryRouter} from "react-router"

const baseUrl = "baseUrl/"
const prescriptionId = "7A9089-A83008-56A03J"
const context: AppContextValue = {baseUrl, environment: internalDev}

const releaseUrl = `${baseUrl}dispense/release`

const mock = new MockAdapter(axiosInstance)

beforeEach(() => mock.reset())
afterEach(() => mock.reset())

test("Displays release form", async () => {
  const container = await renderPage()

  expect(screen.getByText("Release prescription(s)")).toBeTruthy()
  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Displays release result", async () => {
  mock.onAny(releaseUrl).reply(200, {
    prescriptionIds: [],
    success: true,
    request: {req: "JSON Request"},
    request_xml: "XML Request",
    response: {res: "JSON Response"},
    response_xml: "XML Response"
  })

  const container = await renderPage()
  const pharmacyContainer = await screen.findByLabelText<HTMLElement>("Pharmacy to release prescriptions to")
  const pharmacyRadios = pharmacyContainer.getElementsByClassName("nhsuk-radios__input") as HTMLCollectionOf<HTMLInputElement>
  userEvent.click(pharmacyRadios[0])
  userEvent.click(screen.getByText("Release"))
  await waitFor(() => screen.getByText("Sending release."))
  await waitFor(() => screen.getByText(/Release Result/))
  expect(screen.getByText((/JSON Request/))).toBeTruthy()
  expect(screen.getByText("XML Request")).toBeTruthy()
  expect(screen.getByText((/JSON Response/))).toBeTruthy()
  expect(screen.getByText("XML Response")).toBeTruthy()
  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Displays release error response", async () => {
  const withDispenser: DispenserDetails = {
    odsCode: "testOdsCode",
    name: "testName",
    tel: "00000"
  }
  mock.onAny(releaseUrl).reply(200, {
    prescriptionIds: [],
    withDispenser,
    success: false,
    request: {req: "JSON Request"},
    request_xml: "XML Request",
    response: {res: "JSON Response"},
    response_xml: "XML Response"
  })

  const container = await renderPage()
  const pharmacyContainer = await screen.findByLabelText<HTMLElement>("Pharmacy to release prescriptions to")
  const pharmacyRadios = pharmacyContainer.getElementsByClassName("nhsuk-radios__input") as HTMLCollectionOf<HTMLInputElement>
  userEvent.click(pharmacyRadios[0])
  userEvent.click(screen.getByText("Release"))
  await waitFor(() => screen.getByText("Sending release."))
  await waitFor(() => screen.getByText(/Release Result/))
  expect(screen.getByText(/testOdsCode/)).toBeTruthy()
  expect(screen.getByText(/00000/)).toBeTruthy()
  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

function createReleaseFormValuesCustom(pharmacyIdentifierCustom: string): ReleaseFormValues{
  return {releaseType: "all",
    pharmacy: "custom",
    customPharmacy: pharmacyIdentifierCustom
  }
}

describe("multiple instructions", () => {
  test("Prescription is released to the pharmacy with the code VNFKT", () => {
    const input: ReleaseFormValues = {
      releaseType: "all",
      pharmacy: "VNFKT"
    }
    const auth = "User"
    const result = createRelease(input, auth)
    const organization = result.parameter[0].resource as fhir.Organization
    const identifierValue = organization.identifier[0].value
    expect(identifierValue).toBe("VNFKT")
  })

  test("Prescription is released to the pharmacy with the code YGM1E", () => {
    const input: ReleaseFormValues = {
      releaseType: "all",
      pharmacy: "YGM1E"
    }
    const auth = "User"
    const result = createRelease(input, auth)
    const organization = result.parameter[0].resource as fhir.Organization
    const identifierValue = organization.identifier[0].value
    expect(identifierValue).toBe("YGM1E")
  })

  test("Prescription is released to pharmacy with a custom ODS code", () => {
    const input = createReleaseFormValuesCustom("FCG71")
    const auth = "User"
    const result = createRelease(input, auth)
    const organization = result.parameter[0].resource as fhir.Organization
    const identifierValue = organization.identifier[0].value
    expect(identifierValue).toBe("FCG71")
  })
})

async function renderPage() {
  const {container} = renderWithContext(<MemoryRouter><ReleasePage prescriptionId={prescriptionId}/></MemoryRouter>, context)
  await waitFor(() => screen.getByText("Release prescription(s)"))
  return container
}
