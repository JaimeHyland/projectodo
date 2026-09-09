from datetime import date, datetime, time
from unittest.mock import patch
from zoneinfo import ZoneInfo

from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext

from courses import tests_workflow as workflow
from courses.models import Course, CourseMeeting
from courses.services.berlin_holidays import HolidayPeriod, HolidayCalendarUnavailable


class CourseDiagnosticsTests(TestCase):
    make_course = workflow.CourseActivationTests.make_course
    make_overlap = workflow.CourseActivationTests.make_overlap

    def setUp(self):
        workflow.CourseActivationTests.setUp(self)
        self.teacher.is_superuser = True
        self.teacher.save()
        self.client.force_login(self.teacher)
        self.url = f"/api/courses/{self.course.pk}/diagnostics/"

    def diagnostics(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        return response.json()

    def test_clean_draft_is_ready(self):
        data = self.diagnostics()
        self.assertTrue(data["ready_for_activation"])
        self.assertTrue(data["draft_resolution_mode"])
        self.assertEqual(data["issues"], [])
        self.assertEqual(data["warnings"], [])

    def test_all_conflict_kinds_are_structured(self):
        cases = [
            ({"default_place": self.other_place}, "instructor"),
            ({"instructor": self.other_teacher}, "place"),
            ({"instructor": self.other_teacher, "default_place": None}, "location"),
            ({"course": self.course}, "same_course"),
        ]
        for changes, kind in cases:
            with self.subTest(kind=kind):
                blocker = self.make_overlap(**changes)
                data = self.diagnostics()
                matching = [issue for issue in data["issues"]
                            if issue.get("conflict", {}).get("type") == kind]
                self.assertTrue(matching)
                detail = next(issue for issue in matching if issue["meeting_id"] == self.meeting.pk)
                self.assertEqual(detail["severity"], "blocking")
                self.assertEqual(detail["conflict"]["meeting_id"], blocker.pk)
                self.assertEqual(detail["conflict"]["course_id"], blocker.course_id)
                self.assertIn("end_datetime", detail["conflict"])
                self.assertFalse(data["ready_for_activation"])
                blocker.delete()

    def test_missing_and_accepted_open_resources(self):
        for field in ("instructor", "place"):
            for accepted in (False, True):
                with self.subTest(field=field, accepted=accepted):
                    self.meeting.instructor = None if field == "instructor" else self.teacher
                    self.meeting.instructor_source = "open" if field == "instructor" else "override"
                    self.meeting.place_is_open = field == "place"
                    self.meeting.instructor_open_accepted = accepted
                    self.meeting.place_open_accepted = accepted
                    self.meeting.save()
                    data = self.diagnostics()
                    self.assertEqual(data["ready_for_activation"], accepted)
                    items = data["warnings"] if accepted else data["issues"]
                    self.assertEqual(items[0]["type"], ("open_" if accepted else "missing_") + field)
                    self.assertEqual(items[0]["severity"], "warning" if accepted else "blocking")
                    self.assertEqual(items[0]["meeting_id"], self.meeting.pk)
                    self.assertEqual(items[0]["start_time"], "10:00:00")
                    with patch("courses.services.course_diagnostics.timezone.now",
                               return_value=datetime(2026, 8, 4, tzinfo=ZoneInfo("UTC"))):
                        past = self.diagnostics()
                    self.assertEqual(past["issues"][0]["type"], "missing_" + field)
                    self.assertEqual(past["warnings"], [])

    def test_cancelled_expected_meeting_is_represented_and_exempt(self):
        self.meeting.cancelled = True
        self.meeting.instructor = None
        self.meeting.default_place = None
        self.meeting.save()
        self.make_overlap()
        data = self.diagnostics()
        self.assertTrue(data["ready_for_activation"])
        self.assertEqual(data["issues"], [])

    def test_missing_expected_date_is_blocking(self):
        self.meeting.delete()
        data = self.diagnostics()
        self.assertEqual(data["issues"][0]["type"], "unresolved_proposal")
        self.assertIsNone(data["issues"][0]["meeting_id"])
        self.assertIn("proposal_id", data["issues"][0])
        self.assertFalse(data["ready_for_activation"])

    def test_holidays_are_not_missing_expected_dates(self):
        self.course.duration_type = "date_range"
        self.course.term_type = "school_term"
        self.course.days_of_week = "MO"
        self.course.end_date = date(2026, 8, 17)
        self.course.save()
        calendar = {
            "public": [HolidayPeriod(date(2026, 8, 10), date(2026, 8, 10), "Public", "public")],
            "school": [HolidayPeriod(date(2026, 8, 17), date(2026, 8, 17), "School", "school")],
        }
        with patch("courses.services.meeting_planning.get_berlin_holiday_calendar", return_value=calendar):
            self.assertTrue(self.diagnostics()["ready_for_activation"])

    def test_ordering_is_chronological_and_deterministic(self):
        self.meeting.instructor = None
        self.meeting.default_place = None
        self.meeting.save()
        self.make_overlap(course=self.course, date=date(2026, 8, 2),
                          start_time=time(11), instructor=None, default_place=None)
        self.make_overlap(course=self.course, date=date(2026, 8, 2),
                          start_time=time(9), instructor=None, default_place=None)
        first = self.diagnostics()
        self.assertEqual(first, self.diagnostics())
        keys = [(issue["date"], issue["start_time"], issue["type"]) for issue in first["issues"]]
        self.assertEqual(keys, sorted(keys))
        self.assertEqual(first["blocking_issue_count"], len(keys))

    def test_course_and_meeting_validation_errors(self):
        self.course.days_of_week = "INVALID"
        self.course.save()
        self.meeting.instructor_source = "INVALID"
        self.meeting.save()
        data = self.diagnostics()
        self.assertEqual({issue["type"] for issue in data["issues"]}, {"invalid_course", "invalid_meeting"})
        self.assertTrue(all("fields" in issue for issue in data["issues"]))

    def test_active_and_cancelled_courses_are_not_draft_resolution(self):
        for status in ("active", "cancelled"):
            with self.subTest(status=status):
                workflow.change_course_status(self.course, status)
                data = self.diagnostics()
                self.assertEqual(data["status"], status)
                self.assertFalse(data["draft_resolution_mode"])
                self.assertFalse(data["ready_for_activation"])

    def test_read_only_and_no_holiday_cache_writes(self):
        before_courses = list(Course.objects.values())
        before_meetings = list(CourseMeeting.objects.values())
        # Exercise the real holiday loader on a cache miss, without network calls.
        from courses.services.berlin_holidays import get_berlin_holiday_calendar
        with patch("courses.services.meeting_planning.get_berlin_holiday_calendar",
                   wraps=get_berlin_holiday_calendar), patch(
                       "courses.services.berlin_holidays.cache.get", return_value=None), patch(
                       "courses.services.berlin_holidays._fetch_holidays", return_value=[]), patch(
                       "courses.services.berlin_holidays.cache.set") as cache_set, CaptureQueriesContext(connection) as queries:
            self.diagnostics()
        cache_set.assert_not_called()
        self.assertFalse(any(query["sql"].lstrip().upper().startswith(
            ("INSERT", "UPDATE", "DELETE")) for query in queries))
        self.assertEqual(before_courses, list(Course.objects.values()))
        self.assertEqual(before_meetings, list(CourseMeeting.objects.values()))

    def test_permissions_not_found_and_get_only(self):
        self.assertEqual(self.client.post(self.url).status_code, 405)
        self.assertEqual(self.client.get("/api/courses/999999/diagnostics/").status_code, 404)
        self.client.force_login(self.other_teacher)
        self.assertEqual(self.client.get(self.url).status_code, 403)
        self.client.logout()
        self.assertEqual(self.client.get(self.url).status_code, 401)

    def test_calendar_failure_is_a_blocker(self):
        with patch("courses.services.meeting_planning.get_berlin_holiday_calendar",
                   side_effect=HolidayCalendarUnavailable("Unavailable")):
            data = self.diagnostics()
        self.assertFalse(data["ready_for_activation"])
        self.assertEqual(data["issues"][0]["type"], "calendar_unavailable")
