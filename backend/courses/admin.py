from django.contrib import admin

from .models import (
    Location,
    Course,
    CourseMeeting,
)


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ("name",)
    search_fields = ("name",)


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "subject",
        "instructor",
        "location",
        "start_date",
        "end_date",
    )

    list_filter = (
        "subject",
        "course_type",
        "term_type",
        "duration_type",
    )

    search_fields = (
        "name",
        "instructor__username",
    )

    filter_horizontal = (
        "participants",
    )


@admin.register(CourseMeeting)
class CourseMeetingAdmin(admin.ModelAdmin):
    list_display = (
        "course",
        "date",
        "start_time",
        "location",
        "instructor",
        "cancelled",
    )

    list_filter = (
        "cancelled",
        "location",
    )

    search_fields = (
        "course__name",
        "instructor__username",
    )

    filter_horizontal = (
        "participants",
    )
