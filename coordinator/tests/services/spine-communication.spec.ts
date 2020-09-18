import "jest"
import * as moxios from "moxios"
import axios from "axios"
import {
  isPollable,
  SpinePollableResponse,
  SpineRequest,
  LiveRequestHandler
} from "../../src/services/spine-communication"

describe("Spine communication", () => {

  const requestHandler = new LiveRequestHandler("localhost", "/Prescribe", (spineRequest: SpineRequest) => `<wrap>${spineRequest.message}</wrap>`)

  beforeEach(() => {
    moxios.install(axios)
  })

  afterEach(() => {
    moxios.uninstall(axios)
  })

  test("Successful sendData response returns pollable result", async () => {
    moxios.wait(() => {
      const request = moxios.requests.mostRecent()
      request.respondWith({
        status: 202,
        statusText: "OK",
        headers: {
          "content-location": "http://test-content-location"
        }
      })
    })

    const spineResponse = await requestHandler.send({message: "test", interactionId: "test2"})

    expect(spineResponse.statusCode).toBe(202)
    expect(isPollable(spineResponse)).toBe(true)
    expect((spineResponse as SpinePollableResponse).pollingUrl).toBe("http://test-content-location")
  })

  test("Unsuccesful sendData response returns non-pollable result", async () => {
    moxios.wait(() => {
      const request = moxios.requests.mostRecent()
      request.respondWith({status: 400})
    })

    const spineResponse = await requestHandler.send({message: "test", interactionId: "test2"})

    expect(isPollable(spineResponse)).toBe(false)
  })

  test("Successful polling pending response returns pollable result", async () => {
    moxios.wait(() => {
      const request = moxios.requests.mostRecent()
      request.respondWith({
        status: 202,
        statusText: "OK",
        headers: {
          "content-location": "http://test-content-location"
        }
      })
    })

    const spineResponse = await requestHandler.poll("test")

    expect(spineResponse.statusCode).toBe(202)
    expect(isPollable(spineResponse)).toBe(true)
    expect((spineResponse as SpinePollableResponse).pollingUrl).toBe("http://test-content-location")
  })

  test("Successful polling complete response returns non pollable result", async () => {
    moxios.wait(() => {
      const request = moxios.requests.mostRecent()
      request.respondWith({
        status: 200,
        statusText: "OK"
      })
    })

    const spineResponse = await requestHandler.poll("test")

    expect(spineResponse.statusCode).toBe(200)
    expect(isPollable(spineResponse)).toBe(false)
  })
})

describe("Spine responses", () => {
  test("Messages should be correctly identified as pollable", () => {
    const message = {
      statusCode: 200,
      pollingUrl: "http://test.com"
    }

    expect(isPollable(message)).toBe(true)
  })

  test("Messages should be correctly identified as non-pollable", () => {
    const message = {
      statusCode: 200,
      body: "This is a response body"
    }

    expect(isPollable(message)).toBe(false)
  })
})
