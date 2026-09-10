"""Persist dashboard edits and synchronize inherited meeting places."""
from django.db import transaction

from courses.models import Course
from courses.services.scheduling_locks import lock_meeting_resources


@transaction.atomic
def save_course_with_inherited_places(course):
    locked = Course.objects.select_for_update().get(pk=course.pk)
    # A concurrent activation/cancellation must not be overwritten by an edit.
    course.status = locked.status
    meetings = list(course.meetings.select_for_update().filter(
        place__isnull=True, place_is_open=False, location_id=course.location_id,
    ).order_by("pk"))
    lock_meeting_resources(meetings)
    for meeting in meetings:
        if meeting.default_place_id != course.default_place_id:
            meeting.default_place = course.default_place
            meeting.full_clean()
            meeting.save(update_fields=["default_place"])
    course.full_clean()
    course.save()
