from django.urls import path
from . import views

urlpatterns = [
    path("public/<str:page>/<str:locale>/", views.public_content),
    path("admin/", views.admin_content),
    path("admin/<str:identifier>/<str:locale>/", views.update_content),
    path("admin/<str:identifier>/<str:locale>/image/", views.upload_image),
]
