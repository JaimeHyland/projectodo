import json
from datetime import timedelta
from urllib.parse import quote
from django.contrib.auth import (
    authenticate,
    login,
    logout,
    get_user_model,
    update_session_auth_hash,
)
from django.conf import settings
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.contrib.auth.password_validation import validate_password
from django.core.mail import EmailMultiAlternatives, send_mail
from django.core.exceptions import ValidationError
from django.views.decorators.http import require_POST, require_GET
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.middleware.csrf import get_token
from django.utils import translation
from django.utils.translation import gettext as _
from django.utils import timezone
from urllib.parse import urlencode
from .models import AuthToken
from .utilities import generate_secure_token


User = get_user_model()


def auth_status(request):
    user = request.user
    return JsonResponse({
        "is_authenticated": user.is_authenticated,
        "is_superuser": (
            user.is_superuser
            if user.is_authenticated
            else False
        ),
        "username": (
            user.username
            if user.is_authenticated
            else None
        ),
        "groups": (
            list(
                user.groups.values_list("name", flat=True)
            )
            if user.is_authenticated
            else []
        ),
    })


def send_verification_email(email, username, locale):

    translation.activate(locale)

    if not email or not username:
        raise ValueError(_("Email and username required"))

    raw_token, token_hash = generate_secure_token()

    AuthToken.objects.create(
        username=username,
        email=email,
        token_hash=token_hash,
        token_type="signup",
        expires_at=timezone.now() + timedelta(minutes=30)
    )

    params = urlencode({
        "auth": "set-password",
        "token": raw_token,
        "username": username,
        "locale": locale
    })

    verification_url = f"{settings.FRONTEND_URL}/{locale}?{params}"

    subject = _("Verify your Projectodo account")
    text_content = _(
        "Hi %(username)s,\n\n"
        "Please verify your email by clicking the link below:\n"
        "%(verification_url)s\n\n"
        "If you didn't sign up for Projectodo, you can ignore this email."
    ) % {
        "username": username,
        "verification_url": verification_url
    }

    html_content = _(
        "<p>Hi %(username)s,</p>"
        "<p>Please verify your email by clicking the link below:</p>"
        '<p><a href="%(verification_url)s">%(verification_url)s</a></p>'
        "<p>If you didn't sign up for Projectodo, you can ignore this email.</p>"
    ) % {
        "username": username,
        "verification_url": verification_url
    }

    email_message = EmailMultiAlternatives(
        subject=subject,
        body=text_content,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[email],
        connection=None,  # will use default EMAIL_BACKEND
    )

    email_message.attach_alternative(html_content, "text/html")

    email_message.send(fail_silently=False)


@ensure_csrf_cookie
def csrf(request):
    return JsonResponse({"csrfToken": get_token(request)})


@require_POST
def set_password_view(request):
    raw_token = None
    password = None

    try:
        data = json.loads(request.body.decode("utf-8"))
        raw_token = data.get("token")
        password = data.get("password")
    except json.JSONDecodeError:
        return JsonResponse({"error": _("Invalid JSON")}, status=400)

    if not raw_token or not password:
        return JsonResponse(
            {"error": _("Token and password required")},
            status=400
        )

    try:
        validate_password(password)
    except ValidationError as e:
        return JsonResponse({"error": list(e.messages)}, status=400)

    token_hash = AuthToken.hash_token(raw_token)

    try:
        auth_token = AuthToken.objects.get(token_hash=token_hash)
    except AuthToken.DoesNotExist:
        return JsonResponse({"error": _("Invalid Token")}, status=400)

    if auth_token.is_expired():
        auth_token.delete()
        return JsonResponse({"error": _("Token expired")}, status=400)

    if auth_token.token_type == "signup":
        if User.objects.filter(username=auth_token.username).exists():
            auth_token.delete()
            return JsonResponse(
                {"error": _("Username already taken")},
                status=400
            )
        if User.objects.filter(email=auth_token.email).exists():
            auth_token.delete()
            return JsonResponse(
                {"error": _("Email already registered")},
                status=400
            )

        user = User.objects.create_user(
            username=auth_token.username,
            email=auth_token.email,
            password=password,
            is_active=True,
        )

    elif auth_token.token_type == "password_reset":
        user = auth_token.user
        user.set_password(password)
        user.save()

    else:
        auth_token.delete()
        return JsonResponse({"error": _("Unknown token type")}, status=400)

    auth_token.delete()

    return JsonResponse({"success": True, "username": user.username})


@require_GET
def verify_email_view(request):

    token = request.GET.get("token")
    username = request.GET.get("username")

    if not token or not username:
        return JsonResponse(
            {"error": _("Token and username required")},
            status=400
        )

    token_hash = AuthToken.hash_token(token)

    try:
        auth_token = AuthToken.objects.get(
            username=username,
            token_hash=token_hash,
            token_type="signup"
        )
    except AuthToken.DoesNotExist:
        return JsonResponse({"error": _("Invalid token")}, status=400)

    if auth_token.is_expired():
        auth_token.delete()
        return JsonResponse({"error": _("Token expired")}, status=400)

    return JsonResponse({
        "success": True,
        "message": _("Email verified successfully")
    })


