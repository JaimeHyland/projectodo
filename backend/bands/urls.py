from django.urls import path
from . import views, gigs

urlpatterns = [
    path("admin/bands/<int:band_id>/gigs/", gigs.admin_band_gigs),
    path("admin/bands/<int:band_id>/gigs/<int:gig_id>/", gigs.admin_band_gig_detail),
    path("admin/bands/", views.admin_bands, name="admin_bands"),
    path("admin/bands/<int:band_id>/", views.admin_band_detail, name="admin_band_detail"),
    path("admin/bands/<int:band_id>/page/", views.admin_band_page_detail, name="admin_band_page_detail"),
    path("admin/bands/<int:band_id>/page/create/", views.create_band_page, name="create_band_page"),
    path("admin/bands/<int:band_id>/page/image/", views.upload_band_image, name="upload_band_image"),
    
    path("pages/", views.public_band_pages, name="public_band_pages",),
    path("pages/<slug:slug>/", views.public_band_page_detail, name="public_band_page_detail"),
]
