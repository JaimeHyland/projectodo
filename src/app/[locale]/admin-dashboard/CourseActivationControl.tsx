"use client";

import { useId, useRef, useState } from "react";
import { activateCourse, CourseActivationError, type CourseActivationResult } from "@/lib/course-activation";
import { canActivateCourse, type CourseReadiness } from "@/lib/course-readiness";
import type en from "@/messages/admin-dashboard/en.json";

export function CourseActivationControl({ courseId, status, readiness, labels, onRefresh }: {
  courseId: number; status: CourseReadiness["status"]; readiness: CourseReadiness | null;
  labels: typeof en.courseActivation; onRefresh: (result?: CourseActivationResult) => Promise<void>;
}) {
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<keyof typeof labels | null>(null);
  const [terminal, setTerminal] = useState<"active" | "cancelled" | null>(null);
  const submitting = useRef(false);
  const feedbackRef = useRef<HTMLParagraphElement>(null);
  const explanation = useId();
  const currentStatus = terminal ?? readiness?.status ?? status;
  const enabled = currentStatus === "draft" && !!readiness && canActivateCourse(readiness) && !pending;
  async function submit() {
    if (!enabled || submitting.current) return;
    submitting.current = true; setPending(true); setFeedback(null);
    let result: CourseActivationResult | undefined;
    try {
      result = await activateCourse(courseId);
      if (result.ok) {
        setTerminal("active"); setFeedback(result.already_active ? "alreadyActive" : "success");
      } else setFeedback("changed");
    } catch (error) {
      if (error instanceof CourseActivationError) {
        result = error.result;
        if (error.kind === "cancelled") { setTerminal("cancelled"); setFeedback("cancelled"); }
        else setFeedback(error.kind === "authentication" ? "authentication" : error.kind === "permission" ? "permission"
          : error.kind === "not_found" ? "notFound" : "failed");
      } else setFeedback("failed");
    }
    try { await onRefresh(result); }
    finally {
      setPending(false); setConfirm(false); submitting.current = false;
      requestAnimationFrame(() => feedbackRef.current?.focus());
    }
  }
  return <div className="space-y-2 border-t pt-3">
    {currentStatus === "draft" && <>
      {!confirm ? <button type="button" disabled={!enabled} aria-describedby={!enabled ? explanation : undefined}
        className="admin-button admin-button-primary disabled:cursor-not-allowed disabled:opacity-40" onClick={() => setConfirm(true)}>{labels.activate}</button>
        : <div role="group" aria-label={labels.confirm} className="space-y-2 rounded border p-3">
          <p>{labels.confirmText}</p>
          <button type="button" disabled={!enabled} onClick={() => void submit()}
            className="admin-button admin-button-primary disabled:cursor-not-allowed disabled:opacity-40">{pending ? labels.activating : labels.confirm}</button>
          <button type="button" disabled={pending} className="admin-button admin-button-secondary ml-2" onClick={() => setConfirm(false)}>{labels.back}</button>
        </div>}
      {!enabled && !pending && <p id={explanation}>{readiness?.blocking_issue_count ? labels.blocked : labels.unavailable}</p>}
    </>}
    {feedback && <p ref={feedbackRef} tabIndex={-1} role={feedback === "success" || feedback === "alreadyActive" ? "status" : "alert"}>{labels[feedback]}</p>}
  </div>;
}
