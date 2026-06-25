# courses/services/meeting_generation.py

from datetime import timedelta

from courses.models import ClassMeeting


DAY_CODES = {
    "MO": 0,
    "TU": 1,
    "WE": 2,
    "TH": 3,
    "FR": 4,
    "SA": 5,
    "SU": 6,
}


def generate_course_meetings_for_course(course):
    if course.duration_type == "one_off":
        dates = [course.start_date]
    else:
        end_date = course.end_date
        if not end_date:
            return []

        selected_weekdays = {
            DAY_CODES[day.strip()]
            for day in course.days_of_week.split(",")
            if day.strip()
        }

        excluded_dates = set()

        if course.term_type == "school_term":
            excluded_dates = get_excluded_school_dates(
                state=course.location.state,
                start_date=course.start_date,
                end_date=end_date,
            )

        dates = []
        current = course.start_date

        while current <= end_date:
            if (
                current.weekday() in selected_weekdays
                and current not in excluded_dates
            ):
                dates.append(current)

            current += timedelta(days=1)

    meetings = []

    for meeting_date in dates:
        meeting, created = ClassMeeting.objects.get_or_create(
            course=course,
            date=meeting_date,
            start_time=course.start_time,
            defaults={
                "instructor": course.instructor,
                "location": course.location,
                "duration_minutes": course.duration_minutes,
            },
        )

        if created:
            meeting.participants.set(course.participants.all())

        meetings.append(meeting)

    return meetings