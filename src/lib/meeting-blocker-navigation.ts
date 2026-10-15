import type { CourseReadiness } from "./course-readiness";

/** Preserve backend ordering and visit each persisted meeting once. */
export function meetingBlockerNavigation(readiness: CourseReadiness, currentId: number) {
  const ids = [...new Set(readiness.issues.map(issue => issue.meeting_id)
    .filter((id): id is number => typeof id === "number" && Number.isInteger(id) && id > 0))];
  const currentBlocked = ids.includes(currentId);
  return { currentBlocked, count: ids.length, nextId: currentBlocked ? null : ids[0] ?? null };
}
