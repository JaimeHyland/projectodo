import { test, expect, type Page } from "@playwright/test";
import en from "../src/messages/admin-dashboard/en.json";
import de from "../src/messages/admin-dashboard/de.json";
import es from "../src/messages/admin-dashboard/es.json";
import { meetingChanges, meetingForm, type ResolvedMeeting } from "../src/lib/meeting-resolution";
import type { CourseIssue } from "../src/lib/course-readiness";

function initialMeeting(): ResolvedMeeting {
  return { id: 12, course_id: 7, course_status: "draft", date: "2026-10-01", start_time: "15:00:00",
    duration_minutes: 60, cancelled: false, instructor_source: "inherited", instructor_id: 1,
    instructor_open_accepted: false, place_state: "inherit", place_id: null, default_place_id: 10,
    effective_place_id: 10, location_id: 1, place_open_accepted: false, start_datetime: "2026-10-01T15:00:00+02:00",
    is_past: false, timezone: "Europe/Berlin", course_defaults: { instructor_id: 1, place_id: 10, location_id: 1 },
    issues: [{ type: "conflict", meeting_id: 12, date: "2026-10-01", start_time: "15:00:00",
      conflict: { type: "place", place_id: 10, instructor_id: 2, location_id: 1, date: "2026-10-01", start_time: "15:15:00" } }], warnings: [] };
}
async function setup(page: Page, locale: "en" | "de" | "es" = "en") {
  const messages = { en, de, es }[locale];
  const state = { meeting: initialMeeting(), reads: 0, patches: [] as Record<string, unknown>[], reject: false,
    getStatus: 200, malformed: false, network: false, hold: Promise.resolve(), csrf: "", mutations: [] as string[] };
  await page.context().addCookies([{ name: "csrftoken", value: "resolution-csrf", url: "http://127.0.0.1:3101" }]);
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() !== "GET") state.mutations.push(path);
    if (path.endsWith("/meetings/12/")) {
      if (route.request().method() === "GET") {
        await state.hold;
        if (state.network) return route.abort();
        return route.fulfill({ status: state.getStatus, json: state.malformed ? {} : { ok: true, meeting: state.meeting } });
      }
      expect(route.request().method()).toBe("PATCH");
      const patch = route.request().postDataJSON();
      state.patches.push(patch);
      state.csrf = route.request().headers()["x-csrftoken"];
      await state.hold;
      if (state.reject) return route.fulfill({ status: 400, json: { ok: false, errors: state.meeting.issues } });
      const m = state.meeting;
      for (const resource of ["instructor", "place"] as const) {
        const action = patch[`${resource}_action`];
        if (resource === "instructor" && action) {
          m.instructor_source = action === "inherit" ? "inherited" : action;
          m.instructor_id = action === "inherit" ? 1 : action === "open" ? null : patch.instructor_id;
        }
        if (resource === "place" && action) {
          m.place_state = action; m.place_id = action === "override" ? patch.place_id : null;
          m.effective_place_id = action === "inherit" ? 10 : m.place_id;
          m.location_id = action === "override" && patch.place_id === 20 ? 2 : 1;
        }
        if (action) m[`${resource}_open_accepted`] = false;
        if (`${resource}_open_accepted` in patch) m[`${resource}_open_accepted`] = patch[`${resource}_open_accepted`];
      }
      for (const key of ["date", "start_time", "duration_minutes", "cancelled"]) if (key in patch) Object.assign(m, { [key]: patch[key] });
      m.issues = [];
      m.warnings = m.cancelled ? [] : [
        ...(m.instructor_source === "open" ? [{ type: "open_instructor", meeting_id: 12 }] : []),
        ...(m.place_state === "open" ? [{ type: "open_place", meeting_id: 12 }] : []),
      ];
      return route.fulfill({ json: { ok: true, meeting: m } });
    }
    if (path.endsWith("/readiness/")) {
      state.reads++;
      return route.fulfill({ json: { course_id: 7, status: state.meeting.course_status, ready_for_activation: false,
        eligible_for_activation: true, validation_passed: false, already_active: false,
        blocking_issue_count: state.meeting.issues.length + 1 + Number(state.patches.length > 0), warning_count: state.meeting.warnings.length,
        issues: [...state.meeting.issues, ...(state.patches.length ? [{ type: "missing_place", meeting_id: 99 }] : []), { type: "unresolved_proposal", date: "2026-11-01", meeting_id: null }], warnings: state.meeting.warnings } });
    }
    if (path.endsWith("/locations/1/courses/")) return route.fulfill({ json: { courses: [{ id: 7,
      name: "Test course", status: state.meeting.course_status, subject: "guitar", course_type: "group", meetings_created: true }] } });
    if (path.endsWith("/auth/users/")) return route.fulfill({ json: { users: [{ id: 1, username: "Teacher One" }, { id: 2, username: "Teacher Two" }] } });
    if (path.endsWith("/courses/locations/")) return route.fulfill({ json: { locations: [
      { id: 1, name: "Test studio", places: [{ id: 10, name: "Room A", location: 1 }, { id: 11, name: "Room B", location: 1 }] },
      { id: 2, name: "Other studio", places: [{ id: 20, name: "Room C", location: 2 }] },
    ] } });
    return route.fulfill({ json: { is_authenticated: true, username: "test-admin", is_superuser: true, groups: [] } });
  });
  const panel = page.getByRole("region", { name: messages.courseReadiness.check });
  const dialog = page.getByRole("dialog", { name: messages.meetingEditor.title });
  async function open() {
    await page.goto(`/${locale}/admin-dashboard/`);
    await page.getByRole("button", { name: messages.sectionLocations, exact: true }).click();
    await page.getByRole("button", { name: messages.manageCourses, exact: true }).click();
    await expect(panel.getByRole("button", { name: messages.meetingEditor.title }).first()).toBeVisible();
    await panel.getByRole("button", { name: messages.meetingEditor.title }).first().click();
  }
  return { state, open, panel, dialog, labels: messages.meetingEditor, messages };
}

