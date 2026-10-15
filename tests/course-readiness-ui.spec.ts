import { test, expect } from "@playwright/test";
import en from "../src/messages/admin-dashboard/en.json";
import de from "../src/messages/admin-dashboard/de.json";
import es from "../src/messages/admin-dashboard/es.json";

for (const locale of ["en", "de", "es"] as const) {
  test(`${locale}: shows reasons and warnings, refreshes and supports keyboard disclosure`, async ({ page }) => {
    const messages = { en, de, es }[locale];
    let fail = false;
    let status = "draft";
    let httpStatus = 503;
    let ready = false;
    let release!: () => void;
    let hold = Promise.resolve();
    const mutations: string[] = [];
    await page.route("**/api/**", async route => {
      const path = new URL(route.request().url()).pathname;
      if (route.request().method() !== "GET") mutations.push(path);
      if (path.endsWith("/7/update/")) { ready = true; return route.fulfill({ json: { ok: true } }); }
      if (path.endsWith("/readiness/")) {
        await hold;
        return route.fulfill({ status: fail ? httpStatus : 200, json: {
          course_id: 7, status, eligible_for_activation: true, already_active: false,
          validation_passed: ready, ready_for_activation: ready, blocking_issue_count: ready ? 0 : 3,
          warning_count: 2, issues: ready ? [] : [
            { type: "conflict", conflict: { type: "instructor" }, date: "2026-10-01", start_time: "15:00:00" },
            { type: "future_type", date: "2026-11-01" },
            { type: "missing_place", date: "2026-09-01" },
          ], warnings: [{ type: "open_place" }, { type: "open_instructor" }],
        } });
      }
      if (path.endsWith("/locations/1/courses/")) return route.fulfill({ json: {
        courses: [{ id: 7, name: "Test course", status: "draft", subject: "guitar", course_type: "group", meetings_created: true, start_date: "2026-10-01", start_time: "15:00:00", duration_type: "one_off", term_type: "all_year", duration_minutes: 60, max_participants: 5, days_of_week: "", default_place: null }],
      } });
      return route.fulfill({ json: { is_authenticated: true, username: "test-admin", is_superuser: true, groups: [] } });
    });
    hold = new Promise(resolve => { release = resolve; });
    await page.goto(`/${locale}/admin-dashboard/`);
    await page.getByRole("button", { name: messages.sectionLocations, exact: true }).click();
    await page.getByRole("button", { name: messages.manageCourses, exact: true }).click();
    const button = page.getByRole("button", { name: messages.courseReadiness.check, exact: true });
    await expect(button).toHaveAttribute("aria-expanded", "true");
    const panel = page.getByRole("region", { name: messages.courseReadiness.check });
    await expect(panel.getByRole("status")).toHaveText(messages.courseReadiness.loading);
    release();
    await expect(panel.getByRole("heading", { name: messages.courseReadiness.blockers })).toBeVisible();
    await expect(panel.getByText(messages.courseIssues.instructorConflict, { exact: false })).toBeVisible();
    await expect(panel.getByText(messages.courseIssues.unknown)).toBeVisible();
    await expect(panel.getByRole("heading", { name: messages.courseReadiness.warnings })).toBeVisible();
    await expect(panel.getByText(messages.courseIssues.openPlace)).toBeVisible();
    await expect(panel.getByText("(2026-10-01 15:00)")).toBeVisible();
    await expect(panel.getByText(messages.courseIssues.openInstructor)).toBeVisible();
    await expect(panel.getByText(`${messages.courseReadiness.blockers}: 3`, { exact: false })).toBeVisible();
    const issues = panel.locator("ul").first().getByRole("listitem");
    await expect(issues.nth(0)).toContainText(messages.courseIssues.missingPlace);
    await expect(issues.nth(1)).toContainText(messages.courseIssues.instructorConflict);
    await expect(issues.nth(2)).toContainText(messages.courseIssues.unknown);
    for (const [code, label] of [[401, messages.courseReadiness.authenticationError], [403, messages.courseReadiness.permissionError], [404, messages.courseReadiness.notFoundError]] as const) {
      fail = true; httpStatus = code;
      await panel.getByRole("button", { name: messages.courseReadiness.refresh }).click();
      await expect(panel.getByRole("alert")).toHaveText(label);
    }
    httpStatus = 503;
    fail = true;
    await panel.getByRole("button", { name: messages.courseReadiness.refresh }).click();
    await expect(panel.getByRole("alert")).toHaveText(messages.courseReadiness.error);
    await expect(panel.getByText(messages.courseReadiness.notReady)).toHaveCount(0);
    fail = false;
    ready = true;
    await panel.getByRole("button", { name: messages.courseReadiness.refresh }).click();
    await expect(panel.getByRole("status")).toHaveText(messages.courseReadiness.ready);
    await expect(panel.getByRole("heading", { name: messages.courseReadiness.blockers })).toHaveCount(0);
    for (const nextStatus of ["active", "cancelled"]) {
      status = nextStatus;
      await panel.getByRole("button", { name: messages.courseReadiness.refresh }).click();
      await expect(panel.getByRole("status")).toHaveText(nextStatus === "active" ? messages.courseReadiness.valid : messages.courseReadiness.cancelled);
    }
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(panel).toHaveCount(0);
    await expect(button).toBeFocused();
    expect(mutations).toEqual([]);
    status = "draft";
    ready = false;
    await page.getByRole("button", { name: messages.edit, exact: true }).last().click();
    await expect(panel.getByRole("status")).toHaveText(messages.courseReadiness.notReady);
    await page.getByLabel(messages.courseName, { exact: true }).fill("Edited course");
    await page.getByRole("button", { name: messages.confirm, exact: true }).click();
    await expect(panel.getByRole("status")).toHaveText(messages.courseReadiness.ready);
    expect(mutations).toEqual(["/api/courses/7/update/"]);
  });
}
