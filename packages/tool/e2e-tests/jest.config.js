module.exports = {
  preset: "ts-jest",
  testEnvironment: "./seleniumEnvironment.ts",
  testTimeout: 3600000,
  globals: {
    hasTestFailures: false,
  },
  reporters: [ "default", "jest-junit" ]
}
