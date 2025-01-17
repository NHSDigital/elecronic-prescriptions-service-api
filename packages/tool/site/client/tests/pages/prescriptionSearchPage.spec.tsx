import {waitFor} from "@testing-library/react"
import {screen} from "@testing-library/dom"
import pretty from "pretty"
import * as React from "react"
import MockAdapter from "axios-mock-adapter"
import userEvent from "@testing-library/user-event"
import {readBundleFromFile} from "../messages"
import {AppContextValue} from "../../src"
import {renderWithContext} from "../renderWithContext"
import PrescriptionSearchPage from "../../src/pages/prescriptionSearchPage"
import {Bundle, OperationOutcome} from "fhir/r4"
import {axiosInstance} from "../../src/requests/axiosInstance"
import {MomentInput} from "moment"
import {PrescriptionStatus} from "../../src/fhir/reference-data/valueSets"
import {DateRangeType} from "../../src/components/prescription-tracker/dateRangeField"
import {internalDev} from "../../src/services/environment"
import {MemoryRouter} from "react-router"

const baseUrl = "baseUrl/"
const prescriptionId = "003D4D-A99968-4C5AAJ"
const nhsNumber = "9449304106"
const formattedNhsNumber = "944 930 4106"
const context: AppContextValue = {baseUrl, environment: internalDev}

const taskTrackerBaseUrl = `${baseUrl}taskTracker`

const dispenseNotifications = `${baseUrl}dispenseNotifications/${prescriptionId}`

const summarySearchResult = readBundleFromFile("summarySearchResult.json")
const detailSearchResult = readBundleFromFile("detailSearchResult.json")
const dispenseNotificationResult = readBundleFromFile("dispenseNotification.json")

jest.mock("moment", () => {
  const actualMoment = jest.requireActual("moment")
  return ({
    ...actualMoment,
    utc: (inp?: MomentInput, strict?: boolean) => actualMoment.utc(inp ?? "2021-11-13T10:57:13.000Z", strict)
  })
})

const mock = new MockAdapter(axiosInstance)

beforeEach(() => mock.reset())
afterEach(() => mock.reset())

