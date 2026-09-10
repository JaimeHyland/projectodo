import { test, expect } from "@playwright/test";
import { activateCourse } from "../src/lib/course-activation";

const originalFetch = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = originalFetch; });
const payload = {
  course_id: 7, status: "draft", eligible_for_activation: true, already_active: false,
  ready_for_activation: false, validation_passed: false, blocking_issue_count: 1, warning_count: 1,
  issues: [{ type: "future_issue", detail: { keep: true } }], warnings: [{ type: "open_place" }],
  ok: false, activated: false,
};
test("activation retains structured rejection and uses session/CSRF request conventions", async () => {
  // csrfJsonHeaders reads the browser cookie; provide only that browser interface.
  const oldDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", { configurable: true, value: { cookie: "csrftoken=unit-token" } });
  try {
    globalThis.fetch = async (url, init) => {
      expect(url).toBe("/api/courses/7/activate/");
      expect(init).toMatchObject({ method: "POST", credentials: "include", headers: { "X-CSRFToken": "unit-token" } });
      return Response.json(payload, { status: 400 });
    };
    expect(await activateCourse(7)).toEqual(payload);
    globalThis.fetch = async () => Response.json({ ...payload, status: "cancelled", error: { type: "course_cancelled" } }, { status: 409 });
    await expect(activateCourse(7)).rejects.toMatchObject({ kind: "cancelled", result: { warnings: payload.warnings } });
    globalThis.fetch = async () => Response.json({ ...payload, course_id: 8 });
    await expect(activateCourse(7)).rejects.toMatchObject({ kind: "invalid_response" });
  } finally {
    if (oldDocument) Object.defineProperty(globalThis, "document", oldDocument);
    else Reflect.deleteProperty(globalThis, "document");
  }
});
