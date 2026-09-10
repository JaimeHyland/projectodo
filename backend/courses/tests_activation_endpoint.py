from datetime import datetime
from unittest.mock import patch
from zoneinfo import ZoneInfo

from django.db import connection
from django.contrib.auth.models import Group
from django.test import TestCase
from django.test.utils import CaptureQueriesContext

from courses import tests_workflow as workflow
from courses.models import Course, CourseMeeting
from courses.services.berlin_holidays import HolidayCalendarUnavailable, get_berlin_holiday_calendar
from courses.services.scheduling_locks import lock_meeting_resources


class ActivationEndpointTests(TestCase):
    make_course = workflow.CourseActivationTests.make_course
    make_overlap = workflow.CourseActivationTests.make_overlap

    def setUp(self):
        workflow.CourseActivationTests.setUp(self)
        self.teacher.is_superuser = True
        self.teacher.save()
        self.client.force_login(self.teacher)
        self.url = f"/api/courses/{self.course.pk}/activate/"

    def activate(self, status=200):
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, status, response.content)
        return response.json()

    def test_clean_activation_uses_locks_and_changes_only_status(self):
        before = Course.objects.values().get(pk=self.course.pk)
        meetings = list(CourseMeeting.objects.values())
        ready = self.client.get(f"/api/courses/{self.course.pk}/readiness/").json()
        self.assertTrue(ready["ready_for_activation"])
        with patch("courses.services.scheduling_locks.lock_meeting_resources",
                   wraps=lock_meeting_resources) as locking:
            result = self.activate()
        self.assertTrue(locking.called)
        self.assertTrue(result["ok"])
        self.assertTrue(result["activated"])
        self.assertFalse(result["already_active"])
        self.assertEqual(result["status"], "active")
        before["status"] = "active"
        self.assertEqual(before, Course.objects.values().get(pk=self.course.pk))
        self.assertEqual(meetings, list(CourseMeeting.objects.values()))
        current = self.client.get(f"/api/courses/{self.course.pk}/readiness/").json()
        self.assertEqual(result["issues"], current["issues"])
        self.assertEqual(result["warnings"], current["warnings"])
        self.assertEqual(result["validation_passed"], current["validation_passed"])

    def test_conflicts_reject_without_writes_and_match_readiness(self):
        for changes, kind in (
            ({"default_place": self.other_place}, "instructor"),
            ({"instructor": self.other_teacher}, "place"),
            ({"instructor": self.other_teacher, "default_place": None}, "location"),
            ({"course": self.course}, "same_course"),
        ):
            with self.subTest(kind=kind):
                blocker = self.make_overlap(**changes)
                before = list(CourseMeeting.objects.values())
                ready = self.client.get(f"/api/courses/{self.course.pk}/readiness/").json()
                result = self.activate(400)
                self.assertFalse(result["ok"])
                self.assertEqual(result["issues"], ready["issues"])
                self.assertIn(kind, [issue.get("conflict", {}).get("type") for issue in result["issues"]])
                self.course.refresh_from_db()
                self.assertEqual(self.course.status, "draft")
                self.assertEqual(before, list(CourseMeeting.objects.values()))
                blocker.delete()

    def test_missing_expected_meeting_is_not_generated(self):
        self.meeting.delete()
        result = self.activate(400)
        self.assertEqual(result["issues"][0]["type"], "unresolved_proposal")
        self.assertEqual(CourseMeeting.objects.count(), 0)

    def test_future_open_assignments_require_acceptance_and_return_warnings(self):
        for resource in ("instructor", "place"):
            with self.subTest(resource=resource):
                self.meeting.instructor = None if resource == "instructor" else self.teacher
                self.meeting.instructor_source = "open" if resource == "instructor" else "override"
                self.meeting.place_is_open = resource == "place"
                self.meeting.instructor_open_accepted = False
                self.meeting.place_open_accepted = False
                self.meeting.save()
                result = self.activate(400)
                self.assertEqual(result["issues"][0]["type"], "missing_" + resource)
                setattr(self.meeting, resource + "_open_accepted", True)
                self.meeting.save()
                result = self.activate()
                self.assertTrue(result["activated"])
                self.assertEqual(result["issues"], [])
                self.assertEqual(result["warnings"][0]["type"], "open_" + resource)
                self.assertEqual(result["warning_count"], 1)
                workflow.change_course_status(self.course, "draft")

    def test_past_missing_assignments_block_even_when_accepted(self):
        for resource in ("instructor", "place"):
            with self.subTest(resource=resource):
                self.meeting.instructor = None if resource == "instructor" else self.teacher
                self.meeting.place_is_open = resource == "place"
                self.meeting.instructor_open_accepted = True
                self.meeting.place_open_accepted = True
                self.meeting.save()
                with patch("courses.services.course_activation.timezone.now",
                           return_value=datetime(2026, 8, 4, tzinfo=ZoneInfo("UTC"))):
                    result = self.activate(400)
                self.assertEqual(result["issues"][0]["type"], "missing_" + resource)
                self.assertEqual(result["warnings"], [])

    def test_cancelled_expected_meeting_is_exempt(self):
        self.meeting.cancelled = True
        self.meeting.instructor = None
        self.meeting.default_place = None
        self.meeting.save()
        self.make_overlap()
        self.assertTrue(self.activate()["activated"])

    def test_calendar_failure_leaves_draft_unchanged(self):
        with patch("courses.services.meeting_planning.get_berlin_holiday_calendar",
                   side_effect=HolidayCalendarUnavailable("Unavailable")):
            result = self.activate(400)
        self.assertEqual(result["issues"][0]["type"], "calendar_unavailable")
        self.course.refresh_from_db()
        self.assertEqual(self.course.status, "draft")

    def test_already_active_is_a_no_write_response(self):
        self.activate()
        with CaptureQueriesContext(connection) as queries:
            result = self.activate()
        self.assertTrue(result["already_active"])
        self.assertFalse(result["activated"])
        self.assertFalse(any(query["sql"].lstrip().upper().startswith(
            ("INSERT", "UPDATE", "DELETE")) for query in queries))

    def test_exception_after_status_write_rolls_back_activation(self):
        from courses.services.course_activation import activate_draft_course
        from courses.services.course_diagnostics import course_readiness

        before = list(CourseMeeting.objects.values())

        def readiness(course):
            self.assertTrue(connection.in_atomic_block)
            if course.status == "active":
                raise RuntimeError("Simulated response preparation failure")
            return course_readiness(course)

        with patch("courses.services.course_diagnostics.course_readiness", side_effect=readiness):
            with self.assertRaises(RuntimeError):
                activate_draft_course(self.course.pk)

        self.course.refresh_from_db()
        self.assertEqual(self.course.status, "draft")
        self.assertEqual(before, list(CourseMeeting.objects.values()))

    def test_webmaster_group_can_activate_without_superuser_status(self):
        self.teacher.is_superuser = False
        self.teacher.save()
        self.teacher.groups.add(Group.objects.get_or_create(name="webmaster")[0])
        self.assertTrue(self.activate()["activated"])

    def test_cancelled_course_cannot_be_reactivated(self):
        workflow.change_course_status(self.course, "cancelled")
        result = self.activate(409)
        self.assertEqual(result["error"]["type"], "course_cancelled")
        self.assertFalse(result["activated"])
        self.course.refresh_from_db()
        self.assertEqual(self.course.status, "cancelled")

    def test_stale_readiness_does_not_authorize_activation(self):
        self.assertTrue(self.client.get(f"/api/courses/{self.course.pk}/readiness/").json()["ready_for_activation"])
        self.make_overlap()
        self.assertFalse(self.activate(400)["ready_for_activation"])

    def test_activation_never_writes_holiday_cache(self):
        with patch("courses.services.meeting_planning.get_berlin_holiday_calendar",
                   wraps=get_berlin_holiday_calendar), patch(
                       "courses.services.berlin_holidays.cache.get", return_value=None), patch(
                       "courses.services.berlin_holidays._fetch_holidays", return_value=[]), patch(
                       "courses.services.berlin_holidays.cache.set") as cache_set:
            self.activate()
        cache_set.assert_not_called()

    def test_permissions_method_and_not_found(self):
        self.assertEqual(self.client.get(self.url).status_code, 405)
        self.assertEqual(self.client.post("/api/courses/999999/activate/").status_code, 404)
        self.client.force_login(self.other_teacher)
        self.activate(403)
        self.client.logout()
        self.activate(401)
