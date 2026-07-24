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
    path("create/", views.admin_create_course_view),
]
