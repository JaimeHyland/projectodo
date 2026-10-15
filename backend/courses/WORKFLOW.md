# Course scheduling and activation

## Audit findings

The original model had no course lifecycle or acceptance flags. Meeting instructor,
location, duration and default place were snapshots copied on generation. The
instructor was required; `place=None` meant use the meeting's stored default place.
The generator already skipped known conflicts, preserved existing rows, and
returned structured diagnostics. It did not persist known-conflicting proposals.

The existing CourseMeeting is retained. A meeting on a **draft** course is
provisional, regardless of whether it currently has any diagnostics. No stored
"valid" flag is introduced: conflicts and missing-data issues are recalculated.
Only guarded activation makes the course operational.

| Audit question | Before | After |
| --- | --- | --- |
| Instructor inheritance versus explicit open | No | `instructor_source` distinguishes inherited snapshot, override and open |
| Place inheritance versus explicit open | No | Existing override/default fields plus `place_is_open` |
| Per-meeting open acknowledgements | No | Two independent acceptance flags |
| Independent cancellation | Yes | Existing `cancelled` flag retained |
| Individual conflict diagnostics | Proposals only | `conflicts_for_meeting` and `meeting_scheduling_issues` also inspect saved meetings |
| Exceptional overrides survive generation | Yes | Preserved, including explicit open states |
| Backend activation validation | No | `change_course_status`, validation helpers and ordinary model save guards |
| Timezone-aware past/future checks | No activation rule | Shared aware meeting interval and configured Django timezone |

## Field semantics and migration

`0009_course_workflow` adds `Course.status` (`draft`, `active`, `cancelled`),
`CourseMeeting.instructor_source`, `instructor_open_accepted`, `place_is_open`,
and `place_open_accepted`. Course and meeting instructor foreign keys become
nullable. Both acknowledgements and `place_is_open` default to false.
Existing courses become draft: the migration does not assert that unvalidated
historical schedules are active. Existing assignments are preserved verbatim;
legacy instructor source is `override` because inheritance provenance cannot
be reliably inferred. No data is deleted or automatically acknowledged.

Instructor representation:

- `inherited`: `instructor` holds the copied course default, including an unresolved
  NULL if the course has no instructor. This is a snapshot, not a live fallback.
- `override`: `instructor` holds the individual assignment; NULL is unresolved.
- `open`: `instructor` must be NULL and intentionally does not inherit a default.
- Missing effective instructor requires `instructor_open_accepted=True` for
  activation of a future meeting, regardless of how the missing value arose.

Place representation:

- `place_is_open=False`, `place=None`: inherit the stored `default_place` snapshot.
- `place_is_open=False`, `place` populated: explicit override.
- `place_is_open=True`, `place=None`: deliberately unassigned, even if the stored
  default is populated. This does not reserve the parent location.
- Missing effective place requires `place_open_accepted=True` for future activation.
  An unspecified physical location without the open flag still reserves that
  location conservatively. Online locations do not reserve exclusive rooms; the
  explicit missing-place acknowledgement rule still applies to them.

Changing course defaults never rewrites saved meeting snapshots or exceptions.
When explicitly assigning another instructor, callers should also set source to
`override`. Acknowledgement does not excuse any overlap or structural error.

## Validation and generation

`change_course_status(course, status)` locks and changes the course atomically.
Activation validates every non-cancelled saved meeting using model validation,
the shared overlap helper and missing-resource checks. Errors are returned via
`SchedulingValidationError.issues`, including meeting IDs, dates, times, conflict
kinds and resource IDs. Failure leaves persisted status unchanged.

Activation also uses the holiday-aware meeting plan to reject scheduled dates
without a saved meeting. A saved cancelled meeting resolves an omitted date;
merely deleting or skipping a proposal does not. Existing meetings moved to a
different time on the same date still cover that date. Unsaved proposals have a
stable `course_id:date:start_time` key for the current course timetable; saved
meetings use their primary keys. Changing the course timetable changes proposal
keys. No separate provisional-record abstraction is needed.

