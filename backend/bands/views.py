import json

from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.db import IntegrityError

from user_accounts.permissions import is_webmaster
from .models import Band


@require_http_methods(["GET", "POST"])
def admin_bands(request):
    if not request.user.is_authenticated or not is_webmaster(request.user):
        return JsonResponse({"error": "Forbidden"}, status=403)

    if request.method == "GET":
        bands = Band.objects.select_related("band_leader", "created_by").all()

        return JsonResponse({
            "bands": [
                {
                    "id": band.id,
                    "name": band.name,
                    "description": band.description,
                    "can_manage": can_manage_band(request.user, band),
                    "band_leader": {
                        "id": band.band_leader.id,
                        "username": band.band_leader.username,
                        "email": band.band_leader.email,
                    },
                    "contact_email": band.contact_email,
                    "contact_tel": band.contact_tel,
                    "website_url": band.website_url,
                    "social_media_urls": band.social_media_urls,
                    "band_members": band.band_members,
                    "genres": band.genres,
                }
                for band in bands
            ]
        })

    data = json.loads(request.body or "{}")
    name = (data.get("name") or "").strip()

    if not name:
        return JsonResponse({"error": "Band name is required."}, status=400)

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

def can_manage_band(user, band):
    return (
        user.is_authenticated
        and
            (is_webmaster(user)
              or band.band_leader_id == user.id
              or user.is_superuser
            )
    )

@require_http_methods(["POST"])
def admin_band_detail(request, band_id):
    try:
        band = Band.objects.get(id=band_id)
    except Band.DoesNotExist:
        return JsonResponse({"error": "Band not found."}, status=404)
    
    if not can_manage_band(request.user, band):
        return JsonResponse({"error": "Forbidden"}, status=403)
    
    data = json.loads(request.body or "{}")
    action = data.get("action")

    if action == "delete":
        band.delete()
        return JsonResponse({"ok": True})
    
    if action == "edit":
        name = (data.get("name") or "").strip()

        if not name:
            return JsonResponse({"error": "Band name is required."}, status=400)
        
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
            return JsonResponse({"ok": True})
        except IntegrityError:
            return JsonResponse(
                {"error": "Band with this name already exists."},
                status=400
            )
        
        return JsonResponse({"ok": True})
    
    return JsonResponse({"error": "Unknown action."}, status=400)