for (const locale of ["en", "de", "es"] as const) {
  test(`${locale}: resolves one meeting with explicit actions and refreshes readiness`, async ({ page }) => {
    const { state, open, dialog, panel, labels, messages } = await setup(page, locale);
    await open();
    await expect(dialog.getByRole("combobox", { name: labels.instructorState, exact: true })).toHaveValue("inherit");
    await expect(dialog.getByRole("combobox", { name: labels.placeState, exact: true })).toHaveValue("inherit");
    await expect(dialog.getByText("2026-10-01 15:15", { exact: false })).toBeVisible();
    await dialog.getByRole("combobox", { name: labels.instructorState, exact: true }).selectOption("override");
    await dialog.getByRole("combobox", { name: labels.instructor, exact: true }).selectOption("2");
    await dialog.getByRole("combobox", { name: labels.placeState, exact: true }).selectOption("override");
    await dialog.getByRole("combobox", { name: labels.place, exact: true }).selectOption("20");
    await dialog.getByLabel(labels.date, { exact: true }).fill("2026-10-02");
    await dialog.getByLabel(labels.time, { exact: true }).fill("16:30:00");
    await dialog.getByLabel(labels.duration, { exact: true }).fill("75");
    await dialog.getByRole("button", { name: labels.save, exact: true }).click();
    await expect(dialog.getByRole("status")).toHaveText(labels.saved);
    expect(state.patches[0]).toEqual({ instructor_action: "override", instructor_id: 2, place_action: "override", place_id: 20,
      date: "2026-10-02", start_time: "16:30:00", duration_minutes: 75 });
    expect(state.csrf).toBe("resolution-csrf");
    expect(state.reads).toBeGreaterThan(1);
    await expect(dialog.getByText(`${labels.meetingLocation}: Other studio`)).toBeVisible();
    await expect(panel.getByText(messages.courseIssues.placeConflict)).toHaveCount(0);
    for (const [resource, stateLabel, accept] of [["instructor", labels.instructorState, labels.acceptInstructor], ["place", labels.placeState, labels.acceptPlace]] as const) {
      await dialog.getByRole("combobox", { name: stateLabel, exact: true }).selectOption("open");
      await expect(dialog.getByLabel(accept, { exact: true })).not.toBeChecked();
      await expect(dialog.getByText(labels.pastNote).first()).toBeVisible();
      await dialog.getByRole("button", { name: labels.save, exact: true }).click();
      await expect(dialog.getByRole("status")).toHaveText(labels.saved);
      expect(state.patches.at(-1)).toEqual({ [`${resource}_action`]: "open", [`${resource}_open_accepted`]: false });
      await dialog.getByLabel(accept, { exact: true }).check();
      await dialog.getByRole("button", { name: labels.save, exact: true }).click();
      await expect(dialog.getByRole("status")).toHaveText(labels.saved);
      expect(state.patches.at(-1)).toEqual({ [`${resource}_open_accepted`]: true });
      await dialog.getByRole("combobox", { name: stateLabel, exact: true }).selectOption("inherit");
      await dialog.getByRole("button", { name: labels.save, exact: true }).click();
      await expect(dialog.getByRole("status")).toHaveText(labels.saved);
      expect(state.patches.at(-1)).toEqual({ [`${resource}_action`]: "inherit" });
    }
    for (const cancelled of [true, false]) {
      await dialog.getByLabel(labels.cancelled, { exact: true }).setChecked(cancelled);
      await dialog.getByRole("button", { name: labels.save, exact: true }).click();
      await expect(dialog.getByRole("status")).toHaveText(labels.saved);
      expect(state.patches.at(-1)).toEqual({ cancelled });
    }
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(panel.getByRole("button", { name: messages.courseReadiness.check, exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: messages.courseReadiness.check, exact: true })).toBeFocused();
    expect(state.mutations.every(path => path === "/api/courses/meetings/12/")).toBe(true);
  });
}

