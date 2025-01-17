if (
  typeof globalThis.TextEncoder === "undefined" ||
  typeof globalThis.TextDecoder === "undefined"
) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const utils = require("util")
  globalThis.TextEncoder = utils.TextEncoder
  globalThis.TextDecoder = utils.TextDecoder
  globalThis.Uint8Array = Uint8Array
}
