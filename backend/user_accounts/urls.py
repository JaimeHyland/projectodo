from django.urls import path
from . import views


urlpatterns = [
    path("signup/", views.signup_request_view),
    path("login/", views.login_view),
    path("logout/", views.logout_view),
    path("me/", views.me_view),
    path("csrf/", views.csrf),
    path(
        "set_password/",
        views.set_password_view,
        name="set_password"
    ),
    path(
        "verify_email/confirm/",
        views.verify_email_view,
        name="verify-email-confirm"
    ),
    path(
        "change_password/",
        views.change_password_view,
        name="change_password"
    ),
    # path(
    #     "reset_password_request/",
    #     views.reset_password_request_view,
    #     name="reset_password_request"
    # ),
]
