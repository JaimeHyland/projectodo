import { test, expect } from "@playwright/test";
import { getCourseReadiness, canActivateCourse, getBlockingIssues, getCourseWarnings,
  getCourseReadinessSummary, getCourseIssueMessageKey, type CourseReadiness } from "../src/lib/course-readiness";
import en from "../src/messages/admin-dashboard/en.json";
import de from "../src/messages/admin-dashboard/de.json";
import es from "../src/messages/admin-dashboard/es.json";
import { meetingBlockerNavigation } from "../src/lib/meeting-blocker-navigation";

test("blocker navigation preserves backend order, deduplicates meetings and excludes warnings/proposals", () => {
  const readiness = { ...payload(), issues: [
    { type: "invalid_course" }, { type: "missing_place", meeting_id: 8 },
    { type: "missing_instructor", meeting_id: 8 }, { type: "conflict", meeting_id: 3 },
    { type: "unresolved_proposal", meeting_id: null },
  ], warnings: [{ type: "open_place", meeting_id: 1 }] };
  expect(meetingBlockerNavigation(readiness, 12)).toEqual({ currentBlocked: false, count: 2, nextId: 8 });
  expect(meetingBlockerNavigation(readiness, 3)).toEqual({ currentBlocked: true, count: 2, nextId: null });
  expect(meetingBlockerNavigation({ ...readiness, issues: [{ type: "unresolved_proposal" }] }, 12))
    .toEqual({ currentBlocked: false, count: 0, nextId: null });
});

const originalFetch = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = originalFetch; });
function payload(): CourseReadiness {
  return { course_id: 7, status: "draft", ready_for_activation: true,
    eligible_for_activation: true, already_active: false, validation_passed: true,
    blocking_issue_count: 0, warning_count: 0, issues: [], warnings: [] };
}
test("fetches readiness once with credentials and no mutation", async () => {
  const calls: unknown[] = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options }); return Response.json(payload());
  };
  const result = await getCourseReadiness(7);
  expect(result).toEqual(payload());
  expect(canActivateCourse(result)).toBe(true);
  expect(calls).toEqual([{ url: "/api/courses/7/readiness/", options: {
    method: "GET", credentials: "include", cache: "no-store", signal: undefined,
  } }]);
});
for (const type of ["same_course", "instructor", "place", "location", "unresolved_proposal",
  "missing_instructor", "missing_place", "invalid_meeting", "invalid_course", "calendar_unavailable",
  "holiday_data_unavailable", "future_backend_issue", "constructor"]) {
  test(`preserves and formats ${type}`, async () => {
    const issue = ["same_course", "instructor", "place", "location"].includes(type)
      ? { type: "conflict", conflict: { type, meeting_id: 42 }, meeting_id: 12 }
      : { type, meeting_id: 12, extra: { preserved: true } };
    const data = { ...payload(), issues: [issue], blocking_issue_count: 1,
      validation_passed: false, ready_for_activation: false };
    globalThis.fetch = async () => Response.json(data);
    const result = await getCourseReadiness(7);
    expect(getBlockingIssues(result)).toEqual([issue]);
    expect(getCourseReadinessSummary(result)).toEqual({ canActivate: false, blockerCount: 1, warningCount: 0 });
    const key = getCourseIssueMessageKey(issue);
    expect(key === "unknown").toBe(["future_backend_issue", "constructor"].includes(type));
    for (const messages of [en, de, es]) expect(messages.courseIssues[key]).toBeTruthy();
  });
}
test("open warnings retain details and do not block backend-approved activation", async () => {
  const warnings = [{ type: "open_instructor", meeting_id: 1 }, { type: "open_place", meeting_id: 2 }];
  globalThis.fetch = async () => Response.json({ ...payload(), warnings, warning_count: 2 });
  const result = await getCourseReadiness(7);
  expect(getCourseWarnings(result)).toEqual(warnings);
  expect(getCourseReadinessSummary(result)).toEqual({ canActivate: true, blockerCount: 0, warningCount: 2 });
  expect(warnings.map(getCourseIssueMessageKey)).toEqual(["openInstructor", "openPlace"]);
});
for (const status of ["active", "cancelled"] as const) {
  test(`${status} is ineligible`, () => {
    expect(canActivateCourse({ ...payload(), status, eligible_for_activation: false,
      ready_for_activation: false, already_active: status === "active" })).toBe(false);
  });
}
for (const field of ["eligible_for_activation", "validation_passed", "ready_for_activation"] as const) {
  test(`respects backend ${field}`, () => {
    expect(canActivateCourse({ ...payload(), [field]: false })).toBe(false);
  });
}
for (const [status, kind] of [[401, "authentication"], [403, "permission"], [404, "not_found"], [500, "backend"]] as const) {
  test(`distinguishes HTTP ${status} from not ready`, async () => {
    globalThis.fetch = async () => new Response("unavailable", { status });
    await expect(getCourseReadiness(7)).rejects.toMatchObject({ name: "CourseReadinessError", kind, status });
  });
}
test("network failures and malformed responses are errors", async () => {
  globalThis.fetch = async () => { throw new TypeError("offline"); };
  await expect(getCourseReadiness(7)).rejects.toMatchObject({ kind: "network" });
  globalThis.fetch = async () => Response.json({});
  await expect(getCourseReadiness(7)).rejects.toMatchObject({ kind: "invalid_response" });
  globalThis.fetch = async () => new Response("not JSON");
  await expect(getCourseReadiness(7)).rejects.toMatchObject({ kind: "invalid_response" });
});
test("preserves request cancellation", async () => {
  const controller = new AbortController();
  controller.abort();
  globalThis.fetch = async () => { throw controller.signal.reason; };
  await expect(getCourseReadiness(7, controller.signal)).rejects.toHaveProperty("name", "AbortError");
});
