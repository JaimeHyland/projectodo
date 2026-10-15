import { apiUrl } from "./api";

export type CourseIssue = {
  type: string;
  course_id?: number;
  meeting_id?: number | null;
  severity?: string;
  date?: string;
  start_time?: string;
  conflict?: { type: string; [field: string]: unknown };
  [field: string]: unknown;
};

export type CourseReadiness = {
  course_id: number;
  status: "draft" | "active" | "cancelled";
  ready_for_activation: boolean;
  eligible_for_activation: boolean;
  already_active: boolean;
  validation_passed: boolean;
  blocking_issue_count: number;
  warning_count: number;
  issues: CourseIssue[];
  warnings: CourseIssue[];
  [field: string]: unknown;
};

export class CourseReadinessError extends Error {
  constructor(
    public readonly kind: "authentication" | "permission" | "not_found" | "backend" | "network" | "invalid_response",
    public readonly status?: number,
    options?: ErrorOptions,
  ) {
    super(`Course readiness request failed: ${kind}`, options);
    this.name = "CourseReadinessError";
  }
}

export function isReadiness(value: unknown): value is CourseReadiness {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  const issues = (items: unknown) => Array.isArray(items) && items.every(item =>
    item && typeof item === "object" && typeof item.type === "string");
  return typeof data.course_id === "number"
    && ["draft", "active", "cancelled"].includes(String(data.status))
    && ["ready_for_activation", "eligible_for_activation", "already_active", "validation_passed"]
      .every(key => typeof data[key] === "boolean")
    && ["blocking_issue_count", "warning_count"].every(key =>
      typeof data[key] === "number" && Number.isInteger(data[key]) && data[key] >= 0)
    && issues(data.issues) && issues(data.warnings);
}

/** Read-only session-authenticated request. AbortError is preserved for callers. */
export async function getCourseReadiness(courseId: number, signal?: AbortSignal): Promise<CourseReadiness> {
  let response: Response;
  try {
    response = await fetch(apiUrl(`courses/${courseId}/readiness/`), {
      method: "GET", credentials: "include", cache: "no-store", signal,
    });
  } catch (error) {
    if (signal?.aborted || (error instanceof Error && error.name === "AbortError")) throw error;
    throw new CourseReadinessError("network", undefined, { cause: error });
  }
  if (!response.ok) {
    const kind = response.status === 401 ? "authentication" : response.status === 403
      ? "permission" : response.status === 404 ? "not_found" : "backend";
    throw new CourseReadinessError(kind, response.status);
  }
  let data: unknown;
  try { data = await response.json(); }
  catch (error) { throw new CourseReadinessError("invalid_response", response.status, { cause: error }); }
  if (!isReadiness(data)) throw new CourseReadinessError("invalid_response", response.status);
  return data;
}

export function canActivateCourse(readiness: CourseReadiness): boolean {
  return readiness.status === "draft" && readiness.eligible_for_activation
    && readiness.validation_passed && readiness.ready_for_activation;
}
export function getBlockingIssues(readiness: CourseReadiness): CourseIssue[] { return readiness.issues; }
export function getCourseWarnings(readiness: CourseReadiness): CourseIssue[] { return readiness.warnings; }
export function getCourseReadinessSummary(readiness: CourseReadiness) {
  return { canActivate: canActivateCourse(readiness), blockerCount: readiness.blocking_issue_count,
    warningCount: readiness.warning_count };
}

const issueKeys = {
  same_course: "sameCourse", instructor: "instructorConflict", place: "placeConflict",
  location: "locationConflict", missing_instructor: "missingInstructor", missing_place: "missingPlace",
  unresolved_proposal: "unresolvedProposal", invalid_meeting: "invalidMeeting", invalid_course: "invalidCourse",
  calendar_unavailable: "holidayUnavailable", holiday_data_unavailable: "holidayUnavailable",
  open_instructor: "openInstructor", open_place: "openPlace",
} as const;

/** Index the locale's admin-dashboard.courseIssues dictionary with this key. */
export function getCourseIssueMessageKey(issue: CourseIssue): typeof issueKeys[keyof typeof issueKeys] | "unknown" {
  const type = issue.type === "conflict" ? issue.conflict?.type : issue.type;
  return type && Object.hasOwn(issueKeys, type) ? issueKeys[type as keyof typeof issueKeys] : "unknown";
}
