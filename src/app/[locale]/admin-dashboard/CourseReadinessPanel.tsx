"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { CourseReadinessError, canActivateCourse, getCourseIssueMessageKey, getCourseReadiness,
  type CourseIssue, type CourseReadiness } from "@/lib/course-readiness";
import type { AdminCourse } from "@/types/admin";
import type en from "@/messages/admin-dashboard/en.json";
import { CourseActivationControl } from "./CourseActivationControl";
import { CourseMeetingResolutionDialog } from "./CourseMeetingResolutionDialog";

export type ReadinessMessages = Pick<typeof en, "courseIssues" | "courseReadiness" | "meetingEditor" | "courseActivation">;

export function CourseReadinessPanel({ course, messages, onStatusChange }: {
  course: AdminCourse; messages: ReadinessMessages; onStatusChange?: (id: number, status: AdminCourse["status"]) => void;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const [selectedMeeting, setSelectedMeeting] = useState<number | null>(null);
  const request = useRef<AbortController | null>(null);
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState<CourseReadinessError["kind"] | null>(null);
  const [data, setData] = useState<CourseReadiness | null>(null);
  const dataCourse = useRef<AdminCourse | null>(null);
  const labels = messages.courseReadiness;

  const check = useCallback(async (seed?: CourseReadiness) => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setFailed(null);
    setData(seed ?? null);
    try {
      const result = await getCourseReadiness(course.id, controller.signal);
      if (!controller.signal.aborted) { dataCourse.current = course; setData(result); return result; }
    } catch (error) {
      if (!controller.signal.aborted) setFailed(error instanceof CourseReadinessError ? error.kind : "network");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
    return null;
  }, [course]);
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => void check(), 0);
    return () => { clearTimeout(timer); request.current?.abort(); };
  }, [check, open]);
  function toggle() {
    if (open) request.current?.abort();
    setOpen(!open);
  }
  function list(items: CourseIssue[]) {
    return <ul className="list-disc space-y-1 pl-5">{[...items].sort((a, b) => `${a.date ?? ""} ${a.start_time ?? ""}`.localeCompare(`${b.date ?? ""} ${b.start_time ?? ""}`)).map((issue, index) =>
      <li key={index}>
        {messages.courseIssues[getCourseIssueMessageKey(issue)]}
        {issue.date && <span className="ml-1 text-gray-600">({issue.date}{issue.start_time ? ` ${issue.start_time.slice(0, 5)}` : ""})</span>}
        {typeof issue.meeting_id === "number" && issue.meeting_id > 0 && <button type="button"
          className="ml-2 underline underline-offset-2" onClick={() => setSelectedMeeting(issue.meeting_id as number)}>{messages.meetingEditor.title}</button>}
      </li>)}</ul>;
  }
  return <div className="w-full">
    <button ref={trigger} type="button" className="admin-button admin-button-secondary"
      aria-expanded={open} aria-controls={id} onClick={toggle}>{labels.check}</button>
    <section hidden={!open} id={id} aria-label={labels.check} aria-busy={loading}
      className="mt-2 space-y-3 rounded border border-gray-300 bg-gray-50 p-3 text-sm">
      {loading && <p role="status">{labels.loading}</p>}
      {failed && <p role="alert">{failed === "authentication" ? labels.authenticationError : failed === "permission" ? labels.permissionError : failed === "not_found" ? labels.notFoundError : labels.error}</p>}
      {data && <>
        <p>{labels.status}: {labels[data.status]}</p>
        <p>{labels.blockers}: {data.blocking_issue_count} / {labels.warnings}: {data.warning_count}</p>
        <p role="status" className="font-semibold">{data.status === "active" ? (data.validation_passed ? labels.valid : labels.invalid)
          : data.status === "cancelled" ? labels.cancelled : canActivateCourse(data) ? labels.ready : labels.notReady}</p>
        {data.issues.length > 0 && <div className="rounded border-l-4 border-red-600 bg-red-50 p-2"><h4 className="mb-1 font-semibold">{labels.blockers}</h4>{list(data.issues)}</div>}
        {data.warnings.length > 0 && <div className="rounded border-l-4 border-amber-500 bg-amber-50 p-2"><h4 className="mb-1 font-semibold">{labels.warnings}</h4>{list(data.warnings)}</div>}
      </>}
      <button type="button" disabled={loading} onClick={() => void check()}
        className="admin-button admin-button-secondary disabled:cursor-not-allowed disabled:opacity-40">{labels.refresh}</button>
      <CourseActivationControl courseId={course.id} status={course.status} labels={messages.courseActivation}
        readiness={!loading && !failed && dataCourse.current === course ? data : null}
        onRefresh={async result => {
          await check(result);
          if (result) onStatusChange?.(course.id, result.status);
        }} />
    </section>
    {selectedMeeting !== null && <CourseMeetingResolutionDialog meetingId={selectedMeeting}
      courseId={course.id} messages={messages} returnFocus={trigger} onClose={() => setSelectedMeeting(null)} onSaved={check} />}
  </div>;
}
