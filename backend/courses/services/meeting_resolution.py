"""Explicit assignment transitions and atomic single-meeting PATCH updates."""

from copy import copy
from datetime import date, time

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from courses.models import Course, CourseMeeting, Place
from courses.services.course_activation import SchedulingValidationError, meeting_scheduling_issues
from courses.services.course_diagnostics import course_diagnostics
from courses.services.meeting_generation import meeting_interval
from courses.services.scheduling_locks import lock_meeting_resources


FIELDS = {
    "instructor_action", "instructor_id", "instructor_open_accepted",
    "place_action", "place_id", "place_open_accepted",
    "date", "start_time", "duration_minutes", "cancelled",
}


def invalid(field, message, kind="invalid_field"):
    raise SchedulingValidationError([{"type": kind, "field": field, "message": message}])


def _assignment(meeting, course, data, resource):
    action_field = resource + "_action"
    id_field = resource + "_id"
    accepted_field = resource + "_open_accepted"
    action = data.get(action_field)
    if action_field in data and action not in ("inherit", "override", "open"):
        invalid(action_field, "Use inherit, override or open.")
    if id_field in data and action != "override":
        invalid(id_field, "An ID requires an explicit override action.")
    if action == "override":
        value = data.get(id_field)
        if type(value) is not int or value <= 0:
            invalid(id_field, "Override requires a positive integer ID.")
        model = get_user_model() if resource == "instructor" else Place
        assigned = model.objects.filter(pk=value).first()
        if assigned is None:
            invalid(id_field, "Assigned object does not exist.", "invalid_reference")
        if resource == "instructor":
            meeting.instructor = assigned
            meeting.instructor_source = "override"
        else:
            meeting.place = assigned
            meeting.place_is_open = False
            meeting.location = assigned.location
            if meeting.default_place_id and meeting.default_place.location_id != assigned.location_id:
                meeting.default_place = None
        setattr(meeting, accepted_field, False)
    elif action == "inherit":
        if resource == "instructor":
            meeting.instructor = course.instructor
            meeting.instructor_source = "inherited"
        else:
            meeting.location = course.location
            meeting.default_place = course.default_place
            meeting.place = None
            meeting.place_is_open = False
        setattr(meeting, accepted_field, False)
    elif action == "open":
        was_open = meeting.instructor_source == "open" if resource == "instructor" else meeting.place_is_open
        if resource == "instructor":
            meeting.instructor = None
            meeting.instructor_source = "open"
        else:
            meeting.place = None
            meeting.place_is_open = True
        if not was_open:
            setattr(meeting, accepted_field, False)
    if accepted_field in data:
        accepted = data[accepted_field]
        if type(accepted) is not bool:
            invalid(accepted_field, "Expected a boolean.")
        is_open = meeting.instructor_source == "open" if resource == "instructor" else meeting.place_is_open
        if accepted and not is_open:
            invalid(accepted_field, "Acceptance requires an explicitly open assignment.")
        setattr(meeting, accepted_field, accepted)


def serialize_resolved_meeting(meeting, course, diagnostics):
    issues = [issue for issue in diagnostics["issues"] if issue.get("meeting_id") == meeting.pk]
    warnings = [warning for warning in diagnostics["warnings"] if warning.get("meeting_id") == meeting.pk]
    return {
        "id": meeting.pk, "course_id": course.pk, "course_status": course.status,
        "date": meeting.date.isoformat(), "start_time": meeting.start_time.isoformat(),
        "duration_minutes": meeting.duration_minutes, "cancelled": meeting.cancelled,
        "start_datetime": meeting_interval(meeting)[0].isoformat(),
        "is_past": meeting_interval(meeting)[0] < timezone.now(),
        "timezone": timezone.get_default_timezone_name(),
        "course_defaults": {"instructor_id": course.instructor_id,
                            "place_id": course.default_place_id,
                            "location_id": course.location_id},
        "instructor_source": meeting.instructor_source,
        "instructor_id": meeting.effective_instructor_id,
        "instructor_open_accepted": meeting.instructor_open_accepted,
        "place_state": "open" if meeting.place_is_open else "override" if meeting.place_id else "inherit",
        "place_id": meeting.place_id, "default_place_id": meeting.default_place_id,
        "effective_place_id": meeting.effective_place.pk if meeting.effective_place else None,
        "location_id": meeting.location_id, "place_is_open": meeting.place_is_open,
        "place_open_accepted": meeting.place_open_accepted,
        "issues": issues, "warnings": warnings,
        "conflicts": [issue["conflict"] for issue in issues if issue["type"] == "conflict"],
        "has_blocking_issues": bool(issues), "has_warnings": bool(warnings),
    }


@transaction.atomic
def resolve_meeting(meeting_id, data):
    if not isinstance(data, dict):
        invalid("body", "Expected a JSON object.")
    unknown = sorted(set(data) - FIELDS)
    if unknown:
        invalid(unknown[0], "Unsupported field.", "unknown_field")
    # Follow existing parent-before-resource locking order. Re-read the target
    # after locking its parent so concurrent PATCHes preserve unspecified fields.
    parent_id = CourseMeeting.objects.values_list("course_id", flat=True).get(pk=meeting_id)
    course = Course.objects.select_for_update().get(pk=parent_id)
    meeting = CourseMeeting.objects.select_for_update().get(pk=meeting_id, course_id=parent_id)
    previous = copy(meeting)
    _assignment(meeting, course, data, "instructor")
    _assignment(meeting, course, data, "place")
    for field, parser in (("date", date.fromisoformat), ("start_time", time.fromisoformat)):
        if field in data:
            if not isinstance(data[field], str):
                invalid(field, "Expected an ISO date/time string.")
            try:
                value = parser(data[field])
            except ValueError:
                invalid(field, "Invalid ISO date/time.")
            if field == "start_time" and value.tzinfo is not None:
                invalid(field, "Use local wall time without a timezone offset.")
            setattr(meeting, field, value)
    if "duration_minutes" in data:
        if type(data["duration_minutes"]) is not int or data["duration_minutes"] < 0:
            invalid("duration_minutes", "Expected a non-negative integer.")
        meeting.duration_minutes = data["duration_minutes"]
    if "cancelled" in data:
        if type(data["cancelled"]) is not bool:
            invalid("cancelled", "Expected a boolean.")
        meeting.cancelled = data["cancelled"]
    resources = [previous, meeting]
    if course.status == "active":
        resources.extend(course.meetings.all())
    lock_meeting_resources(resources)
    try:
        meeting.full_clean()
    except ValidationError as error:
        raise SchedulingValidationError([{
            "type": "invalid_meeting", "meeting_id": meeting.pk, "fields": error.message_dict,
        }]) from error
    now = timezone.now()
    issues = meeting_scheduling_issues(meeting, now=now)
    if issues and (course.status == "active" or meeting_interval(meeting)[0] < now):
        raise SchedulingValidationError(issues)
    meeting.save()
    diagnostics = course_diagnostics(course)
    # A date move can leave an expected date unrepresented. Validate the whole
    # active course after the write, rolling it back on any remaining blocker.
    if course.status == "active" and diagnostics["issues"]:
        raise SchedulingValidationError(diagnostics["issues"])
    return {"ok": True, "meeting": serialize_resolved_meeting(meeting, course, diagnostics),
            "course_diagnostics": diagnostics}