The generator continues to skip conflicting new proposals, and saved draft rows
may be edited into provisional unresolved states. Preview now also recalculates
conflicts on saved rows. Cancelled courses cannot generate; status changes never
delete or automatically cancel their existing meetings. Non-cancelled meetings
of a cancelled course continue reserving resources until individually cancelled.

The existing same-course, instructor and conservative physical place/location
rules use one shared half-open interval check. NULL instructors do not conflict
with one another. Back-to-back meetings are allowed. Explicitly open places do
not reserve rooms; unspecified physical locations without that flag still do.

`meeting_interval` constructs aware datetimes in Django's configured TIME_ZONE
when USE_TZ is enabled. A meeting is past when its start is strictly earlier than
`timezone.now()`. Past meetings require actual instructor and place assignments,
even with acceptance flags. Cancelled meetings are exempt from these scheduling
requirements and remain saved. `active_course_open_warnings` reports acknowledged
open resources on future non-cancelled meetings of active courses.

Course.save validates status values on every non-empty save. Full activation
validation runs only when entering active or changing these scheduling fields
while active: instructor, location, default_place, term_type, duration_type,
start_date, end_date, start_time, duration_minutes, days_of_week. Course name,
subject, course_type and max_participants edits do not trigger activation.

CourseMeeting.save validates a new meeting on an active course, or an actual
change to course, instructor, instructor_source, instructor_open_accepted,
location, default_place, place, place_is_open, place_open_accepted, date,
start_time, duration_minutes or cancelled. Notes-only edits do not trigger
scheduling validation. Cancelled rows remain exempt from scheduling diagnostics.

Both guards compare the resulting row to persisted values, including for partial
saves; unchanged scheduling fields do not trigger validation. Empty update_fields
is a no-op. Explicit change_course_status(..., "active") requests always perform
full validation, including when the course is already active. Metadata saves
remain possible if an accepted opening has become past or holiday data is
unavailable. Generation is atomic. Resource locks serialize scheduling writes
sharing locations/instructors on databases with row-lock support. SQLite test
runs verify behaviour but do not establish PostgreSQL concurrency guarantees.

## API and remaining integration work

`POST /api/courses/<id>/status/` accepts `{"status": "active"}` (or draft/cancelled),
requires the existing webmaster permission, and returns structured `issues` with
HTTP 400 when scheduling validation fails. Course serialization includes status;
preview includes proposal identifiers and conflict details.

The future editor still needs meeting-resolution endpoints and UI controls wired
to these model fields and diagnostics. There is no new wizard, warning UI,
availability calendar or recurrence framework. Holiday-service failure blocks
activation with an explicit issue rather than bypassing date checks.

As with other Django model save validation, QuerySet.update, bulk_create,
bulk_update and raw SQL bypass these guards. Scheduling integrations must use
ordinary saves/services. Editing Location/Place definitions through unrelated
resource administration is not guarded by course activation. No background job
changes course status as time passes; past rules are checked on activation and
active scheduling writes. Moving a meeting to another date should retain a
cancelled record for the old scheduled date if that date remains in the course
plan; durable linkage across timetable edits is a future editor design concern.

## Files and verification

Workflow changes are in:

- `models.py`: lifecycle, assignment/open fields and active save guards.
- `services/course_activation.py`: diagnostics, activation and warning summary.
- `services/scheduling_locks.py`: deterministic resource locking.
- `services/meeting_generation.py`: effective-resource checks, aware intervals,
  cancelled-course rejection and atomic generation.
- `services/meeting_planning.py`: saved-meeting conflict diagnostics.
- `views.py`, `urls.py`: guarded status endpoint and structured API results.
- `migrations/0009_course_workflow.py`: additive fields and nullable instructors.
- `tests_workflow.py`: lifecycle, resource, API and migration-preservation tests.
- `WORKFLOW.md`: this audit and integration contract.

The earlier conflict-detection tests remain in `tests.py` and are included in
verification. All 79 courses tests passed against an isolated in-memory SQLite
database. Django system checks, `makemigrations --check --dry-run`, and
`git diff --check` passed. The migration was exercised in tests, not applied to
the configured production database.

