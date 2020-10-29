import {getUniqueValues} from "../../../src/services/validation/util"

describe("getUniqueValues returns correct values", () => {
  test("when input is empty", () => {
    const uniqueValues = getUniqueValues([])
    expect(uniqueValues.length).toBe(1)
    expect(uniqueValues).toContain(undefined)
  })

  test("when all values are identical primitives", () => {
    const uniqueValues = getUniqueValues([23, 23, 23])
    expect(uniqueValues.length).toBe(1)
    expect(uniqueValues).toContain(23)
  })

  test("when values are primitives and not all equal", () => {
    const uniqueValues = getUniqueValues([23, 56, 56, 23])
    expect(uniqueValues.length).toBe(2)
    expect(uniqueValues).toContain(23)
    expect(uniqueValues).toContain(56)
  })

  test("when all values are identical objects", () => {
    const uniqueValues = getUniqueValues([{key: "value"}, {key: "value"}, {key: "value"}])
    expect(uniqueValues.length).toBe(1)
    expect(uniqueValues).toContainEqual({key: "value"})
  })

  test("when values are objects and not all equal", () => {
    const uniqueValues = getUniqueValues([{key: "value"}, {key1: "value"}, {key: "value1"}, {key: "value"}])
    expect(uniqueValues.length).toBe(3)
    expect(uniqueValues).toContainEqual({key: "value"})
    expect(uniqueValues).toContainEqual({key1: "value"})
    expect(uniqueValues).toContainEqual({key: "value1"})
  })
})
