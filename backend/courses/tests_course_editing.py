import json

from django.test import TestCase

from courses import tests_workflow as workflow
from courses.services.course_editing import save_course_with_inherited_places
from courses.views import serialize_course


class CoursePlaceEditingTests(TestCase):
    make_course = workflow.CourseActivationTests.make_course
    make_overlap = workflow.CourseActivationTests.make_overlap

    def setUp(self):
        workflow.CourseActivationTests.setUp(self)
        self.teacher.is_superuser = True
        self.teacher.save()
        self.client.force_login(self.teacher)

    def test_dashboard_edit_repairs_existing_inherited_place_even_if_default_unchanged(self):
        self.meeting.default_place = None
        self.meeting.save()
        response = self.client.post(
            f"/api/courses/{self.course.pk}/update/",
            data=json.dumps(serialize_course(self.course)), content_type="application/json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.meeting.refresh_from_db()
        self.assertEqual(self.meeting.effective_place, self.place)
        self.assertIsNone(self.meeting.place_id)
        workflow.generate_course_meetings_for_course(self.course)
        self.meeting.refresh_from_db()
        self.assertEqual(self.meeting.effective_place, self.place)

    def test_new_default_updates_inherited_meetings(self):
        self.course.default_place = self.other_place
        save_course_with_inherited_places(self.course)
        self.meeting.refresh_from_db()
        self.assertEqual(self.meeting.effective_place, self.other_place)

    def test_explicit_override_and_open_place_are_preserved(self):
        for is_open in (False, True):
            with self.subTest(is_open=is_open):
                self.meeting.place = None if is_open else self.place
                self.meeting.place_is_open = is_open
                self.meeting.place_open_accepted = is_open
                self.meeting.save()
                self.course.default_place = self.other_place
                save_course_with_inherited_places(self.course)
                self.meeting.refresh_from_db()
                self.assertEqual(self.meeting.effective_place, None if is_open else self.place)
                self.assertEqual(self.meeting.place_open_accepted, is_open)

    def test_active_conflict_rolls_back_course_and_meeting(self):
        workflow.change_course_status(self.course, "active")
        self.make_overlap(instructor=self.other_teacher, default_place=self.other_place)
        self.course.default_place = self.other_place
        with self.assertRaises(workflow.SchedulingValidationError):
            save_course_with_inherited_places(self.course)
        self.course.refresh_from_db()
        self.meeting.refresh_from_db()
        self.assertEqual(self.course.default_place, self.place)
        self.assertEqual(self.meeting.effective_place, self.place)

    def test_invalid_course_edit_rolls_back_updated_meetings(self):
        self.course.default_place = self.other_place
        self.course.name = ""
        with self.assertRaises(workflow.ValidationError):
            save_course_with_inherited_places(self.course)
        self.meeting.refresh_from_db()
        self.course.refresh_from_db()
        self.assertEqual(self.meeting.effective_place, self.place)
        self.assertEqual(self.course.default_place, self.place)
