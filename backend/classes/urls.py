from django.urls import path

from . import views

urlpatterns = [
    path("locations/", views.public_locations_view),
]