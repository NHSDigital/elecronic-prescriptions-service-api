import {screen} from "@testing-library/dom"
import * as React from "react"
import MockAdapter from "axios-mock-adapter"
import {AppContextValue} from "../../src"
import {renderWithContext} from "../renderWithContext"
import ViewPrescriptionPage from "../../src/pages/viewPrescriptionPage"
import {axiosInstance} from "../../src/requests/axiosInstance"
import {internalDev} from "../../src/services/environment"
import {readBundleFromFile} from "../messages"
import {MemoryRouter} from "react-router"

const baseUrl = "baseUrl/"
const prescriptionId = "7A9089-A83008-56A03J"
const context: AppContextValue = {baseUrl, environment: internalDev}

const dispenseNotificationUrl = `${baseUrl}dispenseNotifications/${prescriptionId}`
const trackerUrl = `${baseUrl}taskTracker`

const detailSearchResult = readBundleFromFile("detailSearchResult.json")
const dispenseNotification = readBundleFromFile("dispenseNotification.json")
const mock = new MockAdapter(axiosInstance)

describe("View Prescription Page", () => {
  beforeEach(() => mock.reset())
  afterEach(() => mock.reset())

  describe("When the page is loading the prescription details", () => {
    beforeEach(async () => {
      mock.onGet(trackerUrl).reply(function () {
        return new Promise(function (resolve) {
          setTimeout(function () {
            resolve([200, detailSearchResult])
          }
          , 1000)
        })
      })
      renderWithContext(<MemoryRouter><ViewPrescriptionPage prescriptionId={prescriptionId}/></MemoryRouter>, context)
    })

    it("should make a request to the task tracker to get the prescription details", () => {
      mock.onAny(trackerUrl).reply(200)
      expect(mock.history.get.length).toBe(1)
    })

    it("should display the loading text", () => {
      expect(screen.getByText("Retrieving full prescription details.")).toBeDefined()
    })

    it("should not display the prescription details information", () => {
      expect(screen.queryByText("Prescription Details")).toBeNull()
    })
  })

  describe("When the page is loading dispense notifications for the prescription", () => {
    beforeEach(async () => {
      mock.onAny(trackerUrl).reply(200, detailSearchResult)
      mock.onGet(dispenseNotificationUrl).reply(function () {
        return new Promise(function (resolve) {
          setTimeout(function () {
            resolve([200, detailSearchResult])
          }
          , 1000)
        })
      })

      renderWithContext(<MemoryRouter><ViewPrescriptionPage prescriptionId={prescriptionId}/></MemoryRouter>, context)
    })

    it("should make a request to the tracker to get the prescription details", () => {
      expect(mock.history.get[1].url).toBe(dispenseNotificationUrl)
    })

    it("should display the loading text", () => {
      expect(screen.getByText("Retrieving full prescription details.")).toBeDefined()
    })

    it("should not display the prescription details information", () => {
      expect(screen.queryByText("Prescription Details")).toBeNull()
    })
  })

  describe("When the page fails to load the prescription details", () => {
    beforeEach(async () => {
      mock.onAny(trackerUrl).reply(500, {})
      mock.onAny(dispenseNotificationUrl).reply(500, {})
      await React.act(async () => {
        renderWithContext(<MemoryRouter><ViewPrescriptionPage prescriptionId={prescriptionId}/></MemoryRouter>, context)
      })
    })

    it("should display the error", () => {
      expect(screen.getByText("Error")).toBeDefined()
    })
  })

  describe("When the page loads a prescription with no dispense notifications", () => {
    beforeEach(async () => {
      mock.onAny(trackerUrl).reply(200, detailSearchResult)
      mock.onAny(dispenseNotificationUrl).reply(200, [])
      await React.act(async () => {
        renderWithContext(<MemoryRouter><ViewPrescriptionPage prescriptionId={prescriptionId}/></MemoryRouter>, context)
      })
    })

    it("should display the prescription details information", () => {
      expect(screen.getByText("Prescription Details")).toBeDefined()
    })

    it("should not display the dispense events table", () => {
      expect(screen.queryByText("Dispense Events")).toBeNull()
    })
  })

  describe("When the page loads a prescription with a dispense notification", () => {
    beforeEach(async () => {
      mock.onAny(trackerUrl).reply(200, detailSearchResult)
      mock.onAny(dispenseNotificationUrl).reply(200, [dispenseNotification])
      await React.act(async () => {
        renderWithContext(<MemoryRouter><ViewPrescriptionPage prescriptionId={prescriptionId}/></MemoryRouter>, context)
      })
    })

    it("should display the prescription details information", () => {
      expect(screen.getByText("Prescription Details")).toBeDefined()
    })

    it("should display the dispense events table", () => {
      expect(screen.getByText("Dispense Events")).toBeDefined()
    })
  })
})
