"""Read-only composition of course activation errors and accepted openings."""

from django.utils import timezone

from courses.services.course_activation import course_activation_issues, course_open_warnings
from courses.services.meeting_generation import meeting_interval


def _issue_order(issue):
    conflict = issue.get("conflict", {})
    return (
        issue.get("date", ""), issue.get("start_time", ""), issue["type"],
        issue.get("meeting_id") or 0, conflict.get("type", ""),
        conflict.get("meeting_id") or 0,
    )


def course_diagnostics(course):
    now = timezone.now()
    meetings = {meeting.pk: meeting for meeting in
                course.meetings.select_related("place", "default_place")}

    def details(issue, severity):
        meeting = meetings.get(issue.get("meeting_id"))
        return {
            **issue,
            "severity": severity,
            "course_id": course.pk,
            "meeting_id": issue.get("meeting_id"),
            "duration_minutes": meeting.duration_minutes if meeting else course.duration_minutes,
            **({
                "start_time": meeting.start_time.isoformat(),
                "end_datetime": meeting_interval(meeting)[1].isoformat(),
                "instructor_id": meeting.effective_instructor_id,
                "place_id": meeting.effective_place.pk if meeting.effective_place else None,
                "location_id": meeting.location_id,
            } if meeting else {}),
        }

    issues = [details(issue, "blocking") for issue in
              course_activation_issues(course, now=now, cache_holidays=False)]
    warnings = [
        details({"type": "open_" + field, "meeting_id": warning["meeting_id"],
                 "date": warning["date"]}, "warning")
        for warning in course_open_warnings(course, now=now)
        for field in warning["open_fields"]
    ]
    issues.sort(key=_issue_order)
    warnings.sort(key=_issue_order)
    return {
        "course_id": course.pk,
        "status": course.status,
        "draft_resolution_mode": course.status == "draft",
        "ready_for_activation": course.status == "draft" and not issues,
        "blocking_issue_count": len(issues),
        "warning_count": len(warnings),
        "issues": issues,
        "warnings": warnings,
    }


def course_readiness(course):
    """Expose lifecycle eligibility alongside the existing diagnostic result."""
    diagnostics = course_diagnostics(course)
    return {
        **diagnostics,
        "eligible_for_activation": course.status == "draft",
        "already_active": course.status == "active",
        "validation_passed": diagnostics["blocking_issue_count"] == 0,
    }
