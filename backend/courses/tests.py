from datetime import date, time
import json

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.exceptions import ValidationError
from django.test import TestCase

from courses.models import Course, CourseMeeting, Location, Place
from courses.services.meeting_generation import generate_course_meetings_for_course


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
