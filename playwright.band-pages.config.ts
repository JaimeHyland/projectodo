import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests", testMatch: "band-pages.spec.ts", workers: 1, reporter: "list",
  use: { baseURL: "http://127.0.0.1:3103", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    { command: "node tests/fixtures/band-pages-backend.mjs", url: "http://127.0.0.1:8126/api/auth/status/" },
    {
      command: "node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3103",
      url: "http://127.0.0.1:3103/en/bands/test-band/", timeout: 120000,
      env: { API_BASE_URL: "http://127.0.0.1:8126", NEXT_PUBLIC_API_BASE_URL: "http://127.0.0.1:8126", NEXT_TEST_DIST_DIR: ".next/band-page-tests" },
    },
  ],
});
