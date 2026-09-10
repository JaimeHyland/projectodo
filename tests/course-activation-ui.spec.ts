import { test, expect, type Page } from "@playwright/test";
import en from "../src/messages/admin-dashboard/en.json";
import de from "../src/messages/admin-dashboard/de.json";
import es from "../src/messages/admin-dashboard/es.json";

async function setup(page: Page, locale: "en" | "de" | "es" = "en") {
  const messages = { en, de, es }[locale];
  const labels = messages.courseActivation;
  const state = { status: "draft", ready: true, warnings: true, reads: 0, posts: 0,
    response: "success", hold: Promise.resolve(), holdReadiness: Promise.resolve(), readinessFails: false, csrf: "" };
  const payload = () => ({ course_id: 7, status: state.status, eligible_for_activation: state.status === "draft",
    validation_passed: state.ready, ready_for_activation: state.status === "draft" && state.ready,
    already_active: state.status === "active", blocking_issue_count: state.ready ? 0 : 1,
    warning_count: state.warnings ? 1 : 0, issues: state.ready ? [] : [{ type: "unresolved_proposal", meeting_id: null }],
    warnings: state.warnings ? [{ type: "open_place", meeting_id: null }] : [] });
  await page.context().addCookies([{ name: "csrftoken", value: "activation-csrf", url: "http://127.0.0.1:3101" }]);
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/readiness/")) {
      state.reads++;
      await state.holdReadiness;
      return route.fulfill({ status: state.readinessFails ? 503 : 200, json: payload() });
    }
    if (path.endsWith("/activate/")) {
      expect(route.request().method()).toBe("POST");
      state.posts++; state.csrf = route.request().headers()["x-csrftoken"];
      await state.hold;
      if (state.response === "network") return route.abort();
      if (["401", "403", "500"].includes(state.response)) return route.fulfill({ status: Number(state.response), json: {} });
      if (state.response === "malformed") return route.fulfill({ json: { ok: true } });
      if (state.response === "rejected") {
        state.ready = false;
        return route.fulfill({ status: 400, json: { ...payload(), ok: false, activated: false } });
      }
      if (state.response === "cancelled") {
        state.status = "cancelled";
        return route.fulfill({ status: 409, json: { ...payload(), ok: false, activated: false, error: { type: "course_cancelled" } } });
      }
      state.status = "active";
      return route.fulfill({ json: { ...payload(), ok: true, activated: state.response !== "already",
        already_active: state.response === "already" } });
    }
    if (path.endsWith("/locations/1/courses/")) return route.fulfill({ json: { courses: [{ id: 7, name: "Test course",
      status: state.status, subject: "guitar", course_type: "group", meetings_created: true }] } });
    return route.fulfill({ json: { is_authenticated: true, username: "test-admin", is_superuser: true, groups: [] } });
  });
  async function open() {
    await page.goto(`/${locale}/admin-dashboard/`);
    await page.getByRole("button", { name: messages.sectionLocations, exact: true }).click();
    await page.getByRole("button", { name: messages.manageCourses, exact: true }).click();
  }
  const panel = page.getByRole("region", { name: messages.courseReadiness.check });
  const button = panel.getByRole("button", { name: labels.activate, exact: true });
  async function confirm() { await button.click(); await panel.getByRole("button", { name: labels.confirm, exact: true }).click(); }
  return { state, open, panel, button, confirm, messages, labels };
}

for (const locale of ["en", "de", "es"] as const) {
  test(`${locale}: activation with warnings confirms, refreshes and prevents duplicate requests`, async ({ page }) => {
    const { state, open, panel, button, labels, messages } = await setup(page, locale);
    await open();
    await expect(button).toBeEnabled();
    await button.click();
    await expect(panel.getByText(labels.confirmText)).toBeVisible();
    await expect(panel.getByText(messages.courseIssues.openPlace)).toBeVisible();
    let release!: () => void;
    state.hold = new Promise(resolve => { release = resolve; });
    let navigations = 0;
    page.on("framenavigated", frame => { if (frame === page.mainFrame()) navigations++; });
    await panel.getByRole("button", { name: labels.confirm, exact: true }).evaluate((b: HTMLButtonElement) => { b.click(); b.click(); });
    await expect.poll(() => state.posts).toBe(1);
    await expect(panel.getByRole("button", { name: labels.activating, exact: true })).toBeDisabled();
    expect(state.status).toBe("draft");
    if (locale === "en") {
      const disclosure = page.getByRole("button", { name: messages.courseReadiness.check, exact: true });
      await disclosure.click();
      await disclosure.click();
      await expect(panel.getByRole("button", { name: labels.activating, exact: true })).toBeDisabled();
      expect(state.posts).toBe(1);
    }
    release();
    await expect(panel.getByText(labels.success, { exact: true })).toBeVisible();
    await expect(button).toHaveCount(0);
    await expect(panel.getByText(`${messages.courseReadiness.status}: ${messages.courseReadiness.active}`)).toBeVisible();
    await expect(panel.getByText(messages.courseIssues.openPlace)).toBeVisible();
    await expect(panel.getByText(labels.success, { exact: true })).toBeFocused();
    expect(state.reads).toBeGreaterThan(1);
    expect(state.posts).toBe(1);
    expect(state.csrf).toBe("activation-csrf");
    expect(navigations).toBe(0);
  });
}
test("blocked, loading and failed readiness cannot activate", async ({ page }) => {
  const { state, open, panel, button, messages, labels } = await setup(page);
  let release!: () => void;
  state.holdReadiness = new Promise(resolve => { release = resolve; });
  await open();
  await expect(button).toBeDisabled();
  state.ready = false; release();
  await expect(panel.getByText(labels.blocked)).toBeVisible();
  await expect(button).toBeDisabled();
  state.readinessFails = true;
  await panel.getByRole("button", { name: messages.courseReadiness.refresh }).click();
  await expect(panel.getByText(messages.courseReadiness.error)).toBeVisible();
  await expect(button).toBeDisabled();
  expect(state.posts).toBe(0);
});
test("ready draft without warnings can activate", async ({ page }) => {
  const { state, open, button } = await setup(page);
  state.warnings = false;
  await open();
  await expect(button).toBeEnabled();
});
for (const status of ["active", "cancelled"]) {
  test(`${status} has no activation action`, async ({ page }) => {
    const { state, open, button } = await setup(page);
    state.status = status;
    await open();
    await expect(button).toHaveCount(0);
    expect(state.posts).toBe(0);
  });
}
for (const response of ["rejected", "already", "cancelled", "401", "403", "network", "500", "malformed"]) {
  test(`handles activation ${response}`, async ({ page }) => {
    const { state, open, panel, button, confirm, labels, messages } = await setup(page);
    state.response = response;
    await open(); await expect(button).toBeEnabled(); await confirm();
    const feedback = response === "rejected" ? labels.changed : response === "already" ? labels.alreadyActive
      : response === "cancelled" ? labels.cancelled : response === "401" ? labels.authentication
        : response === "403" ? labels.permission : labels.failed;
    await expect(response === "already" ? panel.getByText(feedback, { exact: true }) : panel.getByRole("alert")).toHaveText(feedback);
    await expect.poll(() => state.reads).toBeGreaterThan(1);
    if (response === "already" || response === "cancelled") await expect(button).toHaveCount(0);
    else {
      expect(state.status).toBe("draft");
      if (response === "rejected") {
        await expect(button).toBeDisabled();
        await expect(panel.getByText(messages.courseIssues.unresolvedProposal)).toBeVisible();
      }
    }
  });
}
