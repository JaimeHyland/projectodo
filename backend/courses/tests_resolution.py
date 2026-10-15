from datetime import date, datetime, time
from unittest.mock import patch
from zoneinfo import ZoneInfo

from django.test import TestCase, override_settings

from courses import tests_workflow as workflow
from courses.models import Course, CourseMeeting, Location, Place


class MeetingResolutionTests(TestCase):
    make_course = workflow.CourseActivationTests.make_course
    make_overlap = workflow.CourseActivationTests.make_overlap

    def setUp(self):
        workflow.CourseActivationTests.setUp(self)
        self.teacher.is_superuser = True
        self.teacher.save()
        self.client.force_login(self.teacher)
        self.url = f"/api/courses/meetings/{self.meeting.pk}/"

    def update(self, data, expected=200):
        response = self.client.patch(self.url, data=data, content_type="application/json")
        self.assertEqual(response.status_code, expected, response.content)
        return response.json()

    def test_get_returns_assignment_context_without_writes(self):
        from django.db import connection
        from django.test.utils import CaptureQueriesContext
        with CaptureQueriesContext(connection) as queries, patch(
                "courses.services.berlin_holidays.cache.set") as cache_set:
            response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        data = response.json()["meeting"]
        self.assertEqual(data["instructor_source"], "inherited")
        self.assertEqual(data["place_state"], "inherit")
        self.assertEqual(data["course_defaults"]["place_id"], self.place.pk)
        self.assertFalse(data["is_past"])
        self.assertIn("+", data["start_datetime"])
        self.assertFalse(any(q["sql"].lstrip().upper().startswith(
            ("INSERT", "UPDATE", "DELETE")) for q in queries))
        cache_set.assert_not_called()

    def test_get_permissions_missing_and_open_cancelled_state(self):
        self.meeting.instructor_source = "open"
        self.meeting.instructor = None
        self.meeting.place_is_open = True
        self.meeting.place_open_accepted = True
        self.meeting.cancelled = True
        self.meeting.save()
        data = self.client.get(self.url).json()["meeting"]
        self.assertEqual(data["instructor_source"], "open")
        self.assertEqual(data["place_state"], "open")
        self.assertTrue(data["place_open_accepted"])
        self.assertTrue(data["cancelled"])
        self.assertEqual(self.client.get("/api/courses/meetings/999999/").status_code, 404)
        self.client.force_login(self.other_teacher)
        self.assertEqual(self.client.get(self.url).status_code, 403)
        self.client.logout()
        self.assertEqual(self.client.get(self.url).status_code, 401)

    @override_settings(TIME_ZONE="Europe/Berlin")
    def test_get_past_flag_uses_scheduled_start_not_calendar_date(self):
        for hour, expected in ((7, False), (9, True)):
            with patch("courses.services.meeting_resolution.timezone.now",
                       return_value=datetime(2026, 8, 3, hour, tzinfo=ZoneInfo("UTC"))):
                data = self.client.get(self.url).json()["meeting"]
            self.assertEqual(data["is_past"], expected)

    def test_patch_preserves_unspecified_fields_and_other_rows(self):
        other = self.make_overlap(start_time=time(15))
        before = CourseMeeting.objects.values().get(pk=self.meeting.pk)
        other_before = CourseMeeting.objects.values().get(pk=other.pk)
        course_before = Course.objects.values().get(pk=self.course.pk)
        self.meeting.participants.add(self.other_teacher)
        result = self.update({"duration_minutes": 75})
        after = CourseMeeting.objects.values().get(pk=self.meeting.pk)
        self.assertEqual({k: v for k, v in before.items() if k != "duration_minutes"},
                         {k: v for k, v in after.items() if k != "duration_minutes"})
        self.assertEqual(after["duration_minutes"], 75)
        self.assertEqual(other_before, CourseMeeting.objects.values().get(pk=other.pk))
        self.assertEqual(course_before, Course.objects.values().get(pk=self.course.pk))
        self.assertEqual(list(self.meeting.participants.all()), [self.other_teacher])
        self.assertIn("course_diagnostics", result)
        self.assertFalse(result["meeting"]["has_blocking_issues"])
        self.assertEqual(CourseMeeting.objects.count(), 2)

    def test_assignment_transitions_for_both_resources(self):
        for resource, override_id, default_id in (
            ("instructor", self.other_teacher.pk, self.teacher.pk),
            ("place", self.other_place.pk, self.place.pk),
        ):
            with self.subTest(resource=resource):
                action = resource + "_action"
                accepted = resource + "_open_accepted"
                identifier = "instructor_id" if resource == "instructor" else "effective_place_id"
                result = self.update({action: "open"})["meeting"]
                self.assertIsNone(result[identifier])
                self.assertFalse(result[accepted])
                self.assertTrue(result["has_blocking_issues"])
                result = self.update({accepted: True})["meeting"]
                self.assertTrue(result["has_warnings"])
                self.assertFalse(result["has_blocking_issues"])
                self.assertFalse(self.update({accepted: False})["meeting"][accepted])
                self.update({accepted: True})
                result = self.update({action: "override", resource + "_id": override_id})["meeting"]
                self.assertEqual(result[identifier], override_id)
                self.assertFalse(result[accepted])
                self.assertEqual(result["instructor_source" if resource == "instructor" else "place_state"], "override")
                result = self.update({action: "inherit"})["meeting"]
                self.assertEqual(result[identifier], default_id)
                self.assertEqual(result["instructor_source" if resource == "instructor" else "place_state"],
                                 "inherited" if resource == "instructor" else "inherit")

    def test_inherit_explicitly_refreshes_current_course_defaults(self):
        self.course.instructor = self.other_teacher
        self.course.default_place = self.other_place
        self.course.save()
        result = self.update({"instructor_action": "inherit", "place_action": "inherit"})["meeting"]
        self.assertEqual(result["instructor_id"], self.other_teacher.pk)
        self.assertEqual(result["default_place_id"], self.other_place.pk)

    def test_other_location_place_updates_meeting_location(self):
        location = Location.objects.create(name="Elsewhere")
        place = Place.objects.create(location=location, name="Room")
        result = self.update({"place_action": "override", "place_id": place.pk})["meeting"]
        self.assertEqual(result["location_id"], location.pk)
        self.assertIsNone(result["default_place_id"])
        result = self.update({"place_action": "inherit"})["meeting"]
        self.assertEqual(result["location_id"], self.location.pk)
        self.assertEqual(result["effective_place_id"], self.place.pk)

    def test_date_time_duration_changes_return_completeness_diagnostics(self):
        result = self.update({"date": "2026-08-04", "start_time": "12:30", "duration_minutes": 90})
        self.assertEqual(result["meeting"]["date"], "2026-08-04")
        self.assertEqual(result["meeting"]["start_time"], "12:30:00")
        self.assertEqual(result["meeting"]["duration_minutes"], 90)
        self.assertEqual(result["course_diagnostics"]["issues"][0]["type"], "unresolved_proposal")

    def test_draft_conflicts_are_persisted_with_explicit_blockers(self):
        blocker = self.make_overlap(start_time=time(12))
        result = self.update({"start_time": "11:30"})
        self.assertTrue(result["meeting"]["has_blocking_issues"])
        self.assertEqual({item["type"] for item in result["meeting"]["conflicts"]}, {"instructor", "place"})
        self.assertTrue(all(item["meeting_id"] == blocker.pk for item in result["meeting"]["conflicts"]))
        self.assertFalse(result["course_diagnostics"]["ready_for_activation"])

    def test_back_to_back_is_allowed(self):
        self.make_overlap(start_time=time(12))
        result = self.update({"start_time": "11:00"})
        self.assertEqual(result["meeting"]["conflicts"], [])

    def test_midnight_overlap_is_reported(self):
        self.make_overlap(date=date(2026, 8, 4), start_time=time(0))
        result = self.update({"start_time": "23:30"})
        self.assertTrue(result["meeting"]["conflicts"])

    def test_active_conflicts_are_rejected_atomically(self):
        workflow.change_course_status(self.course, "active")
        for changes, expected_kind in (
            ({"default_place": self.other_place}, "instructor"),
            ({"instructor": self.other_teacher}, "place"),
            ({"instructor": self.other_teacher, "default_place": None}, "location"),
        ):
            with self.subTest(kind=expected_kind):
                blocker = self.make_overlap(start_time=time(12), **changes)
                before = CourseMeeting.objects.values().get(pk=self.meeting.pk)
                result = self.update({"start_time": "11:30", "duration_minutes": 90}, 400)
                self.assertIn(expected_kind, [item.get("conflict", {}).get("type") for item in result["errors"]])
                self.assertEqual(before, CourseMeeting.objects.values().get(pk=self.meeting.pk))
                blocker.delete()

    def test_active_open_requires_acceptance_and_future_start(self):
        workflow.change_course_status(self.course, "active")
        for resource in ("instructor", "place"):
            with self.subTest(resource=resource):
                action = resource + "_action"
                accepted = resource + "_open_accepted"
                self.update({action: "open"}, 400)
                result = self.update({action: "open", accepted: True})
                self.assertTrue(result["meeting"]["has_warnings"])
                self.update({accepted: False}, 400)
                self.update({action: "inherit"})

    def test_past_draft_requires_real_assignments_even_if_accepted(self):
        with patch("courses.services.meeting_resolution.timezone.now",
                   return_value=datetime(2026, 8, 4, tzinfo=ZoneInfo("UTC"))):
            for resource in ("instructor", "place"):
                with self.subTest(resource=resource):
                    before = CourseMeeting.objects.values().get(pk=self.meeting.pk)
                    result = self.update({resource + "_action": "open", resource + "_open_accepted": True}, 400)
                    self.assertEqual(result["errors"][0]["type"], "missing_" + resource)
                    self.assertEqual(before, CourseMeeting.objects.values().get(pk=self.meeting.pk))

    def test_past_draft_overlap_is_rejected(self):
        self.make_overlap(start_time=time(12))
        with patch("courses.services.meeting_resolution.timezone.now",
                   return_value=datetime(2026, 8, 4, tzinfo=ZoneInfo("UTC"))):
            self.update({"start_time": "11:30"}, 400)

    def test_cancellation_and_uncancellation(self):
        workflow.change_course_status(self.course, "active")
        result = self.update({"cancelled": True, "instructor_action": "open", "place_action": "open"})
        self.assertTrue(result["meeting"]["cancelled"])
        self.assertEqual(result["meeting"]["issues"], [])
        self.assertEqual(CourseMeeting.objects.count(), 1)
        self.update({"cancelled": False}, 400)
        self.meeting.refresh_from_db()
        self.assertTrue(self.meeting.cancelled)
        self.update({"cancelled": False, "instructor_action": "inherit", "place_action": "inherit"})

    def test_past_cancelled_is_exempt(self):
        with patch("courses.services.meeting_resolution.timezone.now",
                   return_value=datetime(2026, 8, 4, tzinfo=ZoneInfo("UTC"))):
            self.update({"cancelled": True, "instructor_action": "open", "place_action": "open"})
            self.update({"cancelled": False}, 400)

    def test_active_date_move_cannot_leave_unrepresented_expected_date(self):
        workflow.change_course_status(self.course, "active")
        result = self.update({"date": "2026-08-04"}, 400)
        self.assertEqual(result["errors"][0]["type"], "unresolved_proposal")
        self.meeting.refresh_from_db()
        self.assertEqual(self.meeting.date, date(2026, 8, 3))

    def test_invalid_payloads_do_not_partially_apply(self):
        before = CourseMeeting.objects.values().get(pk=self.meeting.pk)
        for payload in (
            [], {"instructor_id": None}, {"place_id": None}, {"instructor_action": "other"},
            {"instructor_action": "override", "instructor_id": 999999},
            {"place_action": "override", "place_id": True}, {"date": "not-a-date"},
            {"start_time": "10:00+02:00"}, {"cancelled": "false"},
            {"duration_minutes": True}, {"duration_minutes": -1},
            {"instructor_open_accepted": True}, {"course_id": self.course.pk},
            {"instructor_action": "open", "date": None},
        ):
            with self.subTest(payload=payload):
                self.update(payload, 400)
                self.assertEqual(before, CourseMeeting.objects.values().get(pk=self.meeting.pk))

    def test_permissions_method_and_missing_meeting(self):
        self.assertEqual(self.client.post(self.url).status_code, 405)
        self.assertEqual(self.client.patch("/api/courses/meetings/999999/", data={}, content_type="application/json").status_code, 404)
        self.client.force_login(self.other_teacher)
        self.update({}, 403)
        self.client.logout()
        self.update({}, 401)
