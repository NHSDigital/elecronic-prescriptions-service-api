import {MtlsSpineClient} from "../../../src/services/communication/mtls-spine-client"
import {LiveSpineClient} from "../../../src/services/communication/live-spine-client"
import {SandboxSpineClient} from "../../../src/services/communication/sandbox-spine-client"
import {getSpineClient, SpineClient} from "../../../src/services/communication/spine-client"

describe("Spine Client Factory", () => {
  let originalMtlsSpineClient: string
  let originalSandbox: string
  beforeEach(() => {
    originalMtlsSpineClient = process.env.MTLS_SPINE_CLIENT
    originalSandbox = process.env.SANDBOX
  })

  afterEach(() => {
    process.env.MTLS_SPINE_CLIENT = originalMtlsSpineClient
    process.env.SANDBOX = originalSandbox
  })

  test("Returns MtlsSpineClient when useMtlsSpineClient is true", () => {
    process.env.MTLS_SPINE_CLIENT = "true"
    process.env.SANDBOX = "0"
    const spineClient: SpineClient = getSpineClient()
    expect(spineClient).toBeInstanceOf(MtlsSpineClient)
  })

  test("Returns LiveSpineClient when useMtlsSpineClient is false and liveMode is true", () => {
    process.env.MTLS_SPINE_CLIENT = "false"
    process.env.SANDBOX = "0"
    const spineClient: SpineClient = getSpineClient()
    expect(spineClient).toBeInstanceOf(LiveSpineClient)
  })

  test("Returns SandboxSpineClient when useMtlsSpineClient is false and liveMode is false", () => {
    process.env.MTLS_SPINE_CLIENT = "false"
    process.env.SANDBOX = "1"
    const spineClient: SpineClient = getSpineClient()
    expect(spineClient).toBeInstanceOf(SandboxSpineClient)
  })
})