## Read-only diagnostics

`GET /api/courses/<id>/diagnostics/` uses the existing authenticated webmaster
permission. It returns `course_id`, `status`, `draft_resolution_mode`,
`ready_for_activation`, `blocking_issue_count`, `warning_count`, `issues`, and
`warnings`. Readiness is true only for a draft with no blockers; active and
cancelled courses return meaningful diagnostics with draft-resolution mode and
readiness false. Cancelled courses have no expected new dates, but their saved
non-cancelled meetings can still have diagnostics.

Blocking types are `conflict`, `missing_instructor`, `missing_place`,
`unresolved_proposal`, `invalid_meeting`, `invalid_course`, and
`calendar_unavailable`. Conflict objects retain the shared `same_course`,
`instructor`, `place`, or `location` subtype and conflicting meeting/course/resource
IDs. Warning types are `open_instructor` and `open_place`. Items include severity,
meeting ID where applicable, date/time and duration; saved-meeting items also
include end datetime and effective resource IDs. Validation issues expose field
errors. Counts count diagnostic items, not distinct meetings.

Issues and warnings are sorted independently by date, start time, type and stable
identifier tie-breakers. Course-level issues without a date sort first.

The diagnostics service composes course activation checks and shared open-warning
logic, which in turn reuse the existing conflict and holiday-aware planning
services. It performs no course/meeting writes and disables holiday cache writes;
a cache miss may still fetch holiday data using read-only HTTP requests. No
mutation, resolution or activation endpoint is added by this diagnostic change.

## Single-meeting resolution

`PATCH /api/courses/meetings/<meeting_id>/` requires the existing authenticated
webmaster permission and changes only the targeted meeting. Accepted fields:

- `instructor_action`: `inherit`, `override`, or `open`.
- `instructor_id`: positive integer, required only with `override`.
- `instructor_open_accepted`: boolean; true requires explicit open state.
- `place_action`: `inherit`, `override`, or `open`.
- `place_id`: positive integer, required only with `override`.
- `place_open_accepted`: boolean; true requires explicit open state.
- `date`: ISO date; `start_time`: ISO local wall time without an offset.
- `duration_minutes`: non-negative integer, consistent with the existing model.
- `cancelled`: boolean.

Plain null IDs, unsupported fields, malformed types and contradictory assignment
requests are rejected. Unspecified fields are preserved. For example:

```json
{"instructor_action": "open", "instructor_open_accepted": true}
```

Explicit inheritance copies the current course default again. Instructor override
sets source to `override`; instructor open sets source to `open` and clears the
assignment. Place inheritance restores course location and default-place snapshot
and clears the override/open flag. Place override sets the meeting location to the
place's parent; an incompatible stored default place is cleared. Place open
suppresses inherited place use without changing location.

Assigning or inheriting clears old acceptance. Opening a previously non-open
assignment does not grant acceptance. Repeating an already-open action preserves
an unspecified acknowledgement. Acceptance can be explicitly set or cleared.

Future draft conflicts may persist, consistent with provisional draft storage,
but the response reports them as blocking issues. Non-cancelled past meetings
must have actual assignments and no overlaps, even on drafts. Active updates
validate both the edited meeting and the resulting course diagnostics. A failed
active date move that leaves an expected date unrepresented is rolled back.
Cancelled rows remain persisted and are exempt from scheduling blockers;
uncancellation applies the same course-state and past/future validation rules.

Success returns `ok`, `meeting`, and `course_diagnostics`. The meeting includes
assignment states/IDs, effective/default place, location, acceptance flags,
date/time/duration, cancellation, `issues`, `conflicts`, `warnings`,
`has_blocking_issues`, and `has_warnings`. Errors use `ok=false` and an `errors`
list: request errors (`invalid_field`, `unknown_field`, `invalid_reference`,
`invalid_json`), model validation (`invalid_meeting` with field details), or
existing scheduling diagnostic types with nested machine-readable conflicts.
A database integrity race returns HTTP 409 `integrity_conflict`; validation errors
use HTTP 400. Unauthorized, forbidden and missing targets use 401, 403 and 404.

