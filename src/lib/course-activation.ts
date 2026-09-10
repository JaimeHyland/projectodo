import { apiUrl } from "./api";
import { csrfJsonHeaders } from "./csrf";
import { isReadiness, type CourseReadiness } from "./course-readiness";

export type CourseActivationResult = CourseReadiness & {
  ok: boolean; activated: boolean; error?: { type: string };
};
export class CourseActivationError extends Error {
  constructor(public readonly kind: "authentication" | "permission" | "not_found" | "cancelled" | "backend" | "network" | "invalid_response",
    public readonly result?: CourseActivationResult) { super(kind); }
}
export async function activateCourse(id: number): Promise<CourseActivationResult> {
  let response: Response;
  try {
    response = await fetch(apiUrl(`courses/${id}/activate/`), {
      method: "POST", credentials: "include", headers: csrfJsonHeaders(), cache: "no-store",
    });
  } catch { throw new CourseActivationError("network"); }
  if ([401, 403, 404].includes(response.status)) throw new CourseActivationError(
    response.status === 401 ? "authentication" : response.status === 403 ? "permission" : "not_found");
  if (response.status >= 500) throw new CourseActivationError("backend");
  let value: unknown;
  try { value = await response.json(); } catch { throw new CourseActivationError("invalid_response"); }
  if (!isReadiness(value) || value.course_id !== id || typeof value.ok !== "boolean" || typeof value.activated !== "boolean") {
    throw new CourseActivationError("invalid_response");
  }
  const result = value as CourseActivationResult;
  if (response.status === 409 && result.status === "cancelled" && result.error?.type === "course_cancelled") {
    throw new CourseActivationError("cancelled", result);
  }
  if (response.ok && result.ok && result.status === "active") return result;
  if (response.status === 400 && !result.ok && result.status === "draft") return result;
  throw new CourseActivationError("invalid_response");
}
