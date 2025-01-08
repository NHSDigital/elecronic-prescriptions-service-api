import "jest"
import MockAdapter from "axios-mock-adapter"
import axios from "axios"
import fs from "fs"
import {spine} from "@models"
import {LiveSpineClient} from "../../../src/services/communication/live-spine-client"
import path from "path"
import pino from "pino"

const mock = new MockAdapter(axios)

describe("Spine communication", () => {

  afterEach(() => {
    mock.reset()
  })

  const requestHandler = new LiveSpineClient(
    "localhost",
    "Prescribe",
    (spineRequest: spine.SpineRequest) => `<wrap>${spineRequest.message}</wrap>`
  )

  const logger = pino()

  const mockRequest = {
    message: "test",
    interactionId: "test2",
    messageId: "DEAD-BEEF",
    conversationId: "DEAD-BEEF",
    fromPartyKey: "test3"
  }

  test("Successful send response returns pollable result", async () => {
    mock.onPost().reply(202, 'statusText: "OK"', {
      "content-location": "/_poll/test-content-location"
    })

    const spineResponse = await requestHandler.send(mockRequest, "from_asid", logger)

    expect(spineResponse.statusCode).toBe(202)
    expect(spine.isPollable(spineResponse)).toBe(true)
    expect((spineResponse as spine.SpinePollableResponse).pollingUrl)
      .toBe("example.com/eps/_poll/test-content-location")
  })

  test("Unsuccessful send response returns non-pollable result", async () => {
    mock.onPost().reply(400)

    const spineResponse = await requestHandler.send(mockRequest, "from_asid", logger)

    expect(spine.isPollable(spineResponse)).toBe(false)
    expect((spineResponse as spine.SpineDirectResponse<string>).statusCode).toBe(400)
  })

  test("Successful polling pending response returns pollable result", async () => {
    mock.onGet().reply(202, 'statusText: "OK"', {
      "content-location": "/_poll/test-content-location"
    })

    const spineResponse = await requestHandler.poll("test", "200000001285", logger)

    expect(spineResponse.statusCode).toBe(202)
    expect(spine.isPollable(spineResponse)).toBe(true)
    expect((spineResponse as spine.SpinePollableResponse).pollingUrl)
      .toBe("example.com/eps/_poll/test-content-location")
  })

  test("500 polling response returns 202 status", async () => {
    mock.onGet().reply(500, "500 response")

    const loggerSpy = jest.spyOn(logger, "warn")
    const spineResponse = await requestHandler.poll("test-polling-location", "200000001285", logger)

    expect(spineResponse.statusCode).toBe(202)
    expect(spine.isPollable(spineResponse)).toBe(true)
    expect((spineResponse as spine.SpinePollableResponse).pollingUrl)
      .toBe("example.com/eps/_poll/test-polling-location")
    expect(loggerSpy).toHaveBeenCalledWith(
      {
        response: expect.objectContaining({
          data: "500 response",
          status: 500
        })
      },
      expect.stringContaining("500 response received from polling path")
    )
    loggerSpy.mockRestore()
  })

  test("502 polling response returns an error", async () => {
    mock.onGet().reply(502, "502 response")

    const loggerSpy = jest.spyOn(logger, "error")
    const spineResponse = await requestHandler.poll("test_polling_location", "200000001285", logger)

    expect(spineResponse.statusCode).toBe(502)
    expect(loggerSpy).toHaveBeenCalledWith(
      {
        error: expect.anything(),
        response: expect.objectContaining({
          data: "502 response",
          status: 502
        })
      },
      expect.stringContaining("Failed polling request for polling path test_polling_location.")
    )
    loggerSpy.mockRestore()
  })

  test("Async success messages returned from spine return a 200 response", async () => {
    const asyncSuccess = readFileAsString("async_success.xml")
    mock.onPost().reply(200, `statusText: "OK", responseText: ${asyncSuccess}`)

    const spineResponse = await requestHandler.send(mockRequest, "from_asid", logger)

    expect(spineResponse.statusCode).toBe(200)
    expect(spine.isDirect(spineResponse)).toBe(true)
    expect((spineResponse as spine.SpineDirectResponse<string>).body).toContain("<hl7:acknowledgement typeCode=\"AA\">")
  })

  test("Successful polling complete response returns non pollable result", async () => {
    mock.onGet().reply(200, {statusText: "OK", responseText: 'acknowledgement typeCode="AA"'})

    const spineResponse = await requestHandler.poll("test", "200000001285", logger)

    expect(spineResponse.statusCode).toBe(200)
    expect(spine.isPollable(spineResponse)).toBe(false)
  })

  test("Status response", async () => {
    mock.onGet().reply(200)

    const statusResponse = await requestHandler.getStatus(logger)

    expect(statusResponse.status).toBe("pass")
    expect(statusResponse.responseCode).toBe(200)
  })

  test("Spine communication failure returns a 500 error result", async () => {
    mock.onPost().timeout()

    const spineResponse = await requestHandler.send(mockRequest, "from_asid", logger)

    expect(spine.isPollable(spineResponse)).toBe(false)
    expect((spineResponse as spine.SpineDirectResponse<string>).statusCode).toBe(500)
  })
})

describe("Spine responses", () => {
  test("Messages should be correctly identified as pollable", () => {
    const message = {
      statusCode: 200,
      pollingUrl: "http://test.com"
    }

    expect(spine.isPollable(message)).toBe(true)
  })

  test("Messages should be correctly identified as non-pollable", () => {
    const message = {
      statusCode: 200,
      body: "This is a response body"
    }

    expect(spine.isPollable(message)).toBe(false)
  })
})

function readFileAsString(filename: string): string {
  return fs.readFileSync(path.join(__dirname, `../../resources/spine-responses/${filename}`), "utf-8")
}
