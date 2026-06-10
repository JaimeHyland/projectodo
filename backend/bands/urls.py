from django.urls import path
from . import views

urlpatterns = [
    path("admin/bands/", views.admin_bands, name="admin_bands"),
    path("admin/bands/<int:band_id>/", views.admin_band_detail, name="admin_band_detail"),
]