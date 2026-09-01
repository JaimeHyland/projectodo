from django.urls import path

from . import views

urlpatterns = [
    path("locations/", views.public_locations_view),
    path("locations/create/", views.admin_create_location_view),
    path("locations/<int:location_id>/update/", views.admin_update_location_view),
    path("locations/<int:location_id>/delete/", views.admin_delete_location_view),
    path(
        "locations/<int:location_id>/places/create/",
        views.admin_create_place_view,
    ),
    path(
        "locations/<int:location_id>/courses/",
        views.admin_location_courses_view,
    ),
    path(
        "places/<int:place_id>/delete/",
        views.admin_delete_place_view,
    ),
    path("create/", views.admin_create_course_view),
    path("<int:course_id>/update/", views.admin_update_course_view),
    path(
        "<int:course_id>/meetings/preview/",
        views.admin_course_meeting_preview_view,
    ),
    path(
        "<int:course_id>/meetings/generate/",
        views.admin_generate_course_meetings_view,
    ),
]