test("active edit rejection preserves input and prevents duplicate submissions", async ({ page }) => {
  const { state, open, dialog, labels } = await setup(page);
  state.meeting.course_status = "active";
  state.meeting.is_past = true;
  state.reject = true;
  await open();
  await dialog.getByRole("combobox", { name: labels.instructorState, exact: true }).selectOption("open");
  await expect(dialog.getByText(labels.pastNote)).toBeVisible();
  await dialog.getByLabel(labels.duration, { exact: true }).fill("90");
  let release!: () => void;
  state.hold = new Promise(resolve => { release = resolve; });
  await dialog.getByRole("button", { name: labels.save, exact: true }).evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  await expect.poll(() => state.patches.length).toBe(1);
  await expect(dialog.getByRole("button", { name: labels.saving, exact: true })).toBeDisabled();
  release();
  await expect(dialog.getByRole("alert")).toContainText(labels.saveFailed);
  await expect(dialog.getByLabel(labels.duration, { exact: true })).toHaveValue("90");
  await expect(dialog.getByRole("combobox", { name: labels.instructorState, exact: true })).toHaveValue("open");
  expect(state.meeting.duration_minutes).toBe(60);
});

for (const scenario of [401, 403, 404, 500, "network", "malformed"] as const) {
  test(`meeting load handles ${scenario} and retry`, async ({ page }) => {
    const { state, open, dialog, labels } = await setup(page);
    if (typeof scenario === "number") state.getStatus = scenario;
    else if (scenario === "network") state.network = true;
    else state.malformed = true;
    let release!: () => void;
    state.hold = new Promise(resolve => { release = resolve; });
    await open();
    await expect(dialog.getByRole("status")).toHaveText(labels.loading);
    release();
    await expect(dialog.getByRole("alert")).toHaveText(scenario === 401 ? labels.authentication : scenario === 403 ? labels.permission : scenario === 404 ? labels.notFound : labels.loadFailed);
    state.getStatus = 200; state.network = false; state.malformed = false;
    await dialog.getByRole("button", { name: labels.retry }).click();
    await expect(dialog.getByLabel(labels.date, { exact: true })).toHaveValue("2026-10-01");
  });
}

test("PATCH diff preserves unchanged data and explicit acceptance", () => {
  const meeting = initialMeeting();
  const form = meetingForm(meeting);
  expect(meetingChanges(meeting, form)).toEqual({});
  expect(meetingChanges(meeting, { ...form, instructor_action: "open", instructor_open_accepted: true })).toEqual({ instructor_action: "open", instructor_open_accepted: true });
});

