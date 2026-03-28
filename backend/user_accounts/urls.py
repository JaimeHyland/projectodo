from django.urls import path
from . import views


urlpatterns = [
    path("signup/", views.signup_request_view),
    path("login/", views.login_view),
    path("logout/", views.logout_view),
    path("setpassword/", views.set_password_view, name="set_password"),
    path("me/", views.me_view),
    path("csrf/", views.csrf),
    path(
        "verify_email/",
        views.send_verification_email,
        name="verification-email"
    ),
    path(
        "verify_email/confirm/",
        views.verify_email_view,
        name="verify-email-confirm"
    ),
]
