from django.http import HttpResponse


def home(request):
    return HttpResponse("The Projectodo backend is running!")
