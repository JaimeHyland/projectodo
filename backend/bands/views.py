import json

from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.db import IntegrityError

from user_accounts.permissions import (
    can_create_band,
    can_manage_band,
    can_delete_band,
)
from .models import Band


@require_http_methods(["GET", "POST"])
def admin_bands(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Forbidden"}, status=403)

    if request.method == "GET":
        bands = Band.objects.select_related("band_leader", "created_by").all()

        return JsonResponse({
            "bands": [
                {
                    "id": band.id,
                    "name": band.name,
                    "description": band.description,
                    "contact_email": band.contact_email,
                    "contact_tel": band.contact_tel,
                    "website_url": band.website_url,
                    "social_media_urls": band.social_media_urls,
                    "band_members": band.band_members,
                    "genres": band.genres,
                    "can_manage": can_manage_band(request.user, band),
                    "can_delete": can_delete_band(request.user),
                    "band_leader": {
                        "id": band.band_leader.id,
                        "username": band.band_leader.username,
                        "email": band.band_leader.email,
                    },
                }
                for band in bands
            ]
        })

    if not can_create_band(request.user):
        return JsonResponse({"error": "Forbidden"}, status=403)

    data = json.loads(request.body or "{}")
    
    name = (data.get("name") or "").strip()

    if not name:
        return JsonResponse({"error": "Band name is required."}, status=400)


    User = get_user_model()

    band_leader_id = data.get("band_leader_id")
    band_leader = request.user

    if band_leader_id:
        try:
            band_leader = User.objects.get(id=band_leader_id)
        except User.DoesNotExist:
            return JsonResponse(
                {"error": "Selected band leader does not exist."},
                status=400,
            )

    band_leader_group, _ = Group.objects.get_or_create(name="band_leader")
    band_leader.groups.add(band_leader_group)

    band = Band.objects.create(
        name=name,
        description=(data.get("description") or "").strip(),
        band_leader=request.user,
        created_by=request.user,
        contact_email=(data.get("contact_email") or "").strip(),
        contact_tel=(data.get("contact_tel") or "").strip(),
        website_url=(data.get("website_url") or "").strip(),
        social_media_urls=data.get("social_media_urls") or [],
        band_members=data.get("band_members") or [],
        genres=data.get("genres") or [],
    )

    return JsonResponse({"id": band.id, "name": band.name}, status=201)


@require_http_methods(["POST"])
def admin_band_detail(request, band_id):
    try:
        band = Band.objects.get(id=band_id)
    except Band.DoesNotExist:
        return JsonResponse({"error": "Band not found."}, status=404)

    data = json.loads(request.body or "{}")
    action = data.get("action")

    if action == "delete":
        if not can_delete_band(request.user):
            return JsonResponse({"error": "Forbidden"}, status=403)

        band.delete()
        return JsonResponse({"ok": True})

    if action == "edit":
        if not can_manage_band(request.user, band):
            return JsonResponse({"error": "Forbidden"}, status=403)

        name = (data.get("name") or "").strip()

        if not name:
            return JsonResponse({"error": "Band name is required."}, status=400)
        
        User = get_user_model()

        band_leader_id = data.get("band_leader_id")

        if band_leader_id:
            try:
                band_leader = User.objects.get(id=band_leader_id)
            except User.DoesNotExist:
                return JsonResponse(
                    {"error": "Selected band leader does not exist."},
                    status=400,
                )

            band_leader_group, _ = Group.objects.get_or_create(name="band_leader")
            band_leader.groups.add(band_leader_group)

            band.band_leader = band_leader

        band.name = name
        band.description = (data.get("description") or "").strip()
        band.contact_email = (data.get("contact_email") or "").strip()
        band.contact_tel = (data.get("contact_tel") or "").strip()
        band.website_url = (data.get("website_url") or "").strip()
        band.social_media_urls = data.get("social_media_urls") or []
        band.band_members = data.get("band_members") or []
        band.genres = data.get("genres") or []

        try:
            band.save()
        except IntegrityError:
            return JsonResponse(
                {"error": "Band with this name already exists."},
                status=400,
            )

        return JsonResponse({"ok": True})

    return JsonResponse({"error": "Unknown action."}, status=400)
