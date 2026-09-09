from datetime import date, datetime, time, timedelta
from unittest.mock import patch
from zoneinfo import ZoneInfo

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TestCase, TransactionTestCase, override_settings

from courses.models import Course, CourseMeeting, Location, Place
from courses.services.course_activation import (
    SchedulingValidationError, active_course_open_warnings, change_course_status,
    course_activation_issues, meeting_scheduling_issues,
)
from courses.services.meeting_generation import generate_course_meetings_for_course
from courses.services.meeting_planning import build_course_meeting_plan


class CourseActivationTests(TestCase):
    def setUp(self):
        self.calendar = patch(
            "courses.services.meeting_planning.get_berlin_holiday_calendar",
            return_value={"public": [], "school": []},
        )
        self.calendar.start()
        self.addCleanup(self.calendar.stop)
        self.clock = patch("courses.services.course_activation.timezone.now",
                           return_value=datetime(2026, 8, 1, tzinfo=ZoneInfo("UTC")))
        self.clock.start()
        self.addCleanup(self.clock.stop)
        self.teacher = get_user_model().objects.create_user(username="teacher")
        self.other_teacher = get_user_model().objects.create_user(username="other")
        self.location = Location.objects.create(name="School")
        self.place = Place.objects.create(name="Room", location=self.location)
        self.other_place = Place.objects.create(name="Other room", location=self.location)
        self.course = self.make_course()
        self.meeting = generate_course_meetings_for_course(self.course)[0]

    def make_course(self, **changes):
        values = dict(name="Lessons", course_type="group", subject="guitar",
                      term_type="all_year", duration_type="one_off",
                      instructor=self.teacher, location=self.location,
                      default_place=self.place, start_date=date(2026, 8, 3),
                      start_time=time(10), duration_minutes=60)
        values.update(changes)
        return Course.objects.create(**values)

    def make_overlap(self, **changes):
        other_course = self.make_course()
        values = dict(course=other_course, instructor=self.teacher,
                      location=self.location, default_place=self.place,
                      date=self.meeting.date, start_time=time(10, 30), duration_minutes=60)
        values.update(changes)
        return CourseMeeting.objects.create(**values)

    def activate(self):
        return change_course_status(self.course, "active")

    def assert_invalid(self, kind):
        with self.assertRaises(SchedulingValidationError) as context:
            self.activate()
        self.assertIn(kind, [issue["type"] for issue in context.exception.issues])
        self.course.refresh_from_db()
        self.assertEqual(self.course.status, "draft")
        return context.exception.issues

    def test_valid_draft_activates(self):
        self.activate()
        self.course.refresh_from_db()
        self.assertEqual(self.course.status, "active")

    def test_draft_can_persist_unresolved_and_conflicting_meetings(self):
        self.meeting.instructor = None
        self.meeting.place_is_open = True
        self.meeting.save()
        self.make_overlap(course=self.course)
        issues = self.assert_invalid("missing_instructor")
        self.assertIn("conflict", [issue["type"] for issue in issues])

    def test_instructor_overlap_prevents_activation(self):
        self.make_overlap(default_place=self.other_place)
        issues = self.assert_invalid("conflict")
        self.assertEqual(issues[0]["conflict"]["type"], "instructor")

    def test_effective_place_overlap_prevents_activation(self):
        self.make_overlap(instructor=self.other_teacher, default_place=self.other_place,
                          place=self.place)
        issues = self.assert_invalid("conflict")
        self.assertEqual(issues[0]["conflict"]["type"], "place")

    def test_back_to_back_allows_activation(self):
        self.make_overlap(start_time=time(11))
        self.activate()

    def test_cancelled_blocker_does_not_prevent_activation(self):
        self.make_overlap(cancelled=True)
        self.activate()

    def test_future_null_instructor_requires_acknowledgement(self):
        self.meeting.instructor = None
        self.meeting.instructor_source = "open"
        self.meeting.save()
        self.assert_invalid("missing_instructor")
        self.meeting.instructor_open_accepted = True
        self.meeting.save()
        self.activate()
        self.assertEqual(active_course_open_warnings(self.course)[0]["open_fields"], ["instructor"])

    def test_accidental_null_instructor_not_accepted(self):
        self.meeting.instructor = None
        self.meeting.save()
        self.assert_invalid("missing_instructor")

    def test_future_open_place_requires_acknowledgement(self):
        self.meeting.place_is_open = True
        self.meeting.save()
        self.assertIsNone(self.meeting.effective_place)
        self.assert_invalid("missing_place")
        self.meeting.place_open_accepted = True
        self.meeting.save()
        self.activate()
        self.assertEqual(active_course_open_warnings(self.course)[0]["open_fields"], ["place"])

    def test_null_default_place_also_requires_acknowledgement(self):
        self.meeting.default_place = None
        self.meeting.save()
        self.assert_invalid("missing_place")

    def test_past_missing_resources_cannot_be_acknowledged(self):
        for field in ("instructor", "place"):
            with self.subTest(field=field):
                self.meeting.instructor = None if field == "instructor" else self.teacher
                self.meeting.place_is_open = field == "place"
                self.meeting.instructor_open_accepted = True
                self.meeting.place_open_accepted = True
                self.meeting.save()
                with patch("courses.services.course_activation.timezone.now",
                           return_value=datetime(2026, 8, 4, tzinfo=ZoneInfo("UTC"))):
                    self.assert_invalid("missing_" + field)

    def test_past_overlap_prevents_activation(self):
        self.make_overlap()
        with patch("courses.services.course_activation.timezone.now",
                   return_value=datetime(2026, 8, 4, tzinfo=ZoneInfo("UTC"))):
            self.assert_invalid("conflict")

    def test_cancelled_past_missing_resources_are_exempt(self):
        self.meeting.instructor = None
        self.meeting.default_place = None
        self.meeting.cancelled = True
        self.meeting.save()
        self.make_overlap()
        with patch("courses.services.course_activation.timezone.now",
                   return_value=datetime(2026, 8, 4, tzinfo=ZoneInfo("UTC"))):
            self.activate()
        self.assertTrue(CourseMeeting.objects.filter(pk=self.meeting.pk, cancelled=True).exists())

    def test_overrides_survive_regeneration(self):
        self.meeting.instructor = self.other_teacher
        self.meeting.instructor_source = "override"
        self.meeting.place = self.other_place
        self.meeting.save()
        self.assertEqual(generate_course_meetings_for_course(self.course)[0].pk, self.meeting.pk)
        self.meeting.refresh_from_db()
        self.assertEqual(self.meeting.effective_instructor, self.other_teacher)
        self.assertEqual(self.meeting.effective_place, self.other_place)

    def test_explicit_open_states_survive_regeneration(self):
        self.meeting.instructor = None
        self.meeting.instructor_source = "open"
        self.meeting.place_is_open = True
        self.meeting.instructor_open_accepted = True
        self.meeting.place_open_accepted = True
        self.meeting.save()
        generate_course_meetings_for_course(self.course)
        self.meeting.refresh_from_db()
        self.assertIsNone(self.meeting.effective_instructor)
        self.assertIsNone(self.meeting.effective_place)
        self.assertTrue(self.meeting.instructor_open_accepted)
        self.assertTrue(self.meeting.place_open_accepted)
        self.activate()

    def test_inherited_snapshots_do_not_change_with_course_defaults(self):
        self.assertEqual(self.meeting.instructor_source, "inherited")
        self.course.instructor = self.other_teacher
        self.course.default_place = self.other_place
        self.course.save()
        generate_course_meetings_for_course(self.course)
        self.meeting.refresh_from_db()
        self.assertEqual(self.meeting.effective_instructor, self.teacher)
        self.assertEqual(self.meeting.effective_place, self.place)

    def test_open_place_does_not_reserve_parent_location(self):
        self.meeting.place_is_open = True
        self.meeting.place_open_accepted = True
        self.meeting.save()
        self.make_overlap(instructor=self.other_teacher)
        self.activate()

    def test_two_null_instructors_are_not_an_instructor_conflict(self):
        self.meeting.instructor = None
        self.meeting.instructor_open_accepted = True
        self.meeting.save()
        self.make_overlap(instructor=None, default_place=self.other_place)
        self.activate()

    def test_saved_draft_conflicts_are_reported_in_preview(self):
        self.make_overlap()
        plan = build_course_meeting_plan(self.course)
        self.assertIn(self.meeting.date, plan["conflicts"])

    def test_skipped_proposal_cannot_be_silently_activated(self):
        other = self.make_course()
        generated = generate_course_meetings_for_course(other)
        self.assertEqual(len(generated), 0)
        with self.assertRaises(SchedulingValidationError) as context:
            change_course_status(other, "active")
        issue = context.exception.issues[0]
        self.assertEqual(issue["type"], "unresolved_proposal")
        self.assertTrue(issue["conflicts"])
        self.assertIn(str(other.pk), issue["proposal_id"])

    def test_cancelled_course_cannot_generate_and_preserves_history(self):
        stale = Course.objects.get(pk=self.course.pk)
        change_course_status(self.course, "cancelled")
        with self.assertRaises(ValidationError):
            generate_course_meetings_for_course(stale)
        self.assertTrue(CourseMeeting.objects.filter(pk=self.meeting.pk).exists())
        self.assertEqual(build_course_meeting_plan(self.course)["scheduled_dates"], [])

    def test_active_meeting_edits_are_guarded(self):
        self.activate()
        self.meeting.instructor = None
        with self.assertRaises(SchedulingValidationError):
            self.meeting.save()
        self.meeting.refresh_from_db()
        self.assertEqual(self.meeting.instructor, self.teacher)

    def test_active_meeting_inserts_are_guarded(self):
        self.activate()
        with self.assertRaises(SchedulingValidationError):
            self.make_overlap(course=self.course)
        self.assertEqual(self.course.meetings.count(), 1)

    def test_direct_status_save_cannot_bypass_activation(self):
        self.make_overlap()
        self.course.status = "active"
        with self.assertRaises(SchedulingValidationError):
            self.course.save()
        self.course.refresh_from_db()
        self.assertEqual(self.course.status, "draft")

    def test_structurally_invalid_draft_cannot_activate(self):
        other_location = Location.objects.create(name="Elsewhere")
        self.meeting.place = Place.objects.create(name="Wrong room", location=other_location)
        self.meeting.save()
        self.assert_invalid("invalid_meeting")

    @override_settings(TIME_ZONE="Europe/Berlin", USE_TZ=True)
    def test_past_boundary_uses_configured_timezone(self):
        self.meeting.instructor = None
        self.meeting.instructor_open_accepted = True
        self.meeting.save()
        # 10:00 Berlin is 08:00 UTC in August, irrespective of active UI timezone.
        boundary = datetime(2026, 8, 3, 8, tzinfo=ZoneInfo("UTC"))
        self.assertEqual(meeting_scheduling_issues(self.meeting, now=boundary), [])
        self.assertEqual(meeting_scheduling_issues(self.meeting, now=boundary + timedelta(seconds=1))[0]["type"],
                         "missing_instructor")

    def test_status_api_returns_structured_errors_without_partial_activation(self):
        self.teacher.is_superuser = True
        self.teacher.save()
        self.client.force_login(self.teacher)
        self.make_overlap()
        response = self.client.post(f"/api/courses/{self.course.pk}/status/",
                                    data={"status": "active"}, content_type="application/json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["issues"][0]["type"], "conflict")
        self.course.refresh_from_db()
        self.assertEqual(self.course.status, "draft")

    def test_status_api_requires_webmaster(self):
        self.client.force_login(self.teacher)
        response = self.client.post(f"/api/courses/{self.course.pk}/status/",
                                    data={"status": "active"}, content_type="application/json")
        self.assertEqual(response.status_code, 403)

    def test_migration_defaults_never_claim_acceptance(self):
        self.assertEqual(self.course.status, "draft")
        self.assertFalse(self.meeting.instructor_open_accepted)
        self.assertFalse(self.meeting.place_open_accepted)
        self.assertFalse(self.meeting.place_is_open)

    def test_partial_active_save_cannot_use_unsaved_acknowledgement(self):
        self.activate()
        self.meeting.instructor = None
        self.meeting.instructor_open_accepted = True
        with self.assertRaises(SchedulingValidationError):
            self.meeting.save(update_fields=["instructor"])
        self.meeting.refresh_from_db()
        self.assertEqual(self.meeting.instructor, self.teacher)

    def test_active_generation_rolls_back_incomplete_new_meetings(self):
        self.activate()
        self.course.duration_type = "date_range"
        self.course.end_date = date(2026, 8, 4)
        self.course.days_of_week = "MO,TU"
        self.course.default_place = None
        # An unsaved proposed extension must still pass active meeting guards.
        with self.assertRaises(SchedulingValidationError):
            generate_course_meetings_for_course(self.course)
        self.assertEqual(self.course.meetings.count(), 1)

    def test_new_active_course_must_first_be_saved_as_draft(self):
        with self.assertRaises(ValidationError):
            self.make_course(status="active")

    def test_status_api_success_and_invalid_status(self):
        self.teacher.is_superuser = True
        self.teacher.save()
        self.client.force_login(self.teacher)
        url = f"/api/courses/{self.course.pk}/status/"
        invalid = self.client.post(url, data={"status": []}, content_type="application/json")
        self.assertEqual(invalid.status_code, 400)
        response = self.client.post(url, data={"status": "active"}, content_type="application/json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "active")

    def test_calendar_failure_blocks_activation_explicitly(self):
        from courses.services.berlin_holidays import HolidayCalendarUnavailable
        with patch("courses.services.meeting_planning.get_berlin_holiday_calendar",
                   side_effect=HolidayCalendarUnavailable("Unavailable")):
            self.assert_invalid("calendar_unavailable")

    def test_active_metadata_saves_do_not_reactivate(self):
        self.meeting.instructor = None
        self.meeting.instructor_open_accepted = True
        self.meeting.save()
        self.activate()
        # The acknowledged opening has since become past. Metadata still saves.
        with patch("courses.services.course_activation.timezone.now",
                   return_value=datetime(2026, 8, 4, tzinfo=ZoneInfo("UTC"))), patch(
                       "courses.services.meeting_planning.get_berlin_holiday_calendar",
                       side_effect=AssertionError("Metadata must not fetch holidays")):
            self.course.name = "Renamed"
            self.course.save()
            self.course.name = "Renamed again"
            self.course.save(update_fields=["name"])
            self.meeting.notes = "Administrative note"
            self.meeting.save()
            self.meeting.notes = "Another note"
            self.meeting.save(update_fields=["notes"])
        self.course.refresh_from_db()
        self.meeting.refresh_from_db()
        self.assertEqual(self.course.name, "Renamed again")
        self.assertEqual(self.meeting.notes, "Another note")

    def test_active_schedule_extension_still_requires_accounted_dates(self):
        self.activate()
        self.course.duration_type = "date_range"
        self.course.days_of_week = "MO,TU"
        self.course.end_date = date(2026, 8, 4)
        with self.assertRaises(SchedulingValidationError):
            self.course.save()
        self.course.refresh_from_db()
        self.assertEqual(self.course.duration_type, "one_off")

    def test_partial_metadata_save_ignores_unsaved_scheduling_changes(self):
        self.activate()
        self.meeting.instructor = None
        self.meeting.notes = "Only this is saved"
        self.meeting.save(update_fields=["notes"])
        self.meeting.refresh_from_db()
        self.assertEqual(self.meeting.instructor, self.teacher)
        self.assertEqual(self.meeting.notes, "Only this is saved")

    def test_explicit_active_status_request_revalidates(self):
        self.activate()
        self.make_overlap()
        with self.assertRaises(SchedulingValidationError):
            change_course_status(self.course, "active")

    def test_holiday_exclusions_are_not_missing_proposals(self):
        from courses.services.berlin_holidays import HolidayPeriod
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
            self.assertEqual(course_activation_issues(self.course), [])
            self.activate()

    def test_cancelled_expected_date_is_accounted_for(self):
        self.meeting.cancelled = True
        self.meeting.save()
        self.assertEqual(course_activation_issues(self.course), [])
        self.activate()

    @override_settings(TIME_ZONE="Europe/Berlin", USE_TZ=True)
    def test_later_today_is_not_past(self):
        self.meeting.instructor = None
        self.meeting.instructor_open_accepted = True
        self.meeting.save()
        now = datetime(2026, 8, 3, 7, tzinfo=ZoneInfo("UTC"))
        self.assertEqual(meeting_scheduling_issues(self.meeting, now=now), [])


class CourseWorkflowMigrationTests(TransactionTestCase):
    def test_existing_assignments_survive_without_inferred_acknowledgements(self):
        executor = MigrationExecutor(connection)
        before = [("courses", "0008_reconcile_coursemeeting_place")]
        after = [("courses", "0009_course_workflow")]
        executor.migrate(before)
        try:
            apps = executor.loader.project_state(before).apps
            User = apps.get_model(*get_user_model()._meta.label.split("."))
            teacher = User.objects.create(username="legacy")
            location = apps.get_model("courses", "Location").objects.create(name="School")
            place = apps.get_model("courses", "Place").objects.create(name="Room", location=location)
            course = apps.get_model("courses", "Course").objects.create(
                name="Legacy", course_type="group", subject="guitar", term_type="all_year",
                duration_type="one_off", instructor=teacher, location=location,
                default_place=place, start_date=date(2026, 8, 3), start_time=time(10),
            )
            meeting = apps.get_model("courses", "CourseMeeting").objects.create(
                course=course, instructor=teacher, location=location, default_place=place,
                date=course.start_date, start_time=course.start_time, notes="Preserve me",
            )
            executor = MigrationExecutor(connection)
            executor.migrate(after)
            upgraded = CourseMeeting.objects.get(pk=meeting.pk)
            self.assertEqual(upgraded.instructor_id, teacher.pk)
            self.assertEqual(upgraded.default_place_id, place.pk)
            self.assertIsNone(upgraded.place_id)
            self.assertFalse(upgraded.place_is_open)
            self.assertFalse(upgraded.instructor_open_accepted)
            self.assertFalse(upgraded.place_open_accepted)
            self.assertEqual(upgraded.instructor_source, "override")
            self.assertEqual(upgraded.notes, "Preserve me")
            self.assertEqual(upgraded.course.status, "draft")
        finally:
            MigrationExecutor(connection).migrate(after)
