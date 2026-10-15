# courses/services/meeting_generation.py

from datetime import datetime, timedelta

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Max, Q
from django.utils import timezone

from courses.models import CourseMeeting
from courses.services.school_terms import generate_session_dates


DAY_CODES = {
    "MO": "monday",
    "TU": "tuesday",
    "WE": "wednesday",
    "TH": "thursday",
    "FR": "friday",
    "SA": "saturday",
    "SU": "sunday",
}


def course_meeting_dates(
    course,
    holiday_periods=None,
    public_holidays=None,
):
    if course.status == "cancelled":
        return []
    if course.duration_type == "one_off":
        return [course.start_date]

    end_date = course.end_date
    if not end_date:
        return []

    selected_weekdays = [
        DAY_CODES[day.strip()]
        for day in course.days_of_week.split(",")
        if day.strip()
    ]

    return generate_session_dates(
        first_date=course.start_date,
        weekdays=selected_weekdays,
        last_date=end_date,
        holiday_periods=holiday_periods,
        public_holidays=public_holidays,
        runs_during_school_holidays=course.term_type == "all_year",
    )


class MeetingGenerationResult(list):
    """Keep the original meeting list API while reporting each date's outcome."""

    def __init__(self):
        super().__init__()
        self.created_dates = []
        self.existing_dates = []
        self.conflicts = {}


def meeting_interval(meeting):
    start = datetime.combine(meeting.date, meeting.start_time)
    if settings.USE_TZ:
        start = timezone.make_aware(start, timezone.get_default_timezone())
    return start, start + timedelta(minutes=meeting.duration_minutes)


def meeting_conflicts(proposed, candidates):
    """Compare stored meeting defaults/overrides using half-open intervals."""
    if proposed.cancelled:
        return []
    start, end = meeting_interval(proposed)
    conflicts = []
    for existing in candidates:
        if existing.cancelled or (proposed.pk is not None and existing.pk == proposed.pk):
            continue
        existing_start, existing_end = meeting_interval(existing)
        if not (start < existing_end and end > existing_start):
            continue
        kinds = []
        if proposed.course_id == existing.course_id:
            kinds.append("same_course")
        if (proposed.effective_instructor_id is not None
                and proposed.effective_instructor_id == existing.effective_instructor_id):
            kinds.append("instructor")
        proposed_place = proposed.effective_place
        existing_place = existing.effective_place
        if (
            proposed.location.location_type == "physical"
            and existing.location.location_type == "physical"
            and not proposed.place_is_open
            and not existing.place_is_open
        ):
            if proposed_place and existing_place:
                if proposed_place.pk == existing_place.pk:
                    kinds.append("place")
            elif proposed.location_id == existing.location_id:
                kinds.append("location")
        for kind in kinds:
            conflicts.append({
                "type": kind,
                "meeting_id": existing.pk,
                "course_id": existing.course_id,
                "date": existing.date.isoformat(),
                "start_time": existing.start_time.isoformat(),
                "end_datetime": existing_end.isoformat(),
                "instructor_id": existing.effective_instructor_id,
                "place_id": existing_place.pk if existing_place else None,
                "location_id": existing.location_id,
            })
    return conflicts


def conflict_candidates(course_id, instructor_id, location_id, first_start, latest):
    resources = Q(course_id=course_id) | Q(location_id=location_id)
    if instructor_id is not None:
        resources |= Q(instructor_id=instructor_id)
    related = CourseMeeting.objects.filter(resources)
    active = related.filter(cancelled=False)
    max_duration = active.aggregate(value=Max("duration_minutes"))["value"] or 0
    lookback = min(timedelta(minutes=max_duration), first_start - datetime.min)
    earliest = first_start - lookback
    return (
        active.filter(date__gte=earliest.date(), date__lte=latest.date())
        .select_related("location", "place", "default_place")
        .order_by("date", "start_time", "pk")
    )


def conflicts_for_meeting(meeting):
    if meeting.cancelled:
        return []
    start = datetime.combine(meeting.date, meeting.start_time)
    candidates = conflict_candidates(
        meeting.course_id, meeting.effective_instructor_id, meeting.location_id,
        start, start + timedelta(minutes=meeting.duration_minutes),
    )
    return meeting_conflicts(meeting, candidates)


def plan_meeting_dates(course, dates):
    """Yield proposals in order, reserving accepted dates for later proposals.

    Preview conflicts with unsaved proposals have a null meeting_id; course,
    date and start_time identify them until generation assigns a primary key.
    Include long meetings starting on earlier dates without assuming a maximum
    duration. Only related resources within the possible date window are loaded.
    """
    if not dates:
        return
    candidates = list(conflict_candidates(
        course.pk, course.instructor_id, course.location_id,
        datetime.combine(min(dates), course.start_time),
        datetime.combine(max(dates), course.start_time)
        + timedelta(minutes=course.duration_minutes),
    ))
    existing = {
        meeting.date: meeting
        for meeting in CourseMeeting.objects.filter(course=course, date__in=dates,
                                      start_time=course.start_time)
    }
    for meeting_date in dates:
        if meeting_date in existing:
            yield existing[meeting_date], "existing", conflicts_for_meeting(existing[meeting_date])
            continue
        proposed = CourseMeeting(
            course=course, date=meeting_date, start_time=course.start_time,
            instructor=course.instructor, instructor_source="inherited", location=course.location,
            default_place=course.default_place, place=None,
            duration_minutes=course.duration_minutes,
        )
        conflicts = meeting_conflicts(proposed, candidates)
        if conflicts:
            yield proposed, "conflict", conflicts
        else:
            yield proposed, "new", []
            candidates.append(proposed)


@transaction.atomic
def generate_course_meetings_for_course(
    course,
    holiday_periods=None,
    public_holidays=None,
):
    # Refuse cancelled courses even if the caller holds an older Course object.
    if course.pk:
        from courses.models import Course
        status = Course.objects.select_for_update().get(pk=course.pk).status
        if status == "cancelled":
            raise ValidationError({"status": "Cancelled courses cannot generate meetings."})
    dates = course_meeting_dates(
        course,
        holiday_periods=holiday_periods,
        public_holidays=public_holidays,
    )
    result = MeetingGenerationResult()
    for meeting, status, conflicts in plan_meeting_dates(course, dates):
        if conflicts:
            result.conflicts[meeting.date] = conflicts
        if status == "conflict":
            continue
        if status == "new":
            proposed = meeting
            meeting, created = CourseMeeting.objects.get_or_create(
                course=course, date=meeting.date, start_time=meeting.start_time,
                defaults={
                    "instructor": meeting.instructor,
                    "instructor_source": "inherited",
                    "location": meeting.location,
                    "default_place": meeting.default_place,
                    "duration_minutes": meeting.duration_minutes,
                },
            )
            proposed.pk = meeting.pk
            if created:
                meeting.participants.set(course.participants.all())
                result.created_dates.append(meeting.date)
            else:
                result.existing_dates.append(meeting.date)
        else:
            result.existing_dates.append(meeting.date)
        result.append(meeting)
    return result
