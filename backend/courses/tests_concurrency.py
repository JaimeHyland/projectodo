"""Real PostgreSQL lock contention; SQLite cannot verify these guarantees."""
from concurrent.futures import ThreadPoolExecutor
from datetime import date, time
from queue import Queue
from threading import Event
from time import monotonic, sleep
from unittest import skipUnless
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.db import connection, connections, transaction
from django.test import TransactionTestCase

from courses.models import Course, Location, Place
from courses.services.course_activation import (
    SchedulingValidationError, activate_draft_course, change_course_status,
)
from courses.services.course_editing import save_course_with_inherited_places
from courses.services.meeting_generation import generate_course_meetings_for_course
from courses.services.meeting_resolution import resolve_meeting


@skipUnless(connection.vendor == "postgresql", "Requires PostgreSQL row locks")
class SchedulingConcurrencyTests(TransactionTestCase):
    def setUp(self):
        calendar = patch("courses.services.meeting_planning.get_berlin_holiday_calendar",
                         return_value={"public": [], "school": []})
        calendar.start()
        self.addCleanup(calendar.stop)
        self.teacher = get_user_model().objects.create_user(username="teacher")
        self.course, self.meeting = self.make_course("first")

    def make_course(self, name):
        location = Location.objects.create(name=name)
        place = Place.objects.create(name="Room", location=location)
        teacher = get_user_model().objects.create_user(username=name)
        course = Course.objects.create(
            name=name, course_type="group", subject="guitar", term_type="all_year",
            duration_type="one_off", instructor=teacher, location=location,
            default_place=place, start_date=date(2099, 1, 5),
            start_time=time(10), duration_minutes=60,
        )
        return course, generate_course_meetings_for_course(course)[0]

    def contend(self, first, second):
        """Hold writer one's commit until PostgreSQL confirms writer two waits."""
        held, release = Event(), Event()
        second_pid = Queue()

        def worker(operation, leader):
            try:
                with transaction.atomic():
                    with connection.cursor() as cursor:
                        cursor.execute("SET LOCAL lock_timeout = '15s'")
                        cursor.execute("SET LOCAL statement_timeout = '20s'")
                        if not leader:
                            cursor.execute("SELECT pg_backend_pid()")
                            second_pid.put(cursor.fetchone()[0])
                    result = operation()
                    if leader:
                        held.set()
                        if not release.wait(15):
                            raise TimeoutError("First transaction was not released")
                    return result
            finally:
                connections.close_all()

        with ThreadPoolExecutor(max_workers=2) as pool:
            first_future = pool.submit(worker, first, True)
            try:
                if not held.wait(10):
                    first_future.result(timeout=1)
                    self.fail("First writer failed to acquire locks")
                second_future = pool.submit(worker, second, False)
                pid = second_pid.get(timeout=5)
                deadline = monotonic() + 10
                while monotonic() < deadline:
                    with connection.cursor() as cursor:
                        cursor.execute("SELECT wait_event_type FROM pg_stat_activity WHERE pid = %s", [pid])
                        row = cursor.fetchone()
                    if row and row[0] == "Lock":
                        break
                    if second_future.done():
                        self.fail(f"Second writer did not wait: {second_future.result()!r}")
                    sleep(0.02)
                else:
                    self.fail("PostgreSQL never reported lock contention")
            finally:
                release.set()
            return first_future.result(timeout=20), second_future.result(timeout=20)

    def test_duplicate_activation_is_serialized_and_idempotent(self):
        first, second = self.contend(
            lambda: activate_draft_course(self.course.pk),
            lambda: activate_draft_course(self.course.pk),
        )
        self.assertEqual((first[1], second[1]), (200, 200))
        self.assertTrue(first[0]["activated"])
        self.assertFalse(second[0]["activated"])
        self.assertTrue(second[0]["already_active"])
        self.course.refresh_from_db()
        self.assertEqual(self.course.status, "active")

    def test_concurrent_partial_meeting_edits_preserve_both_fields(self):
        self.contend(
            lambda: resolve_meeting(self.meeting.pk, {"start_time": "11:00:00"}),
            lambda: resolve_meeting(self.meeting.pk, {"duration_minutes": 45}),
        )
        self.meeting.refresh_from_db()
        self.assertEqual(self.meeting.start_time, time(11))
        self.assertEqual(self.meeting.duration_minutes, 45)

    def test_stale_course_edit_does_not_reverse_cancellation(self):
        stale = Course.objects.get(pk=self.course.pk)
        stale.name = "Edited name"
        self.contend(
            lambda: change_course_status(Course.objects.get(pk=self.course.pk), "cancelled"),
            lambda: save_course_with_inherited_places(stale),
        )
        self.course.refresh_from_db()
        self.assertEqual(self.course.status, "cancelled")
        self.assertEqual(self.course.name, "Edited name")

    def test_competing_active_instructor_assignments_cannot_double_book(self):
        other, other_meeting = self.make_course("second")
        activate_draft_course(self.course.pk)
        activate_draft_course(other.pk)
        changes = {"instructor_action": "override", "instructor_id": self.teacher.pk}

        def second():
            try:
                resolve_meeting(other_meeting.pk, changes)
            except SchedulingValidationError as error:
                return error.issues
            self.fail("Conflicting active assignment was accepted")

        _, issues = self.contend(lambda: resolve_meeting(self.meeting.pk, changes), second)
        self.assertTrue(any(issue.get("conflict", {}).get("type") == "instructor" for issue in issues))
        self.meeting.refresh_from_db()
        other_meeting.refresh_from_db()
        self.assertEqual(self.meeting.instructor_id, self.teacher.pk)
        self.assertEqual(other_meeting.instructor_id, other.instructor_id)

    def test_competing_active_place_assignments_cannot_double_book(self):
        other, other_meeting = self.make_course("second")
        location = Location.objects.create(name="Shared studio")
        place = Place.objects.create(name="Shared room", location=location)
        activate_draft_course(self.course.pk)
        activate_draft_course(other.pk)
        changes = {"place_action": "override", "place_id": place.pk}

        def second():
            try:
                resolve_meeting(other_meeting.pk, changes)
            except SchedulingValidationError as error:
                return error.issues
            self.fail("Conflicting active room assignment was accepted")

        _, issues = self.contend(lambda: resolve_meeting(self.meeting.pk, changes), second)
        self.assertTrue(any(issue.get("conflict", {}).get("type") == "place" for issue in issues))
        self.meeting.refresh_from_db()
        other_meeting.refresh_from_db()
        self.assertEqual(self.meeting.place_id, place.pk)
        self.assertIsNone(other_meeting.place_id)
        self.assertEqual(other_meeting.location_id, other.location_id)

    def test_edit_waits_for_activation_and_uses_active_validation(self):
        def second():
            try:
                resolve_meeting(self.meeting.pk, {"instructor_action": "open"})
            except SchedulingValidationError as error:
                return error.issues
            self.fail("Unacknowledged open instructor accepted after activation")

        _, issues = self.contend(lambda: activate_draft_course(self.course.pk), second)
        self.assertTrue(any(issue["type"] == "missing_instructor" for issue in issues))
        self.meeting.refresh_from_db()
        self.assertEqual(self.meeting.instructor_id, self.course.instructor_id)
