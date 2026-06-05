import json

from django.http import JsonResponse
from django.views.decorators.http import require_GET, require_http_methods

from user_accounts.permissions import is_webmaster

from .models import Location


@require_GET
def public_locations_view():
    locations = Location.objects.all().order_by("name")

    return JsonResponse({
        "locations": [
            {
                "id": location.id,
                "name": location.name,
                "street_address": location.street_address,
                "city": location.city,
                "state": location.state,
                "postcode": location.postcode,
                "country": location.country,
            }
            for location in locations
        ]
    })

def serialize_location(location):
    return {
        "id": location.id,
        "name": location.name,
        "street_address": location.street_address,
        "city": location.city,
        "state": location.state,
        "postcode": location.postcode,
        "country": location.country,
    }


@require_GET
def public_locations_view(request):
    locations = Location.objects.all().order_by("name")

    return JsonResponse({
        "locations": [serialize_location(location) for location in locations]
    })


@require_http_methods(["POST"])
def admin_create_location_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": _("Authentication required")}, status=401)

    if not is_webmaster(request.user):
        return JsonResponse({"error": _("Webmaster permissions required")}, status=403)

    data = json.loads(request.body.decode("utf-8"))

    location = Location.objects.create(
        name=data.get("name", "").strip(),
        street_address=data.get("street_address", "").strip(),
        city=data.get("city", "").strip(),
        state=data.get("state", "").strip(),
        postcode=data.get("postcode", "").strip(),
        country=data.get("country", "").strip(),
    )

    return JsonResponse({"success": True, "location": serialize_location(location)})


@require_http_methods(["POST"])
def admin_update_location_view(request, location_id):
    if not request.user.is_authenticated:
        return JsonResponse({"error": _("Authentication required")}, status=401)

    if not is_webmaster(request.user):
        return JsonResponse({"error": _("Webmaster permissions required")}, status=403)

    try:
        location = Location.objects.get(id=location_id)
    except Location.DoesNotExist:
        return JsonResponse({"error": _("Location not found")}, status=404)

    data = json.loads(request.body.decode("utf-8"))

    location.name = data.get("name", "").strip()
    location.street_address = data.get("street_address", "").strip()
    location.city = data.get("city", "").strip()
    location.state = data.get("state", "").strip()
    location.postcode = data.get("postcode", "").strip()
    location.country = data.get("country", "").strip()
    location.save()

    return JsonResponse({"success": True, "location": serialize_location(location)})


@require_http_methods(["POST"])
def admin_delete_location_view(request, location_id):
    if not request.user.is_authenticated:
        return JsonResponse({"error": _("Authentication required")}, status=401)

    if not is_webmaster(request.user):
        return JsonResponse({"error": _("Webmaster permissions required")}, status=403)

    try:
        location = Location.objects.get(id=location_id)
    except Location.DoesNotExist:
        return JsonResponse({"error": _("Location not found")}, status=404)

    location.delete()

    return JsonResponse({"success": True})
