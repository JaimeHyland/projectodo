from django.http import JsonResponse
from django.http import HttpResponse


def auth_status(request):
    user = request.user
    return JsonResponse({
        "is_authenticated": user.is_authenticated,
        "is_superuser": user.is_superuser if user.is_authenticated else False,
        "username": user.username if user.is_authenticated else None,
    })


def home(request):
    return HttpResponse("Projectodo backend is running!")