for (const locale of ["en", "de", "es"] as const) {
  test(`${locale}: follows refreshed blockers meeting by meeting and returns to ready state`, async ({ page }) => {
    const { state, open, dialog, panel, labels, messages } = await setup(page, locale);
    let issues: CourseIssue[] = [...state.meeting.issues];
    const opened: number[] = [];
    const mutations: string[] = [];
    await page.route("**/api/courses/7/readiness/", route => {
      state.reads++;
      return route.fulfill({ json: { course_id: 7, status: "draft", eligible_for_activation: true,
        already_active: false, validation_passed: issues.length === 0, ready_for_activation: issues.length === 0,
        blocking_issue_count: issues.length, warning_count: 1, issues,
        warnings: [{ type: "open_place", meeting_id: 100 }] } });
    });
    await page.route(/\/api\/courses\/meetings\/(13|14)\/$/, route => {
      const id = Number(new URL(route.request().url()).pathname.split("/").at(-2));
      if (route.request().method() === "GET") opened.push(id);
      else mutations.push(route.request().method());
      const meeting = { ...initialMeeting(), id, date: id === 14 ? "2026-10-02" : "2026-10-03",
        cancelled: route.request().method() === "PATCH" ? route.request().postDataJSON().cancelled ?? false : false,
        issues: issues.filter(issue => issue.meeting_id === id), warnings: [] };
      return route.fulfill({ json: { ok: true, meeting } });
    });
    await open();
    // Fresh readiness can disagree with PATCH diagnostics: remain on this meeting.
    issues = [{ type: "missing_instructor", meeting_id: 12 }, { type: "missing_place", meeting_id: 13 }];
    await dialog.getByRole("button", { name: labels.save, exact: true }).click();
    await expect(dialog.getByText(labels.stillBlocked)).toBeVisible();
    await expect(dialog.getByText(messages.courseIssues.missingInstructor)).toBeVisible();
    await expect(dialog.getByRole("button", { name: labels.next })).toHaveCount(0);
    // The new backend order differs from the previous response; duplicates count once.
    issues = [{ type: "missing_place", meeting_id: 14 }, { type: "missing_instructor", meeting_id: 14 },
      { type: "missing_place", meeting_id: 13 }, { type: "unresolved_proposal", meeting_id: null }];
    await dialog.getByRole("button", { name: labels.save, exact: true }).click();
    await expect(dialog.getByText(labels.remaining.replace("{count}", "2"))).toBeVisible();
    await expect(dialog.getByRole("button", { name: labels.next })).toBeFocused();
    // Same native dialog stays open during navigation.
    await dialog.evaluate(element => element.setAttribute("data-sequence-test", "same-dialog"));
    await page.keyboard.press("Enter");
    await expect(dialog).toHaveAttribute("data-sequence-test", "same-dialog");
    await expect(dialog.getByLabel(labels.date, { exact: true })).toHaveValue("2026-10-02");
    await expect(dialog.getByRole("heading", { level: 2 })).toBeFocused();
    expect(opened).toEqual([14]);
    issues = [{ type: "missing_place", meeting_id: 13 }];
    await dialog.getByLabel(labels.cancelled, { exact: true }).check();
    await dialog.getByRole("button", { name: labels.save, exact: true }).click();
    await expect(dialog.getByRole("button", { name: labels.next })).toBeEnabled();
    await dialog.getByRole("button", { name: labels.next }).click();
    await expect(dialog.getByLabel(labels.date, { exact: true })).toHaveValue("2026-10-03");
    issues = [];
    await dialog.getByRole("button", { name: labels.save, exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(panel.getByRole("button", { name: messages.courseActivation.activate, exact: true })).toBeEnabled();
    await expect(panel.getByText(messages.courseIssues.openPlace)).toBeVisible();
    expect(opened).toEqual([14, 13]);
    expect(mutations).toEqual(["PATCH", "PATCH"]);
  });
}

test("only non-editable blockers return to the panel; readiness errors never advance", async ({ page }) => {
  const { state, open, dialog, panel, labels, messages } = await setup(page);
  let fail = false;
  await page.route("**/api/courses/7/readiness/", route => route.fulfill({ status: fail ? 503 : 200, json: {
    course_id: 7, status: "draft", eligible_for_activation: true, already_active: false,
    validation_passed: false, ready_for_activation: false, blocking_issue_count: 1, warning_count: 0,
    issues: state.patches.length ? [{ type: "unresolved_proposal", meeting_id: null }] : state.meeting.issues, warnings: [],
  } }));
  await open();
  fail = true;
  await dialog.getByRole("button", { name: labels.save, exact: true }).click();
  await expect(dialog.getByText(labels.refreshFailed)).toBeVisible();
  await expect(dialog.getByRole("button", { name: labels.next })).toHaveCount(0);
  fail = false;
  await dialog.getByRole("button", { name: labels.retry }).click();
  await expect(dialog).toHaveCount(0);
  await expect(panel.getByText(messages.courseIssues.unresolvedProposal)).toBeVisible();
  await expect(panel.getByRole("button", { name: messages.courseActivation.activate, exact: true })).toBeDisabled();
  expect(state.patches.length).toBe(1);
});
