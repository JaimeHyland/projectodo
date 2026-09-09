"""Draft scheduling diagnostics and guarded course activation."""

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from courses.models import Course
from courses.services.berlin_holidays import HolidayCalendarUnavailable
from courses.services.meeting_generation import conflicts_for_meeting, meeting_interval
from courses.services.meeting_planning import build_course_meeting_plan


class SchedulingValidationError(ValidationError):
    def __init__(self, issues):
        self.issues = issues
        super().__init__({"meetings": [str(issue) for issue in issues]})


def meeting_scheduling_issues(meeting, now=None):
    """Recalculate diagnostics; no stale persisted 'valid' flag is needed."""
    if meeting.cancelled:
        return []
    now = now or timezone.now()
    identity = {
        "meeting_id": meeting.pk,
        "course_id": meeting.course_id,
        "date": meeting.date.isoformat(),
        "start_time": meeting.start_time.isoformat(),
    }
    issues = []
    try:
        meeting.full_clean()
    except ValidationError as error:
        issues.append({**identity, "type": "invalid_meeting", "fields": error.message_dict})
        return issues
    start, _ = meeting_interval(meeting)
    past = start < now
    for field, missing, accepted in (
        ("instructor", meeting.effective_instructor_id is None, meeting.instructor_open_accepted),
        ("place", meeting.effective_place is None, meeting.place_open_accepted),
    ):
        if missing and (past or not accepted):
            issues.append({**identity, "type": "missing_" + field, "past": past,
                           "acknowledged": accepted})
    for conflict in conflicts_for_meeting(meeting):
        issues.append({**identity, "type": "conflict", "conflict": conflict})
    return issues


def validate_active_meeting(meeting, now=None):
    issues = meeting_scheduling_issues(meeting, now=now)
    if issues:
        raise SchedulingValidationError(issues)


def course_activation_issues(course, now=None, *, cache_holidays=True):
    now = now or timezone.now()
    meetings = list(course.meetings.select_related("location", "place", "default_place")) if course.pk else []
    issues = [issue for meeting in meetings
              for issue in meeting_scheduling_issues(meeting, now=now)]
    try:
        course.full_clean()
    except ValidationError as error:
        return issues + [{"type": "invalid_course", "fields": error.message_dict}]
    # A saved (possibly cancelled or rescheduled within the day) meeting resolves
    # a proposed date. Deleting a row does not silently accept a skipped proposal.
    covered_dates = {meeting.date for meeting in meetings}
    try:
        plan = build_course_meeting_plan(course, cache_holidays=cache_holidays)
    except HolidayCalendarUnavailable as error:
        return issues + [{"type": "calendar_unavailable", "message": str(error)}]
    for proposed_date in plan["scheduled_dates"]:
        if proposed_date not in covered_dates:
            issues.append({
                "type": "unresolved_proposal",
                "proposal_id": f"{course.pk}:{proposed_date.isoformat()}:{course.start_time.isoformat()}",
                "date": proposed_date.isoformat(),
                "start_time": course.start_time.isoformat(),
                "conflicts": plan["conflicts"].get(proposed_date, []),
            })
    return issues


def validate_course_activation(course, now=None):
    issues = course_activation_issues(course, now=now)
    if issues:
        raise SchedulingValidationError(issues)


@transaction.atomic
def change_course_status(course, status):
    """Validate and change status atomically; failures leave the row unchanged."""
    if not isinstance(status, str) or status not in dict(Course.STATUS_CHOICES):
        raise ValidationError({"status": "Invalid course status."})
    locked = Course.objects.select_for_update().get(pk=course.pk)
    if status == "active" and locked.status == "active":
        # An explicit activation request remains a full validation operation.
        from courses.services.scheduling_locks import lock_meeting_resources
        lock_meeting_resources(list(locked.meetings.all()))
        locked.full_clean()
        validate_course_activation(locked)
    locked.status = status
    locked.save(update_fields=["status"])
    course.status = locked.status
    return locked


def active_course_open_warnings(course, now=None):
    if course.status != "active":
        return []
    return course_open_warnings(course, now=now)


def course_open_warnings(course, now=None):
    """Accepted future openings, independent of the parent lifecycle state."""
    now = now or timezone.now()
    warnings = []
    for meeting in course.meetings.filter(cancelled=False).select_related("place", "default_place"):
        if meeting_interval(meeting)[0] < now:
            continue
        fields = []
        if meeting.effective_instructor_id is None and meeting.instructor_open_accepted:
            fields.append("instructor")
        if meeting.effective_place is None and meeting.place_open_accepted:
            fields.append("place")
        if fields:
            warnings.append({"meeting_id": meeting.pk, "date": meeting.date.isoformat(),
                             "open_fields": fields})
    return warnings
