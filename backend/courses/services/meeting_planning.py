from datetime import timedelta

from courses.models import CourseMeeting
from courses.services.berlin_holidays import get_berlin_holiday_calendar
from courses.services.meeting_generation import course_meeting_dates


HOLIDAY_SOURCE_URL = "https://openholidaysapi.org"


def _dates_in_periods(periods, valid_from, valid_to):
    dates = set()
    for period in periods:
        current_date = max(period.start_date, valid_from)
        end_date = min(period.end_date, valid_to)
        while current_date <= end_date:
            dates.add(current_date)
            current_date += timedelta(days=1)
    return dates


def build_course_meeting_plan(course):
    valid_to = course.end_date or course.start_date
    calendar = get_berlin_holiday_calendar(course.start_date, valid_to)
    public_dates = _dates_in_periods(
        calendar["public"], course.start_date, valid_to
    )
    school_periods = [
        (period.start_date, period.end_date)
        for period in calendar["school"]
    ]

    scheduled_dates = course_meeting_dates(
        course,
        holiday_periods=school_periods,
        public_holidays=public_dates,
    )
    possible_dates = course_meeting_dates(course)
    scheduled_set = set(scheduled_dates)
    existing_dates = set(
        CourseMeeting.objects.filter(
            course=course,
            date__in=scheduled_dates,
            start_time=course.start_time,
        ).values_list("date", flat=True)
    )

    excluded = []
    if course.duration_type != "one_off":
        for excluded_date in possible_dates:
            if excluded_date in scheduled_set:
                continue

            matching_public = next(
                (
                    period
                    for period in calendar["public"]
                    if period.start_date <= excluded_date <= period.end_date
                ),
                None,
            )
            matching_school = next(
                (
                    period
                    for period in calendar["school"]
                    if period.start_date <= excluded_date <= period.end_date
                ),
                None,
            )
            period = matching_public or matching_school
            excluded.append({
                "date": excluded_date,
                "kind": period.kind if period else "holiday",
                "name": period.name if period else "Holiday",
            })

    return {
        "scheduled_dates": scheduled_dates,
        "existing_dates": existing_dates,
        "excluded": excluded,
        "school_periods": school_periods,
        "public_dates": public_dates,
    }
