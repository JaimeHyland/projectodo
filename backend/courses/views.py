import json

from django.http import JsonResponse
from django.views.decorators.http import require_GET, require_http_methods
from django.utils.translation import gettext as _
from django.core.exceptions import ValidationError

from user_accounts.permissions import is_webmaster

from .models import Course, Location, Place


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


@require_http_methods(["POST"])
def admin_create_course_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": _("Authentication required")}, status=401)

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": _("Invalid JSON")}, status=400)

    try:
        location = Location.objects.get(id=data["location"])
    except (KeyError, Location.DoesNotExist):
        return JsonResponse({"error": _("Invalid location")}, status=400)

    course = Course(
        name=data.get("name", ""),
        course_type=data.get("course_type", "one_to_one"),
        subject=data.get("subject", "guitar"),
        term_type=data.get("term_type", "school_term"),
        duration_type=data.get("duration_type", "date_range"),
        instructor=request.user,
        max_participants=data.get("max_participants", 1),
        location=location,
        place=None,
        start_date=data.get("start_date"),
        end_date=data.get("end_date") or None,
        start_time=data.get("start_time"),
        duration_minutes=data.get("duration_minutes", 60),
        days_of_week=data.get("days_of_week", ""),
    )

    try:
        course.full_clean()
    except ValidationError as error:
        return JsonResponse({"error": error.message_dict}, status=400)

    course.save()

    return JsonResponse(
        {
            "id": course.id,
            "name": course.name,
            "course_type": course.course_type,
            "subject": course.subject,
            "term_type": course.term_type,
            "duration_type": course.duration_type,
            "instructor": course.instructor_id,
            "max_participants": course.max_participants,
            "location": course.location_id,
            "place": course.place_id,
            "start_date": course.start_date.isoformat(),
            "end_date": course.end_date.isoformat() if course.end_date else None,
            "start_time": course.start_time.isoformat(),
            "duration_minutes": course.duration_minutes,
            "days_of_week": course.days_of_week,
        },
        status=201,
    )

@require_http_methods(["POST"])
def admin_create_place_view(request, location_id):
    if not request.user.is_authenticated:
        return JsonResponse({"error": _("Authentication required")}, status=401)

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": _("Invalid JSON")}, status=400)

    try:
        location = Location.objects.get(id=location_id)
    except Location.DoesNotExist:
        return JsonResponse({"error": _("Invalid location")}, status=400)

    name = data.get("name", "").strip()
    notes = data.get("notes", "").strip()
    capacity = data.get("capacity")

    if not name:
        return JsonResponse({"error": _("Place name is required")}, status=400)

    if capacity in ("", None):
        capacity = None

    place = Place.objects.create(
        location=location,
        name=name,
        capacity=capacity,
        notes=notes,
    )

    return JsonResponse(
        {
            "id": place.id,
            "location": place.location_id,
            "name": place.name,
            "capacity": place.capacity,
            "notes": place.notes,
        },
        status=201,
    )
