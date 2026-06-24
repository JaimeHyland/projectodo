from django.urls import path
from . import views

urlpatterns = [
    path("admin/bands/", views.admin_bands, name="admin_bands"),
    path("admin/bands/<int:band_id>/", views.admin_band_detail, name="admin_band_detail"),
    path("admin/bands/<int:band_id>/page/", views.admin_band_page_detail, name="admin_band_page_detail"),
    path("admin/bands/<int:band_id>/page/create/", views.create_band_page, name="create_band_page"),
    
    path("pages/", views.public_band_pages, name="public_band_pages",),
    path("pages/<slug:slug>/", views.public_band_page_detail, name="public_band_page_detail"),
]
