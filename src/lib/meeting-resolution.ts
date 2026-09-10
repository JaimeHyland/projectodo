import { apiUrl } from "./api";
import { csrfJsonHeaders } from "./csrf";
import type { CourseIssue } from "./course-readiness";

export type AssignmentAction = "inherit" | "override" | "open";
export type ResolvedMeeting = {
  id: number; course_id: number; course_status: "draft" | "active" | "cancelled";
  date: string; start_time: string; duration_minutes: number; cancelled: boolean;
  instructor_source: "inherited" | "override" | "open";
  instructor_id: number | null; instructor_open_accepted: boolean;
  place_state: AssignmentAction; place_id: number | null; default_place_id: number | null;
  effective_place_id: number | null; location_id: number; place_open_accepted: boolean;
  start_datetime: string; is_past: boolean; timezone: string;
  course_defaults: { instructor_id: number | null; place_id: number | null; location_id: number };
  issues: CourseIssue[]; warnings: CourseIssue[];
};
export type MeetingPatch = Partial<Pick<ResolvedMeeting,
  "date" | "start_time" | "duration_minutes" | "cancelled" | "instructor_open_accepted" | "place_open_accepted">> & {
  instructor_action?: AssignmentAction; instructor_id?: number;
  place_action?: AssignmentAction; place_id?: number;
};
export type MeetingChoices = {
  users: { id: number; username: string }[];
  locations: { id: number; name: string; places: { id: number; name: string; location: number }[] }[];
};
export class MeetingRequestError extends Error {
  constructor(public readonly kind: "authentication" | "permission" | "not_found" | "network" | "backend" | "invalid_response" | "validation",
    public readonly issues: CourseIssue[] = []) { super(kind); }
}
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object";
const issues = (value: unknown): value is CourseIssue[] => Array.isArray(value)
  && value.every(item => object(item) && typeof item.type === "string");

async function request(path: string, init: RequestInit): Promise<Record<string, unknown>> {
  let response: Response;
  try { response = await fetch(apiUrl(path), { credentials: "include", cache: "no-store", ...init }); }
  catch (error) {
    if (init.signal?.aborted) throw error;
    throw new MeetingRequestError("network");
  }
  let data: unknown;
  try { data = await response.json(); } catch { data = null; }
  if (!response.ok) {
    const kind = response.status === 401 ? "authentication" : response.status === 403 ? "permission"
      : response.status === 404 ? "not_found" : response.status === 400 || response.status === 409 ? "validation" : "backend";
    throw new MeetingRequestError(kind, object(data) && issues(data.errors) ? data.errors : []);
  }
  if (!object(data)) throw new MeetingRequestError("invalid_response");
  return data;
}
function meetingResponse(data: Record<string, unknown>): ResolvedMeeting {
  const m = data.meeting;
  if (data.ok !== true || !object(m) || !object(m.course_defaults)
    || !(m.course_defaults.instructor_id === null || typeof m.course_defaults.instructor_id === "number")
    || !(m.course_defaults.place_id === null || typeof m.course_defaults.place_id === "number")
    || typeof m.course_defaults.location_id !== "number"
    || !["id", "course_id", "duration_minutes", "location_id"].every(k => typeof m[k] === "number")
    || !["date", "start_time", "start_datetime", "timezone"].every(k => typeof m[k] === "string")
    || !["cancelled", "instructor_open_accepted", "place_open_accepted", "is_past"].every(k => typeof m[k] === "boolean")
    || !["instructor_id", "place_id", "default_place_id", "effective_place_id"].every(k => m[k] === null || typeof m[k] === "number")
    || !["draft", "active", "cancelled"].includes(String(m.course_status))
    || !["inherited", "override", "open"].includes(String(m.instructor_source))
    || !["inherit", "override", "open"].includes(String(m.place_state))
    || !issues(m.issues) || !issues(m.warnings)) throw new MeetingRequestError("invalid_response");
  return m as ResolvedMeeting;
}
export async function getMeeting(id: number, signal?: AbortSignal) {
  return meetingResponse(await request(`courses/meetings/${id}/`, { method: "GET", signal }));
}
export async function patchMeeting(id: number, changes: MeetingPatch, signal?: AbortSignal) {
  return meetingResponse(await request(`courses/meetings/${id}/`, {
    method: "PATCH", headers: csrfJsonHeaders(), body: JSON.stringify(changes), signal,
  }));
}
export async function getMeetingChoices(signal?: AbortSignal): Promise<MeetingChoices> {
  const [users, locations] = await Promise.all([
    request("auth/users/", { method: "GET", signal }), request("courses/locations/", { method: "GET", signal }),
  ]);
  if (!Array.isArray(users.users) || !users.users.every(u => object(u) && typeof u.id === "number" && typeof u.username === "string")
    || !Array.isArray(locations.locations) || !locations.locations.every(l => object(l) && typeof l.id === "number"
      && typeof l.name === "string" && Array.isArray(l.places) && l.places.every(p => object(p)
        && typeof p.id === "number" && typeof p.name === "string" && typeof p.location === "number"))) {
    throw new MeetingRequestError("invalid_response");
  }
  return { users: users.users, locations: locations.locations } as MeetingChoices;
}

export type MeetingForm = {
  date: string; start_time: string; duration_minutes: number; cancelled: boolean;
  instructor_action: AssignmentAction; instructor_id: string; instructor_open_accepted: boolean;
  place_action: AssignmentAction; place_id: string; place_open_accepted: boolean;
};
export function meetingForm(meeting: ResolvedMeeting): MeetingForm {
  return { date: meeting.date, start_time: meeting.start_time, duration_minutes: meeting.duration_minutes,
    cancelled: meeting.cancelled, instructor_action: meeting.instructor_source === "inherited" ? "inherit" : meeting.instructor_source,
    instructor_id: meeting.instructor_id?.toString() ?? "", instructor_open_accepted: meeting.instructor_open_accepted,
    place_action: meeting.place_state, place_id: meeting.place_id?.toString() ?? "", place_open_accepted: meeting.place_open_accepted };
}
export function meetingChanges(previous: ResolvedMeeting, form: MeetingForm): MeetingPatch {
  const original = meetingForm(previous);
  const changes: MeetingPatch = {};
  for (const key of ["date", "start_time", "duration_minutes", "cancelled"] as const) {
    if (form[key] !== original[key]) Object.assign(changes, { [key]: form[key] });
  }
  for (const resource of ["instructor", "place"] as const) {
    const action = `${resource}_action` as const, id = `${resource}_id` as const;
    const accepted = `${resource}_open_accepted` as const;
    if (form[action] !== original[action] || (form[action] === "override" && form[id] !== original[id])) {
      changes[action] = form[action];
      if (form[action] === "override") changes[id] = Number(form[id]);
    }
    if (form[action] === "open" && (changes[action] || form[accepted] !== original[accepted])) changes[accepted] = form[accepted];
  }
  return changes;
}