test("Displays search form", async () => {
  const container = await renderPage()
  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Form values are populated from query string", async () => {
  const {container} = renderWithContext(<MemoryRouter><PrescriptionSearchPage prescriptionId={prescriptionId}/></MemoryRouter>, context)
  await waitFor(() => screen.getByText("Search for a Prescription"))
  expect(screen.getByLabelText<HTMLInputElement>("Prescription ID").value).toEqual(prescriptionId)
  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Displays error if mandatory field missing", async () => {
  const container = await renderPage()
  userEvent.click(screen.getByText("Search"))
  await waitFor(() =>
    expect(screen.getAllByText("One of Prescription ID or NHS Number is required")).toHaveLength(2)
  )

  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Displays error if creation date field partially completed", async () => {
  const container = await renderPage()
  await enterDateRangeType(DateRangeType.FROM)
  await enterDateField("Day", "12")
  await enterDateField("Month", "6")
  userEvent.click(screen.getByText("Search"))
  await waitFor(() =>
    expect(screen.getByText("All fields are required for a date search")).toBeTruthy()
  )

  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Displays error if creation date field invalid", async () => {
  const container = await renderPage()
  await enterDateRangeType(DateRangeType.FROM)
  await enterDateField("Day", "45")
  await enterDateField("Month", "12")
  await enterDateField("Year", "2020")
  userEvent.click(screen.getByText("Search"))
  await waitFor(() =>
    expect(screen.getByText("Invalid date")).toBeTruthy()
  )

  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Displays loading text while performing a summary search", async () => {
  const container = await renderPage()
  await enterNhsNumber()
  userEvent.click(screen.getByText("Search"))
  await waitFor(() => expect(screen.getByText("Searching for prescriptions.")).toBeTruthy())

  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Displays results if summary search completes successfully - NHS number field populated", async () => {
  mock.onAny(taskTrackerBaseUrl).reply(200, summarySearchResult)

  const container = await renderPage()
  await enterNhsNumber()
  await clickSearchButton()
  expect(screen.getByText(prescriptionId)).toBeTruthy()
  expect(screen.getAllByText(formattedNhsNumber)).toHaveLength(5)

  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Displays results if summary search completes successfully - all fields populated", async () => {
  mock.onAny(taskTrackerBaseUrl).reply(200, summarySearchResult)

  const container = await renderPage()
  await enterPrescriptionId()
  await enterNhsNumber()
  await enterStatus()
  await enterDate()
  await clickSearchButton()
  expect(screen.getByText(prescriptionId)).toBeTruthy()
  expect(screen.getAllByText(formattedNhsNumber)).toHaveLength(5)

  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Displays a message if summary search returns no results", async () => {
  const emptyBundle: Bundle = {
    resourceType: "Bundle",
    type: "searchset",
    total: 0,
    entry: []
  }
  mock.onAny(taskTrackerBaseUrl).reply(200, emptyBundle)

  const container = await renderPage()
  await enterNhsNumber()
  await clickSearchButton()
  expect(screen.getByText("No results found.")).toBeTruthy()

  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Displays an error message if summary search returns an error", async () => {
  const errorResponse: OperationOutcome = {
    resourceType: "OperationOutcome",
    meta: {
      lastUpdated: "2022-10-21T13:47:00+00:00"
    },
    issue: [{
      severity: "fatal",
      code: "invalid",
      diagnostics: "Invalid query parameters."
    }]
  }
  mock.onAny(taskTrackerBaseUrl).reply(400, errorResponse)

  const container = await renderPage()
  await enterNhsNumber()
  userEvent.click(screen.getByText("Search"))
  await waitFor(() => screen.getByText("Error"))

  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Displays an error message if summary search returns invalid response", async () => {
  mock.onAny(taskTrackerBaseUrl).reply(500, null)

  const container = await renderPage()
  await enterNhsNumber()
  userEvent.click(screen.getByText("Search"))
  await waitFor(() => screen.getByText("Error"))

  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Clicking back from the summary search results returns to the form", async () => {
  mock.onAny(taskTrackerBaseUrl).reply(200, summarySearchResult)

  const container = await renderPage()
  await enterNhsNumber()
  await clickSearchButton()
  userEvent.click(screen.getByText("Back"))
  await waitFor(() => screen.getByText("Search for a Prescription"))

  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Displays loading text while performing a detail search", async () => {
  mock.onAny(taskTrackerBaseUrl).reply(200, summarySearchResult)

  const container = await renderPage()
  await enterNhsNumber()
  await clickSearchButton()
  userEvent.click(screen.getAllByText("View Details")[0])
  await waitFor(() => screen.getByText("Retrieving full prescription details."))

  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Displays results if detail search completes successfully without previous dispenses", async () => {
  mock.onAny(taskTrackerBaseUrl)
    .replyOnce(200, summarySearchResult)
    .onAny(taskTrackerBaseUrl)
    .reply(200, detailSearchResult)
  mock.onAny(dispenseNotifications).reply(200, [])

  const container = await renderPage()
  await enterNhsNumber()
  await clickSearchButton()
  await clickViewDetailsLink()
  expect(screen.getByText(prescriptionId)).toBeTruthy()
  expect(screen.getByText(formattedNhsNumber)).toBeTruthy()
  expect(screen.getByText("Claimed")).toBeTruthy()
  expect(screen.getByText("SOMERSET BOWEL CANCER SCREENING CENTRE (A99968)")).toBeTruthy()
  expect(screen.getByText("NHS BUSINESS SERVICES AUTHORITY (T1450)")).toBeTruthy()

  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Displays results if detail search completes successfully with previous dispenses", async () => {
  mock.onAny(taskTrackerBaseUrl)
    .replyOnce(200, summarySearchResult)
    .onAny(taskTrackerBaseUrl)
    .reply(200, detailSearchResult)
  mock.onAny(dispenseNotifications).reply(200, [dispenseNotificationResult])

  const container = await renderPage()
  await enterNhsNumber()
  await clickSearchButton()
  await clickViewDetailsLink()
  expect(screen.getByText(prescriptionId)).toBeTruthy()
  expect(screen.getByText(formattedNhsNumber)).toBeTruthy()
  expect(screen.getByText("Claimed")).toBeTruthy()
  expect(screen.getByText("SOMERSET BOWEL CANCER SCREENING CENTRE (A99968)")).toBeTruthy()
  expect(screen.getByText("NHS BUSINESS SERVICES AUTHORITY (T1450)")).toBeTruthy()

  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

test("Clicking back from the detail search results returns to the summary search", async () => {
  mock.onAny(taskTrackerBaseUrl)
    .replyOnce(200, summarySearchResult)
    .onAny(taskTrackerBaseUrl)
    .reply(200, detailSearchResult)
  mock.onAny(dispenseNotifications).reply(200, [])

  const container = await renderPage()
  await enterNhsNumber()
  await clickSearchButton()
  await clickViewDetailsLink()
  userEvent.click(screen.getByText("Back"))
  await waitFor(() => expect(screen.getByText("Search Results")).toBeTruthy())
  expect(screen.getByText(prescriptionId)).toBeTruthy()
  expect(screen.getAllByText(formattedNhsNumber)).toHaveLength(5)

  expect(pretty(container.innerHTML)).toMatchSnapshot()
})

async function renderPage() {
  const {container} = renderWithContext(<MemoryRouter><PrescriptionSearchPage/></MemoryRouter>, context)
  await waitFor(() => screen.getByText("Search for a Prescription"))
  return container
}

async function enterPrescriptionId() {
  userEvent.type(screen.getByLabelText("Prescription ID"), prescriptionId)
  await waitFor(
    () => expect(screen.getByLabelText<HTMLInputElement>("Prescription ID").value).toEqual(prescriptionId)
  )
}

async function enterNhsNumber() {
  userEvent.type(screen.getByLabelText("NHS Number"), nhsNumber)
  await waitFor(
    () => expect(screen.getByLabelText<HTMLInputElement>("NHS Number").value).toEqual(nhsNumber)
  )
}

async function enterStatus() {
  userEvent.selectOptions(screen.getByLabelText("Status"), PrescriptionStatus.DISPENSED)
  await waitFor(
    () => expect(screen.getByLabelText<HTMLSelectElement>("Status").value).toEqual(PrescriptionStatus.DISPENSED)
  )
}

async function enterDate() {
  await enterDateRangeType(DateRangeType.FROM)
  await enterDateField("Day", "1")
  await enterDateField("Month", "1")
  await enterDateField("Year", "2020")
}

async function enterDateRangeType(value: DateRangeType) {
  userEvent.selectOptions(screen.getByLabelText("Creation Date"), value)
  await waitFor(
    () => expect(screen.getByLabelText<HTMLSelectElement>("Creation Date").value).toEqual(value)
  )
}

async function enterDateField(labelText: "Day" | "Month" | "Year", value: string) {
  userEvent.type(screen.getByLabelText(labelText), value)
  await waitFor(
    () => expect(screen.getByLabelText<HTMLInputElement>(labelText).value).toEqual(value)
  )
}

async function clickSearchButton() {
  userEvent.click(screen.getByText("Search"))
  await waitFor(() => screen.getByText("Search Results"))
}

async function clickViewDetailsLink() {
  userEvent.click(screen.getAllByText("View Details")[0])
  await waitFor(() => screen.getByText("Prescription Details"))
}
