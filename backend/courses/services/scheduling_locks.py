"""Serialize scheduling writes sharing teaching resources on row-locking DBs."""

from django.contrib.auth import get_user_model

from courses.models import Location


def lock_meeting_resources(meetings):
    location_ids = {meeting.location_id for meeting in meetings if meeting.location_id}
    instructor_ids = {meeting.instructor_id for meeting in meetings if meeting.instructor_id}
    list(Location.objects.select_for_update().filter(pk__in=location_ids)
         .order_by("pk").values_list("pk", flat=True))
    list(get_user_model().objects.select_for_update().filter(pk__in=instructor_ids)
         .order_by("pk").values_list("pk", flat=True))
