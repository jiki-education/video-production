require("dotenv").config({ path: ".env.test" });

module.exports = {
  preset: "jest-puppeteer",
  testEnvironment: "jest-environment-puppeteer",
  testMatch: ["**/test/e2e/**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          esModuleInterop: true,
          allowSyntheticDefaultImports: true
        }
      }
    ]
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1"
  },
  setupFilesAfterEnv: ["<rootDir>/test/e2e/setup.ts"],
  testTimeout: 15000
};
