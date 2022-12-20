module.exports = {
  roots: ["./tests"],
  transform: {
    "^.+\\.tsx?$": "ts-jest"
  },
  testEnvironment: "node",
  testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  coveragePathIgnorePatterns: ["/node_modules/", "/tests/"],
  setupFiles: ["./jest/setEnvVars.js"],
  setupFilesAfterEnv: [
    "./tests/jest.setup.ts",
    "jest-expect-message"
  ],
  moduleNameMapper: {
    "@models": "<rootDir>../models"
  }
}