@require_POST
def signup_request_view(request):
    data = json.loads(request.body.decode("utf-8"))
    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip().lower()
    locale = request.headers.get("Accept-Language", "en").split(",")[0]

    translation.activate(locale)

    if not username or not email:
        return JsonResponse(
            {"error": _("Username and email required")},
            status=400,
        )

    username_validator = UnicodeUsernameValidator()

    try:
        username_validator(username)
    except ValidationError:
        return JsonResponse(
            {
                "error": _(
                    "Username may contain only letters, numbers, and @/./+/-/_ characters."
                )
            },
            status=400,
        )

    if User.objects.filter(username=username).exists():
        return JsonResponse(
            {"error": _("Username already taken")},
            status=400,
        )

    if User.objects.filter(email=email).exists():
        return JsonResponse(
            {"error": _("Email already registered")},
            status=400,
        )

    try:
        send_verification_email(email, username, locale)
        return JsonResponse({
            "success": True,
            "message": _("Verification email sent to %(email)s") % {
                "email": email
            }
        })
    except Exception as e:
        return JsonResponse({
            "success": False,
            "error": _("Failed to send verification email: %(e)s") % {"e": e}
        }, status=500)


@require_POST
def login_view(request):
    data = json.loads(request.body.decode("utf-8"))

    user = authenticate(
        request,
        username=data.get("username"),
        password=data.get("password"),
    )

    if user is None:
        return JsonResponse(
            {"error": _("Invalid credentials")},
            status=401,
        )

    login(request, user)

    return JsonResponse({
        "success": True,
        "username": user.username,
    })


@require_POST
def logout_view(request):
    logout(request)
    return JsonResponse({"success": True})


@require_POST
def change_password_view(request):
    if not request.user.is_authenticated:
        return JsonResponse(
            {"error": _("Authentication required")},
            status=401,
        )

    data = json.loads(request.body.decode("utf-8"))
    old_password = data.get("old_password")
    new_password = data.get("new_password")

    if not old_password or not new_password:
        return JsonResponse(
            {"error": _(
                "You must provide both your current and new passwords. "
                "If you can't remember your current password, use the 'Forgot Password' "
                "option to reset it."
            )},
            status=400,
        )

    if not request.user.check_password(old_password):
        return JsonResponse(
            {"error": _("Current password is incorrect")},
            status=400,
        )

    try:
        validate_password(new_password, user=request.user)
    except ValidationError as e:
        return JsonResponse({"error": list(e.messages)}, status=400)

    request.user.set_password(new_password)
    request.user.save()

    update_session_auth_hash(request, request.user)

    return JsonResponse({
        "success": True,
        "message": _("Password changed successfully"),
    })


@require_POST
def request_password_reset_view(request):
    try:
        data = json.loads(request.body.decode("utf-8"))
        email = (data.get("email") or "").strip().lower()
    except json.JSONDecodeError:
        return JsonResponse({"error": _("Invalid JSON")}, status=400)

    if not email:
        return JsonResponse(
            {"error": _("Please provide an email address.")},
            status=400,
        )

    user = User.objects.filter(email__iexact=email, is_active=True).first()

    if user:
        raw_token, token_hash = generate_secure_token()

        AuthToken.objects.create(
            user=user,
            token_hash=token_hash,
            token_type="password_reset",
            expires_at=timezone.now() + timedelta(minutes=30),
        )

        reset_link = (
            f"{settings.FRONTEND_URL}/{request.headers.get('Accept-Language', 'en').split(',')[0]}"
            f"?auth=reset-password-confirm"
            f"&token={raw_token}"
            f"&username={quote(user.username)}"
        )

        send_mail(
            subject=_("Reset your password"),
            message=_(
                "Use this link to reset your password:\n%(link)s"
            ) % {"link": reset_link},
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
        )

    return JsonResponse({
        "success": True,
        "message": _(
            "If an account exists for that email address, a reset link has been sent."
        ),
    })


@require_GET
def reset_password_confirm_view(request):
    token = request.GET.get("token")
    username = request.GET.get("username")

    if not token or not username:
        return JsonResponse(
            {"error": _("Token and username required")},
            status=400,
        )

    token_hash = AuthToken.hash_token(token)

    try:
        auth_token = AuthToken.objects.get(
            token_hash=token_hash,
            token_type="password_reset",
            user__username=username,
        )
    except AuthToken.DoesNotExist:
        return JsonResponse(
            {"error": _("Invalid token")},
            status=400,
        )

    if auth_token.is_expired():
        auth_token.delete()
        return JsonResponse(
            {"error": _("Token expired")},
            status=400,
        )

    return JsonResponse({
        "success": True,
        "message": _("Password reset token is valid."),
    })


@require_GET
def me_view(request):
    if not request.user.is_authenticated:
        return JsonResponse(
            {"authenticated": False},
            status=401,
        )

    return JsonResponse({
        "authenticated": True,
        "username": request.user.username,
        "email": request.user.email,
    })
