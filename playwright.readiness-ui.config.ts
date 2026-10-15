import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: ["course-readiness-ui.spec.ts", "meeting-resolution-ui.spec.ts", "course-activation-ui.spec.ts"],
  workers: 1,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:3101", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    { command: "node tests/fixtures/admin-backend.mjs", url: "http://127.0.0.1:8124/api/auth/status/", reuseExistingServer: !process.env.CI },
    {
      command: "node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3101",
      url: "http://127.0.0.1:3101/en/admin-dashboard/",
      timeout: 120000,
      env: { API_BASE_URL: "http://127.0.0.1:8124", NEXT_PUBLIC_API_BASE_URL: "http://127.0.0.1:8124",
        NEXT_TEST_DIST_DIR: ".next/admin-tests" },
    },
  ],
});
