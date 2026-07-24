import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  projects: [
    { name: "chromium-desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } }
  ],
  webServer: [
    {
      command: "pnpm --filter @evetev/api build && pnpm --filter @evetev/api start",
      cwd: "../..",
      port: 4000,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { APP_ENV: "test", PAYMENT_PROVIDER: "mock", API_PORT: "4000" }
    },
    {
      command: "pnpm --filter @evetev/eve-habitat dev",
      cwd: "../..",
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000
    }
  ]
});
