import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.views.decorators.http import require_POST, require_GET


@csrf_exempt
@require_POST
def signup_view(request):
    data = json.loads(request.body.decode("utf-8"))

    username = data.get("username")
    password = data.get("password")
    email = data.get("email", "")

    if not username or not password:
        return JsonResponse(
            {"error": "Username and password required"},
            status=400,
        )

    if User.objects.filter(username=username).exists():
        return JsonResponse(
            {"error": "Username already taken"},
            status=400,
        )

    user = User.objects.create_user(
        username=username,
        password=password,
        email=email,
    )

    login(request, user)

    return JsonResponse({
        "success": True,
        "username": user.username,
    })


@csrf_exempt
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
