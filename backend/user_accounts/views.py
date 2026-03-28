import json
from datetime import timedelta
from django.contrib.auth import authenticate, login, logout, get_user_model
from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core.mail import EmailMultiAlternatives
from django.core.exceptions import ValidationError
from django.views.decorators.http import require_POST, require_GET
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt
from django.utils import timezone
from .models import AuthToken
from .utilities import generate_secure_token


User = get_user_model()


def send_verification_email(email, username):
    if not email or not username:
        raise ValueError("Email and username required")

    raw_token, token_hash = generate_secure_token()

    AuthToken.objects.create(
        username=username,
        email=email,
        token_hash=token_hash,
        token_type="signup",
        expires_at=timezone.now() + timedelta(minutes=30)
    )

    verification_url = (
        f"{settings.FRONTEND_URL}"
        f"/verify-email?token={raw_token}&username={username}"
    )

    subject = "Verify your Projectodo account"
    text_content = (
        f"Hi {username},\n\n"
        f"Please verify your email by clicking the link below:\n"
        f"{verification_url}\n\n"
        f"If you did not sign up for Projectodo, you can ignore this email."
    )

    html_content = (
        f"<p>Hi {username},</p>"
        f"<p>Please verify your email by clicking the link below:</p>"
        f'<p><a href="{verification_url}">{verification_url}</a></p>'
        f"<p>If you didn't sign up for Projectodo, please ignore this.</p>"
    )

    email_message = EmailMultiAlternatives(
        subject=subject,
        body=text_content,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[email],
        connection=None,  # will use default EMAIL_BACKEND
    )
    email_message.content_subtype = "plain"  # plain text

    email_message.attach_alternative(html_content, "text/html")

    email_message.send(fail_silently=False)


@ensure_csrf_cookie
def csrf(request):
    return JsonResponse({"csrfToken": "Set in cookie"})


@require_POST
def set_password_view(request):
    raw_token = None
    password = None

    try:
        data = json.loads(request.body.decode("utf-8"))
        raw_token = data.get("token")
        password = data.get("password")
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    if not raw_token or not password:
        return JsonResponse(
            {"error": "Token and password required"},
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
        return JsonResponse({"error": "Invalid Token"}, status=400)

    if auth_token.is_expired():
        auth_token.delete()
        return JsonResponse({"error": "Token expired"}, status=400)

    if auth_token.token_type == "signup":
        if User.objects.filter(username=auth_token.username).exists():
            auth_token.delete()
            return JsonResponse(
                {"error": "Username already taken"},
                status=400
            )
        if User.objects.filter(email=auth_token.email).exists():
            auth_token.delete()
            return JsonResponse(
                {"error": "Email already registered"},
                status=400
            )

        user = User.objects.create_user(
            username=auth_token.username,
            email=auth_token.email,
            password=password,
            is_active=False
        )

    elif auth_token.token_type == "password_reset":
        user = auth_token.user
        user.set_password(password)
        user.save()

    else:
        auth_token.delete()
        return JsonResponse({"error": "Unknown token type"}, status=400)

    auth_token.delete()

    return JsonResponse({"success": True, "username": user.username})


@require_GET
def verify_email_view(request):

    token = request.GET.get("token")
    username = request.GET.get("username")

    if not token or not username:
        return JsonResponse(
            {"error": "Token and username required"},
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
        return JsonResponse({"error": "Invalid token"}, status=400)

    if auth_token.is_expired():
        auth_token.delete()
        return JsonResponse({"error": "Token expired"}, status=400)

    return JsonResponse({
        "success": True,
        "message": "Email verified successfully"
    })


@csrf_exempt
@require_POST
def signup_request_view(request):
    data = json.loads(request.body.decode("utf-8"))
    username = data.get("username")
    email = data.get("email")

    if not username or not email:
        return JsonResponse(
            {"error": "Username and email required"},
            status=400,
        )

    if User.objects.filter(username=username).exists():
        return JsonResponse(
            {"error": "Username already taken"},
            status=400,
        )

    if User.objects.filter(email=email).exists():
        return JsonResponse(
            {"error": "Email already registered"},
            status=400,
        )

    try:
        send_verification_email(email, username)
        return JsonResponse({
            "success": True,
            "message": f"Verification email sent to {email}"
        })
    except Exception as e:
        print("DEBUG - Failed to send verification email:", e)
        return JsonResponse({
            "success": False,
            "error": f"Failed to send verification email: {e}"
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
            {"error": "Invalid credentials"},
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
