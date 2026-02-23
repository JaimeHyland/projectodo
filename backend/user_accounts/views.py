import json
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.views.decorators.http import require_POST, require_GET
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils import timezone
from datetime import timedelta
from .models import AuthToken
from .utilities import generate_secure_token
from django.views.decorators.csrf import csrf_exempt
from django.core.mail import send_mail
from decouple import config


@csrf_exempt
def test_email_view(request):
    recipient = config("EMAIL_HOST_RECIPIENT")  # send to yourself
    try:
        send_mail(
            subject="Django Test Email",
            message="If you receive this, your email sending works!",
            from_email=config("DEFAULT_FROM_EMAIL"),
            recipient_list=[recipient],
            fail_silently=False,
        )
        return JsonResponse(
            {"success": True, "message": f"Email sent to {recipient}"}
        )
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)})


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

    raw_token, token_hash = generate_secure_token()

    AuthToken.objects.create(
        username=username,
        email=email,
        token_hash=token_hash,
        token_type="signup",
        expires_at=timezone.now() + timedelta(minutes=30)
    )

    return JsonResponse({
        "success": True,
        "message": "Verification email sent.",
    })


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
