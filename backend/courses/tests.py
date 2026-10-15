from datetime import date, time
import json
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.exceptions import ValidationError
from django.test import TestCase

from courses.models import Course, CourseMeeting, Location, Place
from courses.services.meeting_generation import generate_course_meetings_for_course
from courses.services.berlin_holidays import HolidayPeriod


class LocationApiTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.webmaster = User.objects.create_user(
            username="webmaster",
            password="test-password",
        )
        webmaster_group = Group.objects.create(name="webmaster")
        self.webmaster.groups.add(webmaster_group)
        self.client.force_login(self.webmaster)

    def location_payload(self, **overrides):
        payload = {
            "name": "Main location",
            "street_address": "1 Main Street",
            "city": "Berlin",
            "state": "Berlin",
            "postcode": "10115",
            "country": "Germany",
        }
        payload.update(overrides)
        return payload

    def post_json(self, path, payload):
        return self.client.post(
            path,
            data=json.dumps(payload),
            content_type="application/json",
        )

    def test_serialize_location_includes_location_type(self):
        location = Location.objects.create(
            name="Online",
            location_type="online",
        )

        response = self.client.get("/api/courses/locations/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json()["locations"][0]["location_type"],
            location.location_type,
        )

    def test_create_location_uses_physical_default_when_omitted(self):
        response = self.post_json(
            "/api/courses/locations/create/",
            self.location_payload(),
        )

        self.assertEqual(response.status_code, 200)
        location = Location.objects.get()
        self.assertEqual(location.location_type, "physical")
        self.assertEqual(response.json()["location"]["location_type"], "physical")

    def test_create_online_location(self):
        response = self.post_json(
            "/api/courses/locations/create/",
            self.location_payload(location_type="online"),
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(Location.objects.get().location_type, "online")
        self.assertEqual(response.json()["location"]["location_type"], "online")

    def test_update_location_from_physical_to_online(self):
        location = Location.objects.create(
            **self.location_payload(location_type="physical")
        )

        response = self.post_json(
            f"/api/courses/locations/{location.id}/update/",
            self.location_payload(location_type="online"),
        )

        self.assertEqual(response.status_code, 200)
        location.refresh_from_db()
        self.assertEqual(location.location_type, "online")
        self.assertEqual(response.json()["location"]["location_type"], "online")

    def test_create_rejects_invalid_location_type(self):
        response = self.post_json(
            "/api/courses/locations/create/",
            self.location_payload(location_type="invalid"),
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Location.objects.count(), 0)
        self.assertIn("error", response.json())

    def test_update_rejects_invalid_location_type(self):
        location = Location.objects.create(
            **self.location_payload(location_type="physical")
        )

        response = self.post_json(
            f"/api/courses/locations/{location.id}/update/",
            self.location_payload(location_type="invalid"),
        )

        self.assertEqual(response.status_code, 400)
        location.refresh_from_db()
        self.assertEqual(location.location_type, "physical")
        self.assertIn("error", response.json())


class CourseAdminApiTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.webmaster = User.objects.create_user(
            username="course-webmaster",
            password="test-password",
        )
        webmaster_group = Group.objects.create(name="webmaster")
        self.webmaster.groups.add(webmaster_group)
        self.client.force_login(self.webmaster)
        self.location = Location.objects.create(name="Main location")
        self.other_location = Location.objects.create(name="Other location")
        self.place = Place.objects.create(
            location=self.location,
            name="Studio A",
        )
        self.course = Course.objects.create(
            name="Existing course",
            course_type="one_to_one",
            subject="guitar",
            term_type="all_year",
            duration_type="one_off",
            instructor=self.webmaster,
            max_participants=1,
            location=self.location,
            default_place=self.place,
            start_date=date(2026, 8, 3),
            start_time=time(10, 0),
            duration_minutes=60,
            days_of_week="",
        )
        Course.objects.create(
            name="Other course",
            course_type="group",
            subject="ukulele",
            term_type="all_year",
            duration_type="one_off",
            instructor=self.webmaster,
            max_participants=4,
            location=self.other_location,
            start_date=date(2026, 8, 4),
            start_time=time(11, 0),
            duration_minutes=45,
            days_of_week="",
        )

    def test_location_course_list_only_contains_that_locations_courses(self):
        response = self.client.get(
            f"/api/courses/locations/{self.location.id}/courses/"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [course["id"] for course in response.json()["courses"]],
            [self.course.id],
        )
        self.assertEqual(
            response.json()["courses"][0]["default_place"],
            self.place.id,
        )
        self.assertFalse(response.json()["courses"][0]["meetings_created"])

        CourseMeeting.objects.create(
            course=self.course,
            instructor=self.webmaster,
            location=self.location,
            default_place=self.place,
            date=self.course.start_date,
            start_time=self.course.start_time,
        )

        response = self.client.get(
            f"/api/courses/locations/{self.location.id}/courses/"
        )
        self.assertTrue(response.json()["courses"][0]["meetings_created"])

    def test_course_update_changes_editable_fields_only(self):
        payload = {
            "name": "Updated course",
            "course_type": "group",
            "subject": "ukulele",
            "term_type": "school_term",
            "duration_type": "date_range",
            "max_participants": 6,
            "default_place": None,
            "start_date": "2026-09-01",
            "end_date": "2026-09-30",
            "start_time": "12:30",
            "duration_minutes": 75,
            "days_of_week": "TU",
            "location": self.other_location.id,
        }

        response = self.client.post(
            f"/api/courses/{self.course.id}/update/",
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.course.refresh_from_db()
        self.assertEqual(self.course.name, "Updated course")
        self.assertEqual(self.course.location, self.location)
        self.assertEqual(self.course.instructor, self.webmaster)
        self.assertIsNone(self.course.default_place)

    def test_ordinary_user_cannot_manage_courses_or_meetings(self):
        User = get_user_model()
        ordinary_user = User.objects.create_user(
            username="ordinary-user",
            password="test-password",
        )
        self.client.force_login(ordinary_user)

        response = self.client.post(
            "/api/courses/create/",
            data=json.dumps({
                "name": "Unauthorized course",
                "location": self.location.id,
                "start_date": "2026-09-01",
                "start_time": "10:00",
            }),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 403)
        self.assertFalse(Course.objects.filter(name="Unauthorized course").exists())

        preview = self.client.get(
            f"/api/courses/{self.course.id}/meetings/preview/"
        )
        generate = self.client.post(
            f"/api/courses/{self.course.id}/meetings/generate/"
        )

        self.assertEqual(preview.status_code, 403)
        self.assertEqual(generate.status_code, 403)
        self.assertEqual(CourseMeeting.objects.count(), 0)

    @patch("courses.services.meeting_planning.get_berlin_holiday_calendar")
    def test_meeting_preview_and_generation_exclude_berlin_holidays(
        self,
        mock_calendar,
    ):
        self.course.duration_type = "date_range"
        self.course.term_type = "school_term"
        self.course.start_date = date(2026, 8, 3)
        self.course.end_date = date(2026, 8, 24)
        self.course.days_of_week = "MO"
        self.course.save()
        mock_calendar.return_value = {
            "public": [
                HolidayPeriod(
                    date(2026, 8, 10),
                    date(2026, 8, 10),
                    "Public holiday",
                    "public",
                )
            ],
            "school": [
                HolidayPeriod(
                    date(2026, 8, 17),
                    date(2026, 8, 17),
                    "School holiday",
                    "school",
                )
            ],
        }

        preview = self.client.get(
            f"/api/courses/{self.course.id}/meetings/preview/"
        )

        self.assertEqual(preview.status_code, 200)
        self.assertEqual(
            [item["date"] for item in preview.json()["meetings"]],
            ["2026-08-03", "2026-08-24"],
        )
        self.assertEqual(
            [item["date"] for item in preview.json()["excluded"]],
            ["2026-08-10", "2026-08-17"],
        )
        self.assertEqual(preview.json()["new_count"], 2)

        generated = self.client.post(
            f"/api/courses/{self.course.id}/meetings/generate/"
        )

        self.assertEqual(generated.status_code, 200)
        self.assertEqual(generated.json()["created_count"], 2)
        self.assertEqual(generated.json()["new_count"], 0)
        self.assertEqual(
            list(
                self.course.meetings.order_by("date").values_list(
                    "date", flat=True
                )
            ),
            [date(2026, 8, 3), date(2026, 8, 24)],
        )


class CoursePlaceTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.instructor = User.objects.create_user(
            username="instructor",
            password="test-password",
        )
        self.participant = User.objects.create_user(
            username="participant",
            password="test-password",
        )
        self.location = Location.objects.create(name="Main location")
        self.other_location = Location.objects.create(name="Other location")
        self.default_place = Place.objects.create(
            location=self.location,
            name="Studio A",
        )
        self.override_place = Place.objects.create(
            location=self.location,
            name="Studio B",
        )
        self.other_place = Place.objects.create(
            location=self.other_location,
            name="Other studio",
        )

    def make_course(self, **overrides):
        values = {
            "name": "Guitar lessons",
            "course_type": "one_to_one",
            "subject": "guitar",
            "term_type": "all_year",
            "duration_type": "one_off",
            "instructor": self.instructor,
            "max_participants": 1,
            "location": self.location,
            "default_place": self.default_place,
            "start_date": date(2026, 8, 3),
            "start_time": time(10, 0),
            "duration_minutes": 60,
            "days_of_week": "",
        }
        values.update(overrides)
        return Course.objects.create(**values)

    def test_course_default_place_must_belong_to_course_location(self):
        course = self.make_course(default_place=None)
        course.default_place = self.other_place

        with self.assertRaises(ValidationError) as context:
            course.full_clean()

        self.assertIn("default_place", context.exception.message_dict)

    def test_meeting_places_must_belong_to_meeting_location(self):
        course = self.make_course()

        for field_name in ("default_place", "place"):
            with self.subTest(field=field_name):
                meeting = CourseMeeting(
                    course=course,
                    instructor=self.instructor,
                    location=self.location,
                    default_place=self.default_place,
                    date=course.start_date,
                    start_time=course.start_time,
                )
                setattr(meeting, field_name, self.other_place)

                with self.assertRaises(ValidationError) as context:
                    meeting.full_clean()

                self.assertIn(field_name, context.exception.message_dict)

    def test_effective_place_prefers_override_then_falls_back_to_default(self):
        course = self.make_course()
        meeting = CourseMeeting.objects.create(
            course=course,
            instructor=self.instructor,
            location=self.location,
            default_place=self.default_place,
            place=None,
            date=course.start_date,
            start_time=course.start_time,
        )

        self.assertEqual(meeting.effective_place, self.default_place)

        meeting.place = self.override_place
        self.assertEqual(meeting.effective_place, self.override_place)

    def test_generation_inherits_default_and_preserves_existing_meeting(self):
        course = self.make_course()
        course.participants.add(self.participant)

        meetings = generate_course_meetings_for_course(course)

        self.assertEqual(len(meetings), 1)
        meeting = meetings[0]
        self.assertEqual(meeting.default_place, self.default_place)
        self.assertIsNone(meeting.place)
        self.assertEqual(
            list(meeting.participants.all()),
            [self.participant],
        )

        meeting.place = self.override_place
        meeting.duration_minutes = 90
        meeting.save(update_fields=["place", "duration_minutes"])

        regenerated = generate_course_meetings_for_course(course)
        meeting.refresh_from_db()

        self.assertEqual([item.pk for item in regenerated], [meeting.pk])
        self.assertEqual(CourseMeeting.objects.count(), 1)
        self.assertEqual(meeting.default_place, self.default_place)
        self.assertEqual(meeting.place, self.override_place)
        self.assertEqual(meeting.duration_minutes, 90)

    def test_recurring_generation_uses_school_term_date_logic(self):
        course = self.make_course(
            duration_type="date_range",
            start_date=date(2026, 8, 3),
            end_date=date(2026, 8, 10),
            days_of_week="MO",
        )

        meetings = generate_course_meetings_for_course(course)

        self.assertEqual(
            [meeting.date for meeting in meetings],
            [date(2026, 8, 3), date(2026, 8, 10)],
        )


class MeetingConflictTests(TestCase):
    def setUp(self):
        self.instructor = get_user_model().objects.create_user(username="teacher")
        self.other_instructor = get_user_model().objects.create_user(username="other")
        self.location = Location.objects.create(name="School")
        self.other_location = Location.objects.create(name="Elsewhere")
        self.room = Place.objects.create(location=self.location, name="A")
        self.other_room = Place.objects.create(location=self.location, name="B")
        self.course = self.make_course()

    def make_course(self, **changes):
        values = dict(name="Lessons", course_type="group", subject="guitar",
                      term_type="all_year", duration_type="one_off",
                      instructor=self.instructor, location=self.location,
                      start_date=date(2026, 8, 3), start_time=time(10),
                      duration_minutes=60)
        values.update(changes)
        return Course.objects.create(**values)

    def make_meeting(self, course=None, **changes):
        course = course or self.make_course()
        values = dict(course=course, instructor=course.instructor,
                      location=course.location, default_place=course.default_place,
                      date=course.start_date, start_time=time(10, 30),
                      duration_minutes=60)
        values.update(changes)
        return CourseMeeting.objects.create(**values)

    def assert_conflicts(self, expected):
        from courses.services.meeting_planning import build_course_meeting_plan
        with patch("courses.services.meeting_planning.get_berlin_holiday_calendar",
                   return_value={"public": [], "school": []}):
            plan = build_course_meeting_plan(self.course)
        result = generate_course_meetings_for_course(self.course)
        self.assertEqual(result.conflicts, plan["conflicts"])
        details = result.conflicts.get(self.course.start_date, [])
        self.assertEqual({item["type"] for item in details}, set(expected))
        self.assertEqual(len(result), 0 if expected else 1)
        return result

    def test_same_course_overlap(self):
        meeting = self.make_meeting(course=self.course)
        result = self.assert_conflicts(["same_course", "instructor", "location"])
        self.assertEqual(result.conflicts[meeting.date][0]["meeting_id"], meeting.pk)

    def test_back_to_back_same_course_and_instructor(self):
        for start in (time(9), time(11)):
            with self.subTest(start=start):
                CourseMeeting.objects.all().delete()
                self.make_meeting(course=self.course, start_time=start)
                self.assert_conflicts([])

    def test_instructor_across_courses(self):
        self.make_meeting(location=self.other_location)
        self.assert_conflicts(["instructor"])

    def test_different_instructors_without_room_conflict(self):
        self.make_meeting(instructor=self.other_instructor, location=self.other_location)
        self.assert_conflicts([])

    def test_same_default_place(self):
        self.course.default_place = self.room
        self.course.save()
        self.make_meeting(instructor=self.other_instructor, default_place=self.room)
        self.assert_conflicts(["place"])

    def test_place_override_takes_precedence(self):
        self.course.default_place = self.room
        self.course.save()
        self.make_meeting(instructor=self.other_instructor,
                          default_place=self.room, place=self.other_room)
        self.assert_conflicts([])

    def test_override_place_can_conflict(self):
        self.course.default_place = self.room
        self.course.save()
        self.make_meeting(instructor=self.other_instructor,
                          default_place=self.other_room, place=self.room)
        self.assert_conflicts(["place"])

    def test_location_without_places(self):
        self.make_meeting(instructor=self.other_instructor)
        self.assert_conflicts(["location"])

    def test_unspecified_location_conflicts_with_specific_place_both_directions(self):
        for proposed_has_place in (True, False):
            with self.subTest(proposed_has_place=proposed_has_place):
                CourseMeeting.objects.all().delete()
                self.course.default_place = self.room if proposed_has_place else None
                self.course.save()
                self.make_meeting(instructor=self.other_instructor,
                                  default_place=None if proposed_has_place else self.room)
                self.assert_conflicts(["location"])

    def test_cancelled_meetings_do_not_block_any_resource(self):
        self.course.default_place = self.room
        self.course.save()
        self.make_meeting(course=self.course, cancelled=True)
        self.assert_conflicts([])

    def test_cancelled_exact_duplicate_is_preserved(self):
        meeting = self.make_meeting(course=self.course, start_time=time(10), cancelled=True)
        result = generate_course_meetings_for_course(self.course)
        self.assertEqual(result, [meeting])
        self.assertEqual(result.existing_dates, [meeting.date])
        self.assertEqual(result.conflicts, {})
        self.assertEqual(CourseMeeting.objects.count(), 1)

    def test_online_locations_and_places_are_not_exclusive(self):
        self.location.location_type = "online"
        self.location.save()
        self.course.default_place = self.room
        self.course.save()
        self.make_meeting(instructor=self.other_instructor, default_place=self.room)
        self.assert_conflicts([])

    def test_existing_instructor_and_duration_are_used(self):
        self.make_meeting(instructor=self.other_instructor, location=self.other_location,
                          start_time=time(9), duration_minutes=120)
        self.assert_conflicts([])

    def test_existing_duration_extends_into_proposed_meeting(self):
        self.make_meeting(location=self.other_location, start_time=time(9),
                          duration_minutes=120)
        self.assert_conflicts(["instructor"])

    def test_previous_day_and_multi_day_meetings(self):
        self.make_meeting(date=date(2026, 8, 1), duration_minutes=3000,
                          location=self.other_location)
        self.assert_conflicts(["instructor"])

    def test_proposal_extends_into_next_day(self):
        self.course.start_time = time(23, 30)
        self.course.save()
        self.make_meeting(date=date(2026, 8, 4), start_time=time(0),
                          location=self.other_location)
        self.assert_conflicts(["instructor"])

    def test_manual_changes_and_participants_are_preserved(self):
        meeting = self.make_meeting(course=self.course, start_time=time(10),
                                   instructor=self.other_instructor, place=self.other_room,
                                   duration_minutes=90, notes="Keep this")
        meeting.participants.add(self.other_instructor)
        before = CourseMeeting.objects.values().get(pk=meeting.pk)
        result = generate_course_meetings_for_course(self.course)
        self.assertEqual(result.existing_dates, [meeting.date])
        self.assertEqual(CourseMeeting.objects.values().get(pk=meeting.pk), before)
        self.assertEqual(list(meeting.participants.all()), [self.other_instructor])

    @patch("courses.services.meeting_planning.get_berlin_holiday_calendar",
           return_value={"public": [], "school": []})
    def test_mixed_generation_and_preview_api(self, calendar):
        self.instructor.is_superuser = True
        self.instructor.save()
        self.client.force_login(self.instructor)
        self.course.duration_type = "date_range"
        self.course.days_of_week = "MO"
        self.course.end_date = date(2026, 8, 17)
        self.course.save()
        self.make_meeting(location=self.other_location)
        existing = self.make_meeting(course=self.course, date=date(2026, 8, 17),
                                     start_time=time(10))
        url = f"/api/courses/{self.course.pk}/meetings/"
        preview = self.client.get(url + "preview/")
        self.assertEqual(preview.status_code, 200)
        self.assertEqual([item["status"] for item in preview.json()["meetings"]],
                         ["conflict", "new", "existing"])
        self.assertEqual(preview.json()["new_count"], 1)
        response = self.client.post(url + "generate/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["created_dates"], ["2026-08-10"])
        self.assertEqual(data["existing_dates"], [existing.date.isoformat()])
        self.assertEqual(data["conflict_dates"], ["2026-08-03"])
        self.assertEqual(data["conflict_count"], 1)
        self.assertEqual(data["meetings"][0], preview.json()["meetings"][0])
        self.assertEqual(self.course.meetings.count(), 2)

    def test_proposed_dates_also_conflict_with_each_other(self):
        from courses.services.meeting_planning import build_course_meeting_plan
        self.course.duration_type = "date_range"
        self.course.end_date = date(2026, 8, 4)
        self.course.days_of_week = "MO,TU"
        self.course.duration_minutes = 1500
        self.course.save()
        with patch("courses.services.meeting_planning.get_berlin_holiday_calendar",
                   return_value={"public": [], "school": []}):
            plan = build_course_meeting_plan(self.course)
        result = generate_course_meetings_for_course(self.course)
        self.assertEqual(list(plan["conflicts"]), [date(2026, 8, 4)])
        self.assertEqual(list(result.conflicts), [date(2026, 8, 4)])
        self.assertEqual(result.created_dates, [date(2026, 8, 3)])
        self.assertEqual(result.conflicts[date(2026, 8, 4)][0]["meeting_id"], result[0].pk)

    def test_instructor_back_to_back_across_courses(self):
        self.make_meeting(start_time=time(11), location=self.other_location)
        self.assert_conflicts([])

    def test_cancelled_unspecified_location_does_not_block(self):
        self.make_meeting(cancelled=True)
        self.assert_conflicts([])

    def test_meeting_instructor_override_can_conflict(self):
        other_course = self.make_course(instructor=self.other_instructor,
                                        location=self.other_location)
        self.make_meeting(course=other_course, instructor=self.instructor)
        self.assert_conflicts(["instructor"])
