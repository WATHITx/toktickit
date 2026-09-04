import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: "http://localhost:5173",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: [
    {
      command: "npm run dev --prefix server",
      url: "http://localhost:3000/api/health",
      reuseExistingServer: true,
      timeout: 30000,
    },
    {
      command: "npm run dev --prefix client",
      url: "http://localhost:5173",
      reuseExistingServer: true,
      timeout: 30000,
    },
  ],
});