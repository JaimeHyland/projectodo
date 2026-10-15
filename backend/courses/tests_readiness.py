from datetime import datetime
from unittest.mock import patch
from zoneinfo import ZoneInfo

from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext

from courses import tests_workflow as workflow
from courses.models import Course, CourseMeeting
from courses.services.berlin_holidays import HolidayCalendarUnavailable, get_berlin_holiday_calendar


class CourseReadinessTests(TestCase):
    make_course = workflow.CourseActivationTests.make_course
    make_overlap = workflow.CourseActivationTests.make_overlap

    def setUp(self):
        workflow.CourseActivationTests.setUp(self)
        self.teacher.is_superuser = True
        self.teacher.save()
        self.client.force_login(self.teacher)
        self.url = f"/api/courses/{self.course.pk}/readiness/"

    def readiness(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        result = response.json()
        diagnostics = self.client.get(f"/api/courses/{self.course.pk}/diagnostics/").json()
        self.assertEqual({key: result[key] for key in diagnostics}, diagnostics)
        self.assertEqual(result["blocking_issue_count"], len(result["issues"]))
        self.assertEqual(result["warning_count"], len(result["warnings"]))
        return result

    def test_clean_draft_is_ready(self):
        result = self.readiness()
        self.assertTrue(result["ready_for_activation"])
        self.assertTrue(result["eligible_for_activation"])
        self.assertTrue(result["validation_passed"])
        self.assertFalse(result["already_active"])

    def test_all_conflict_types_block_readiness(self):
        for changes, kind in (
            ({"default_place": self.other_place}, "instructor"),
            ({"instructor": self.other_teacher}, "place"),
            ({"instructor": self.other_teacher, "default_place": None}, "location"),
            ({"course": self.course}, "same_course"),
        ):
            with self.subTest(kind=kind):
                blocker = self.make_overlap(**changes)
                result = self.readiness()
                self.assertFalse(result["ready_for_activation"])
                self.assertFalse(result["validation_passed"])
                self.assertIn(kind, [item.get("conflict", {}).get("type") for item in result["issues"]])
                blocker.delete()

    def test_missing_expected_date_blocks_readiness(self):
        self.meeting.delete()
        result = self.readiness()
        self.assertFalse(result["ready_for_activation"])
        self.assertEqual(result["issues"][0]["type"], "unresolved_proposal")

    def test_missing_assignments_and_future_acceptance(self):
        for resource in ("instructor", "place"):
            for accepted in (False, True):
                with self.subTest(resource=resource, accepted=accepted):
                    self.meeting.instructor = None if resource == "instructor" else self.teacher
                    self.meeting.instructor_source = "open" if resource == "instructor" else "override"
                    self.meeting.place_is_open = resource == "place"
                    self.meeting.instructor_open_accepted = accepted
                    self.meeting.place_open_accepted = accepted
                    self.meeting.save()
                    result = self.readiness()
                    self.assertEqual(result["ready_for_activation"], accepted)
                    if accepted:
                        self.assertEqual(result["issues"], [])
                        self.assertEqual(result["warnings"][0]["type"], "open_" + resource)
                    else:
                        self.assertEqual(result["issues"][0]["type"], "missing_" + resource)
                    with patch("courses.services.course_diagnostics.timezone.now",
                               return_value=datetime(2026, 8, 4, tzinfo=ZoneInfo("UTC"))):
                        result = self.readiness()
                    self.assertFalse(result["ready_for_activation"])
                    self.assertEqual(result["warnings"], [])
                    self.assertEqual(result["issues"][0]["type"], "missing_" + resource)

    def test_cancelled_expected_meeting_is_exempt_and_represented(self):
        self.meeting.cancelled = True
        self.meeting.instructor = None
        self.meeting.default_place = None
        self.meeting.save()
        self.make_overlap()
        result = self.readiness()
        self.assertTrue(result["ready_for_activation"])
        self.assertEqual(result["issues"], [])

    def test_calendar_unavailable_blocks_readiness(self):
        with patch("courses.services.meeting_planning.get_berlin_holiday_calendar",
                   side_effect=HolidayCalendarUnavailable("Unavailable")):
            result = self.readiness()
        self.assertFalse(result["ready_for_activation"])
        self.assertEqual(result["issues"][0]["type"], "calendar_unavailable")

    def test_active_reports_current_validation_without_draft_eligibility(self):
        workflow.change_course_status(self.course, "active")
        result = self.readiness()
        self.assertTrue(result["already_active"])
        self.assertTrue(result["validation_passed"])
        self.assertFalse(result["eligible_for_activation"])
        self.assertFalse(result["ready_for_activation"])
        self.make_overlap()
        self.assertFalse(self.readiness()["validation_passed"])

    def test_cancelled_course_is_ineligible(self):
        workflow.change_course_status(self.course, "cancelled")
        result = self.readiness()
        self.assertEqual(result["status"], "cancelled")
        self.assertFalse(result["eligible_for_activation"])
        self.assertFalse(result["ready_for_activation"])
        self.assertFalse(result["already_active"])

    def test_no_database_or_holiday_cache_writes(self):
        courses_before = list(Course.objects.values())
        meetings_before = list(CourseMeeting.objects.values())
        with patch("courses.services.meeting_planning.get_berlin_holiday_calendar",
                   wraps=get_berlin_holiday_calendar), patch(
                       "courses.services.berlin_holidays.cache.get", return_value=None), patch(
                       "courses.services.berlin_holidays._fetch_holidays", return_value=[]), patch(
                       "courses.services.berlin_holidays.cache.set") as cache_set, CaptureQueriesContext(connection) as queries:
            self.readiness()
        cache_set.assert_not_called()
        self.assertFalse(any(query["sql"].lstrip().upper().startswith(
            ("INSERT", "UPDATE", "DELETE")) for query in queries))
        self.assertEqual(courses_before, list(Course.objects.values()))
        self.assertEqual(meetings_before, list(CourseMeeting.objects.values()))

    def test_permissions_method_and_missing_course(self):
        self.assertEqual(self.client.post(self.url).status_code, 405)
        self.assertEqual(self.client.get("/api/courses/999999/readiness/").status_code, 404)
        self.client.force_login(self.other_teacher)
        self.assertEqual(self.client.get(self.url).status_code, 403)
        self.client.logout()
        self.assertEqual(self.client.get(self.url).status_code, 401)