The focused `meeting_resolution` service reuses scheduling diagnostics,
conflict calculation, resource locking, active save guards and course diagnostics.
The read/modify/validate/save/diagnose sequence is atomic. Parent and target rows
are locked, and old/new resources use existing ordered resource locks. On
row-locking databases, concurrent PATCHes of one meeting serialize and re-read
its latest fields. There is no version token: a later edit to the same field can
overwrite an earlier edit. SQLite provides no equivalent row-lock guarantees;
bulk/raw SQL and unrelated resource-admin writes still bypass scheduling guards.
No PostgreSQL concurrency redesign or concurrency guarantee for those bypasses
is introduced. Course recurrence/status, other meetings, participants and holiday
cache data are not mutated by this endpoint.

## Activation readiness query

`GET /api/courses/<id>/readiness/` uses the same authenticated webmaster permission
as diagnostics. `course_readiness` returns the existing diagnostics payload
unchanged and adds:

- `eligible_for_activation`: true only in draft resolution mode.
- `already_active`: true when status is active.
- `validation_passed`: true when the returned diagnostics have no blockers.

`ready_for_activation` remains identical to diagnostics: true for a draft with
no blockers, even if accepted-open warnings remain. An active course reports
readiness false (it is already active), while `validation_passed`, issues and
warnings expose its current scheduling health. Cancelled courses are ineligible;
their diagnostics concern saved meetings, not expected new generation dates.

The `issues`, `warnings`, counts, ordering and machine-readable types are reused
verbatim. No new activation rules, schema fields or mutation actions are added.
This endpoint neither saves domain records nor writes holiday cache data. Tests
compare readiness with diagnostics across clean, conflicted, missing-assignment,
missing-proposal, cancelled and active cases and verify no database/cache writes.

## Draft activation endpoint

`POST /api/courses/<id>/activate/` requires the existing authenticated webmaster
permission. It takes no assignment or status input and only transitions draft
to active. `activate_draft_course` locks/reloads the course within a transaction,
uses existing resource locks, computes fresh `course_readiness`, and delegates
the status write to `change_course_status`. That service and the model save guard
validate again immediately before writing. Earlier readiness requests are never
trusted as authorization. Activation validation disables holiday cache writes.

Validation failure returns HTTP 400 with the shared readiness fields, `ok=false`
and `activated=false`. The `issues`, warnings and counts retain existing shared
machine-readable diagnostics. Warnings alone do not block activation. No missing
meetings are generated or resolved automatically. Success returns HTTP 200 with
refreshed active-course readiness/diagnostics, `ok=true`, `activated=true`, and
`already_active=false`. Here `already_active` indicates status before the request;
`status` reports the final status. Since the result is now active, the shared
`ready_for_activation` field is false; `validation_passed` reports current health.

An already-active course returns HTTP 200, `already_active=true`, `activated=false`
and current diagnostics, without saving. A cancelled course returns HTTP 409,
`ok=false`, `activated=false`, and `error.type="course_cancelled"`, without changing
status. This endpoint does not cancel, downgrade or reactivate courses.

Only the target course's status changes. Meetings, assignments, acknowledgements,
recurrence, cancellation flags and holiday data remain unchanged. Scheduling paths
using the existing parent/resource locks serialize on row-locking databases;
SQLite, bulk/raw SQL and unrelated resource administration retain their documented
limitations. No new locking design, version field, migration or frontend UI is
introduced.

## Meeting editor read API

`GET /api/courses/meetings/<id>/` uses the same authenticated webmaster permission
as PATCH. It returns `ok`, `meeting`, and `course_diagnostics`, reusing the
resolution serializer without performing a save or writing holiday cache data.
Both GET and successful PATCH responses now include `start_datetime`, `is_past`,
`timezone`, and `course_defaults` (instructor, place and location IDs).
The past flag compares the actual scheduled start against the current time.
The frontend loads choice names from the existing users and locations endpoints.
It sends only changed fields to PATCH and refreshes readiness after a save;
acceptance remains an explicit user choice and never excuses past assignments.
