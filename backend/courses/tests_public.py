from django.test import TestCase
from courses import tests_workflow as workflow
from courses.models import Course, CourseMeeting, Location, Place


class PublicCourseTests(TestCase):
    make_course = workflow.CourseActivationTests.make_course

    def setUp(self):
        workflow.CourseActivationTests.setUp(self)
        self.other_location = Location.objects.create(name="Other venue")
        self.remote_place = Place.objects.create(location=self.other_location, name="Other room")
        self.other = self.make_course(location=self.other_location, default_place=self.remote_place)
        self.draft = self.make_course()
        self.cancelled = self.make_course()
        self.no_place = self.make_course(default_place=None)
        # Public-query fixtures: activation rules are independently covered.
        Course.objects.filter(pk__in=[self.course.pk, self.other.pk, self.no_place.pk]).update(status="active")
        Course.objects.filter(pk=self.cancelled.pk).update(status="cancelled")

    def test_location_filters_active_courses_by_default_place(self):
        # Exceptional meeting location is irrelevant to the public course venue.
        self.meeting.location = self.other_location
        self.meeting.default_place = self.remote_place
        self.meeting.save()
        response = self.client.get(f"/api/courses/public/?location={self.location.pk}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([row["id"] for row in response.json()["courses"]], [self.course.pk])
        other = self.client.get(f"/api/courses/public/?location={self.other_location.pk}")
        self.assertEqual([row["id"] for row in other.json()["courses"]], [self.other.pk])

    def test_global_active_only_and_public_fields(self):
        response = self.client.get("/api/courses/public/")
        rows = response.json()["courses"]
        self.assertEqual({row["id"] for row in rows}, {self.course.pk, self.other.pk, self.no_place.pk})
        self.assertEqual(set(rows[0]), {"id", "name", "start_date", "end_date", "start_time", "duration_minutes", "place", "location"})
        self.assertIsNone(next(row for row in rows if row["id"] == self.no_place.pk)["location"])

    def test_course_location_field_is_not_used_for_classification(self):
        Course.objects.filter(pk=self.course.pk).update(location=self.other_location)
        response = self.client.get(f"/api/courses/public/?location={self.location.pk}")
        self.assertEqual([row["id"] for row in response.json()["courses"]], [self.course.pk])

    def test_valid_empty_location_and_global_results(self):
        empty = Location.objects.create(name="Empty")
        response = self.client.get(f"/api/courses/public/?location={empty.pk}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["courses"], [])
        self.assertEqual(response.json()["location"]["name"], "Empty")
        Course.objects.filter(status="active").update(status="draft")
        self.assertEqual(self.client.get("/api/courses/public/").json()["courses"], [])

    def test_invalid_unknown_and_method(self):
        for identifier in ("", "bad", "-1", "0", "1.5", "1" * 5000):
            with self.subTest(identifier=identifier):
                self.assertEqual(self.client.get("/api/courses/public/", {"location": identifier}).status_code, 400)
        self.assertEqual(self.client.get("/api/courses/public/?location=999999").status_code, 404)
        self.assertEqual(self.client.post("/api/courses/public/").status_code, 405)

    def test_public_lessons_include_cancelled_and_actual_place_without_private_data(self):
        from datetime import timedelta
        from django.db import connection
        from django.test.utils import CaptureQueriesContext
        CourseMeeting.objects.filter(pk=self.meeting.pk).update(
            place=self.remote_place, default_place=None, location=self.other_location,
            notes="Private teaching notes")
        earlier = CourseMeeting.objects.create(course=self.course,
            date=self.meeting.date - timedelta(days=1), start_time=self.meeting.start_time,
            location=self.location, cancelled=True)
        with CaptureQueriesContext(connection) as queries:
            response = self.client.get(f"/api/courses/public/{self.course.pk}/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(set(data), {"course", "timezone", "lessons"})
        self.assertEqual([row["id"] for row in data["lessons"]], [earlier.pk, self.meeting.pk])
        self.assertTrue(data["lessons"][0]["cancelled"])
        lesson = data["lessons"][1]
        self.assertEqual(lesson["place"], {"name": self.remote_place.name})
        self.assertEqual(lesson["location"], {"name": self.other_location.name})
        self.assertEqual(set(lesson), {"id", "date", "start_time", "duration_minutes", "cancelled", "place", "location"})
        self.assertNotIn("Private teaching notes", response.content.decode())
        self.assertFalse(any(q["sql"].lstrip().upper().startswith(("INSERT", "UPDATE", "DELETE")) for q in queries))

    def test_public_lessons_hide_non_active_courses_and_handle_empty(self):
        for course_id in (self.draft.pk, self.cancelled.pk, 999999):
            self.assertEqual(self.client.get(f"/api/courses/public/{course_id}/").status_code, 404)
        self.assertEqual(self.client.get(f"/api/courses/public/{self.other.pk}/").json()["lessons"], [])
        self.assertEqual(self.client.post(f"/api/courses/public/{self.course.pk}/").status_code, 405)
        self.assertEqual(self.client.get("/api/courses/public/invalid/").status_code, 404)
        CourseMeeting.objects.filter(pk=self.meeting.pk).update(place_is_open=True)
        self.assertIsNone(self.client.get(f"/api/courses/public/{self.course.pk}/").json()["lessons"][0]["place"])
