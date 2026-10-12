import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  globalSetup: "./e2e/global-setup.ts",
  retries: 1,
  // Each worker runs its own Chromium on top of the dev servers and PostgreSQL. More than a couple of workers
  // exhausted memory on a 16 GB laptop and froze it, so run serially by default (override with --workers=N).
  workers: Number(process.env.PW_WORKERS) || 1,
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