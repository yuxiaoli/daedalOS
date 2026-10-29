// Storage-only integration tests: no application server or existing profile.
const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./e2e",
  testMatch: "welcomeIndexedDB.spec.js",
  fullyParallel: true,
  timeout: 30000,
  retries: 0,
  reporter: "list",
  use: { serviceWorkers: "block" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
