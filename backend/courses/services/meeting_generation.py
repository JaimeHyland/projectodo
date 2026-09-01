# courses/services/meeting_generation.py

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


def generate_course_meetings_for_course(
    course,
    holiday_periods=None,
    public_holidays=None,
):
    dates = course_meeting_dates(
        course,
        holiday_periods=holiday_periods,
        public_holidays=public_holidays,
    )

    meetings = []

    for meeting_date in dates:
        meeting, created = CourseMeeting.objects.get_or_create(
            course=course,
            date=meeting_date,
            start_time=course.start_time,
            defaults={
                "instructor": course.instructor,
                "location": course.location,
                "default_place": course.default_place,
                "place": None,
                "duration_minutes": course.duration_minutes,
            },
        )

        if created:
            meeting.participants.set(course.participants.all())

        meetings.append(meeting)

    return meetings
