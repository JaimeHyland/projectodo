"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { getCourseIssueMessageKey, type CourseIssue, type CourseReadiness } from "@/lib/course-readiness";
import { meetingBlockerNavigation } from "@/lib/meeting-blocker-navigation";
import { getMeeting, getMeetingChoices, meetingChanges, meetingForm, patchMeeting, MeetingRequestError,
  type MeetingChoices, type MeetingForm, type ResolvedMeeting, type AssignmentAction } from "@/lib/meeting-resolution";
import type en from "@/messages/admin-dashboard/en.json";

export type MeetingEditorMessages = Pick<typeof en, "meetingEditor" | "courseIssues" | "courseReadiness">;
type Loaded = { meeting: ResolvedMeeting; form: MeetingForm; choices: MeetingChoices };

export function CourseMeetingResolutionDialog({ meetingId: initialMeetingId, courseId, messages, onClose, onSaved, returnFocus }: {
  meetingId: number; courseId: number; messages: MeetingEditorMessages; onClose: () => void;
  onSaved: () => Promise<CourseReadiness | null>; returnFocus: RefObject<HTMLButtonElement | null>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const controller = useRef<AbortController | null>(null);
  const submitting = useRef(false);
  const title = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const nextButton = useRef<HTMLButtonElement>(null);
  const [meetingId, setMeetingId] = useState(initialMeetingId);
  const [navigation, setNavigation] = useState<ReturnType<typeof meetingBlockerNavigation> | null>(null);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState<MeetingRequestError | null>(null);
  const [saveError, setSaveError] = useState<MeetingRequestError | null>(null);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const labels = messages.meetingEditor;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const fallback = returnFocus.current;
    const element = dialog.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element?.showModal();
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
      (previous?.isConnected ? previous : fallback)?.focus();
    };
  }, [returnFocus]);
  useEffect(() => {
    const abort = new AbortController();
    controller.current = abort;
    Promise.all([getMeeting(meetingId, abort.signal), getMeetingChoices(abort.signal)])
      .then(([meeting, choices]) => {
        if (meeting.course_id !== courseId || meeting.id !== meetingId) throw new MeetingRequestError("invalid_response");
        if (!abort.signal.aborted) {
          setLoaded({ meeting, choices, form: meetingForm(meeting) });
          requestAnimationFrame(() => heading.current?.focus());
        }
      }).catch(error => {
        if (!abort.signal.aborted) setLoadError(error instanceof MeetingRequestError ? error : new MeetingRequestError("network"));
      });
    return () => abort.abort();
  }, [meetingId, courseId, attempt]);
  function errorText(error: MeetingRequestError, fallback: string) {
    return error.kind === "authentication" ? labels.authentication : error.kind === "permission" ? labels.permission
      : error.kind === "not_found" ? labels.notFound : fallback;
  }
  function change<K extends keyof MeetingForm>(key: K, value: MeetingForm[K]) {
    setLoaded(current => current && { ...current, form: { ...current.form, [key]: value } });
    setSaved(false);
    setNavigation(null);
    setRefreshFailed(false);
  }
  function assignment(resource: "instructor" | "place", action: AssignmentAction) {
    setLoaded(current => current && { ...current, form: { ...current.form,
      [`${resource}_action`]: action, [`${resource}_open_accepted`]: false } });
    setSaved(false);
    setNavigation(null);
    setRefreshFailed(false);
  }
  function issueList(items: CourseIssue[]) {
    return <ul className="list-disc space-y-1 pl-5">{items.map((issue, index) => {
      const conflict = issue.conflict;
      const start = typeof conflict?.date === "string" && typeof conflict.start_time === "string"
        ? `${conflict.date} ${conflict.start_time.slice(0, 5)}` : null;
      const instructor = loaded?.choices.users.find(u => u.id === conflict?.instructor_id)?.username;
      const place = loaded?.choices.locations.flatMap(l => l.places).find(p => p.id === conflict?.place_id)?.name;
      const location = loaded?.choices.locations.find(l => l.id === conflict?.location_id)?.name;
      return <li key={index}>{messages.courseIssues[getCourseIssueMessageKey(issue)]}
        {issue.date && <span> ({issue.date} {issue.start_time?.slice(0, 5)})</span>}
        {typeof start === "string" && <span> {start}</span>}
        {[instructor, place, location].filter(Boolean).map((name, i) => <span key={i}> — {name}</span>)}
      </li>;
    })}</ul>;
  }
  function fieldErrors(resource: string) {
    const items = saveError?.issues.filter(issue => issue.field === resource || issue.field === `${resource}_id`
      || issue.field === `${resource}_action` || issue.field === `${resource}_open_accepted`
      || issue.type === `missing_${resource}` || issue.conflict?.type === resource
      || (issue.fields && typeof issue.fields === "object" && resource in issue.fields)) ?? [];
    return items.length ? <div className="text-sm text-red-700">{issueList(items)}</div> : null;
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!loaded || submitting.current) return;
    submitting.current = true; setPending(true); setSaved(false); setSaveError(null); setNavigation(null); setRefreshFailed(false);
    try {
      const meeting = await patchMeeting(meetingId, meetingChanges(loaded.meeting, loaded.form), controller.current?.signal);
      if (meeting.id !== meetingId || meeting.course_id !== courseId) throw new MeetingRequestError("invalid_response");
      setLoaded({ ...loaded, meeting, form: meetingForm(meeting) });
      await refreshNavigation(meeting);
    } catch (error) {
      if (!controller.current?.signal.aborted) setSaveError(error instanceof MeetingRequestError ? error : new MeetingRequestError("network"));
    } finally { submitting.current = false; setPending(false); }
  }
  async function refreshNavigation(meeting: ResolvedMeeting) {
    const readiness = await onSaved();
    setSaved(true);
    if (!readiness) { setRefreshFailed(true); setNavigation(null); return; }
    setRefreshFailed(false);
    setLoaded(current => current && { ...current, meeting: { ...meeting,
      issues: readiness.issues.filter(issue => issue.meeting_id === meeting.id),
      warnings: readiness.warnings.filter(issue => issue.meeting_id === meeting.id),
    } });
    const remaining = meetingBlockerNavigation(readiness, meeting.id);
    setNavigation(remaining);
    if (!remaining.currentBlocked && remaining.nextId === null) onClose();
    else requestAnimationFrame(() => (remaining.currentBlocked ? heading.current : nextButton.current)?.focus());
  }
  async function retryReadiness() {
    if (!loaded || submitting.current) return;
    submitting.current = true; setPending(true);
    try { await refreshNavigation(loaded.meeting); }
    finally { submitting.current = false; setPending(false); }
  }
  function nextMeeting() {
    if (!navigation?.nextId || pending) return;
    setLoaded(null); setLoadError(null); setSaveError(null); setSaved(false); setNavigation(null);
    setMeetingId(navigation.nextId);
    requestAnimationFrame(() => heading.current?.focus());
  }
  const fieldClass = "block w-full rounded border border-gray-400 bg-white px-3 py-2";
  const form = loaded?.form;
  return <dialog ref={dialog} aria-labelledby={title}
    onCancel={event => { event.preventDefault(); if (!submitting.current) onClose(); }}
    className="max-h-[90vh] w-[calc(100%_-_2rem)] max-w-2xl overflow-y-auto rounded-lg bg-white p-5 text-gray-900 shadow-xl backdrop:bg-black/60">
    <div className="mb-4 flex items-center justify-between gap-4"><h2 ref={heading} tabIndex={-1} id={title} className="text-xl font-bold">{labels.title}{loaded ? ` — ${loaded.meeting.date} ${loaded.meeting.start_time.slice(0, 5)}` : ""}</h2>
      <button type="button" autoFocus disabled={pending} onClick={onClose} className="admin-button admin-button-secondary disabled:opacity-40">{labels.close}</button></div>
    {!loaded && !loadError && <p role="status">{labels.loading}</p>}
    {loadError && <div><p role="alert">{errorText(loadError, labels.loadFailed)}</p><button type="button"
      className="admin-button admin-button-secondary" onClick={() => { setLoadError(null); setAttempt(n => n + 1); }}>{labels.retry}</button></div>}
    {loaded && form && <form onSubmit={save} className="space-y-4">
      <p>{labels.courseLocation}: {loaded.choices.locations.find(l => l.id === loaded.meeting.course_defaults.location_id)?.name ?? labels.unknown}</p>
      <p>{labels.meetingLocation}: {loaded.choices.locations.find(l => l.id === loaded.meeting.location_id)?.name ?? labels.unknown}</p>
      <p>{labels.timezone}: {loaded.meeting.timezone}</p>
      <fieldset disabled={pending} className="space-y-4 disabled:opacity-60">
        <div className="grid gap-3 sm:grid-cols-3">
          <label>{labels.date}<input required type="date" className={fieldClass} value={form.date} onChange={e => change("date", e.target.value)} />{fieldErrors("date")}</label>
          <label>{labels.time}<input required type="time" step="1" className={fieldClass} value={form.start_time} onChange={e => change("start_time", e.target.value)} />{fieldErrors("start_time")}</label>
          <label>{labels.duration}<input required type="number" min="0" step="1" className={fieldClass} value={form.duration_minutes} onChange={e => change("duration_minutes", Number(e.target.value))} />{fieldErrors("duration_minutes")}</label>
        </div>
        {(["instructor", "place"] as const).map(resource => <fieldset key={resource} className="space-y-2 rounded border p-3">
          <legend className="px-1 font-semibold">{resource === "instructor" ? labels.instructor : labels.place}</legend>
          <p>{resource === "instructor" ? labels.instructor : labels.place}: {resource === "instructor"
            ? loaded.choices.users.find(u => u.id === loaded.meeting.instructor_id)?.username ?? labels.unknown
            : loaded.choices.locations.flatMap(l => l.places).find(p => p.id === loaded.meeting.effective_place_id)?.name ?? labels.unknown}</p>
          <p>{resource === "instructor" ? labels.defaultInstructor : labels.defaultPlace}: {resource === "instructor"
            ? loaded.choices.users.find(u => u.id === loaded.meeting.course_defaults.instructor_id)?.username ?? labels.unknown
            : loaded.choices.locations.flatMap(l => l.places).find(p => p.id === loaded.meeting.course_defaults.place_id)?.name ?? labels.unknown}</p>
          <label className="block">{resource === "instructor" ? labels.instructorState : labels.placeState}
            <select className={fieldClass} value={form[`${resource}_action`]} onChange={e => assignment(resource, e.target.value as AssignmentAction)}>
              {(["inherit", "override", "open"] as const).map(action => <option key={action} value={action}>{labels[action]}</option>)}
            </select></label>
          {form[`${resource}_action`] === "override" && <label className="block">{resource === "instructor" ? labels.instructor : labels.place}
            <select required className={fieldClass} value={form[`${resource}_id`]} onChange={e => change(`${resource}_id`, e.target.value)}>
              <option value="">{labels.choose}</option>
              {resource === "instructor" ? loaded.choices.users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)
                : [...loaded.choices.locations].sort((a, b) => Number(b.id === loaded.meeting.course_defaults.location_id) - Number(a.id === loaded.meeting.course_defaults.location_id))
                  .map(l => <optgroup key={l.id} label={l.name}>{l.places.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</optgroup>)}
            </select></label>}
          {form[`${resource}_action`] === "open" && <div><label className="flex items-start gap-2">
            <input type="checkbox" checked={form[`${resource}_open_accepted`]} onChange={e => change(`${resource}_open_accepted`, e.target.checked)} />
            {resource === "instructor" ? labels.acceptInstructor : labels.acceptPlace}</label><p className="mt-1 text-sm text-gray-700">{labels.pastNote}</p></div>}
          {fieldErrors(resource)}
        </fieldset>)}
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.cancelled} onChange={e => change("cancelled", e.target.checked)} />{labels.cancelled}</label>
        <p className="text-sm">{labels.cancellationNote}</p>
      </fieldset>
      {loaded.meeting.issues.length > 0 && <section className="rounded border-l-4 border-red-600 bg-red-50 p-3"><h3 className="font-semibold">{messages.courseReadiness.blockers}</h3>{issueList(loaded.meeting.issues)}</section>}
      {loaded.meeting.warnings.length > 0 && <section className="rounded border-l-4 border-amber-500 bg-amber-50 p-3"><h3 className="font-semibold">{messages.courseReadiness.warnings}</h3>{issueList(loaded.meeting.warnings)}</section>}
      {saveError && <div role="alert" className="text-red-700"><p>{errorText(saveError, labels.saveFailed)}</p>{issueList(saveError.issues)}</div>}
      {saved && <p role="status">{labels.saved}</p>}
      {navigation && <div className="space-y-2">
        <p aria-live="polite">{navigation.currentBlocked ? labels.stillBlocked : labels.remaining.replace("{count}", String(navigation.count))}</p>
        {navigation.nextId !== null && <button ref={nextButton} type="button" disabled={pending} onClick={nextMeeting}
          className="admin-button admin-button-primary disabled:opacity-40">{labels.next}</button>}
      </div>}
      {refreshFailed && <div><p role="alert">{labels.refreshFailed}</p><button type="button" disabled={pending}
        className="admin-button admin-button-secondary" onClick={() => void retryReadiness()}>{labels.retry}</button></div>}
      <button disabled={pending} className="admin-button admin-button-primary disabled:cursor-not-allowed disabled:opacity-40" type="submit">{pending ? labels.saving : labels.save}</button>
    </form>}
  </dialog>;
}
