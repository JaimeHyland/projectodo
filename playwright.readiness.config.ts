import { defineConfig } from "@playwright/test";

// Pure utility tests: no browser, application server or database required.
export default defineConfig({ testDir: "./tests", testMatch: ["course-readiness.spec.ts", "course-activation.spec.ts"], workers: 1 });
