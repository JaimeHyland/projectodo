import json
import logging

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Prefetch
from django.utils import timezone
from core.images import ImageUploadError, prepare_image

from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.utils.text import slugify
from django.views.decorators.http import require_http_methods, require_GET, require_POST
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.db import IntegrityError

from user_accounts.permissions import (
    can_create_band,
    can_manage_band,
    can_delete_band,
    can_manage_band_page,
)
from .models import Band, BandPage, BandGig
from .validation import (
    GIG_TIMEZONE, gig_start, readable_foreground, validate_colour, validate_localized_text,
    validate_description_translations,
)


def make_unique_band_page_slug(band):
    base_slug = slugify(band.name) or f"band-{band.id}"
    slug = base_slug
    counter = 2

    while BandPage.objects.filter(slug=slug).exists():
        slug = f"{base_slug}-{counter}"
        counter +=1

    return slug


@require_POST
def create_band_page(request, band_id):
    band = get_object_or_404(Band, id=band_id)

    if not can_manage_band_page(request.user, band):
        return JsonResponse(
            {"error": "You do not have permission to create this band page."},
            status=403,
        )

    try:
        existing_page = band.page
    except BandPage.DoesNotExist:
        existing_page = None

    if existing_page:
        return JsonResponse(
            {"error": "This band already has a public page."},
            status=400,
        )

    page = BandPage(band=band, slug=make_unique_band_page_slug(band), published=False)
    error = apply_page_payload(page, request)
    if error:
        return error
    persist_page(page)
    return JsonResponse(serialize_page(page, request.user), status=201)


def serialize_band(band, user=None):
    
    try:
        page = band.page
    except BandPage.DoesNotExist:
        page = None

    data = {
        "id": band.id,
        "name": band.name,
        "description": band.description,
        "description_translations": band.description_translations,
        "contact_email": band.contact_email,
        "contact_tel": band.contact_tel,
        "website_url": band.website_url,
        "social_media_urls": band.social_media_urls,
        "genres": band.genres,
        "members": [
            serialize_band_member(member)
            for member in band.members.all()
        ],
        "band_leader": (
            {
                "id": band.band_leader.id,
                "username": band.band_leader.username,
                "email": band.band_leader.email,
            }
            if band.band_leader
            else None
        ),
        "page": (
            {
                "id": page.id,
                "slug": page.slug,
                "published": page.published,
            }
            if page
            else None
        ),
    }

    if user is not None:
        data["can_manage"] = can_manage_band(user, band)
        data["can_delete"] = can_delete_band(user)

    return data


def serialize_page(page, user=None):
    try:
        validate_colour(page.background_colour)
        background = page.background_colour
    except ValidationError:
        background = "#ffffff"
    return {
        "id": page.id, "slug": page.slug, "description_html": page.description_html,
        "description_translations": page.description_translations,
        "background_colour": background,
        "foreground_colour": readable_foreground(background, page.foreground_colour),
        "published": page.published, "band": serialize_band(page.band, user),
        "main_image": page.main_image.url if page.main_image else None,
        "image_caption": page.image_caption, "image_alt": page.image_alt,
        "audio_url": page.audio_url, "video_url": page.video_url,
        "video_captions_url": page.video_captions_url,
    }


def apply_page_payload(page, request):
    try:
        data = json.loads(request.body or "{}")
        if not isinstance(data, dict):
            raise ValueError("Expected an object")
        for field in ("description_html", "background_colour", "foreground_colour",
                      "audio_url", "video_url", "video_captions_url"):
            if field in data:
                if not isinstance(data[field], str):
                    raise ValueError(f"{field} must be text")
                setattr(page, field, data[field])
        for field in ("image_caption", "image_alt"):
            if field in data:
                validate_localized_text(data[field])
                setattr(page, field, data[field])
        if "description_translations" in data:
            validate_description_translations(data["description_translations"])
            page.description_translations = {
                **page.description_translations, **data["description_translations"]
            }
        if "band_description_translations" in data:
            validate_description_translations(data["band_description_translations"])
            page.band.description_translations = {
                **page.band.description_translations, **data["band_description_translations"]
            }
        if "published" in data:
            if not isinstance(data["published"], bool):
                raise ValueError("published must be a boolean")
            page.published = data["published"]
        # No client-supplied filesystem paths or storage references.
        if "main_image" in data:
            raise ValueError("Use the image upload endpoint")
        page.full_clean(exclude=["main_image"])
    except (ValueError, UnicodeDecodeError, ValidationError) as error:
        message = error.message_dict if hasattr(error, "message_dict") else str(error)
        return JsonResponse({"error": message}, status=400)
    return None


@transaction.atomic
def persist_page(page):
    page.save()
    page.band.save(update_fields=["description_translations", "updated_at"])


@require_GET
def public_band_page_detail(request, slug):
    now = timezone.now()
    gigs = BandGig.objects.filter(
        start_time__isnull=False, date__gte=now.astimezone(GIG_TIMEZONE).date()
    ).prefetch_related("ticket_prices").order_by("date", "start_time", "id")
    page = get_object_or_404(
        BandPage.objects.select_related("band", "band__band_leader").prefetch_related(
            "band__members", Prefetch("band__gigs", queryset=gigs, to_attr="public_gigs")
        ), slug=slug, published=True,
    )
    upcoming = []
    for gig in page.band.public_gigs:
        try:
            starts_at = gig_start(gig.date, gig.start_time)
        except ValidationError:
            continue  # Incomplete/ambiguous legacy schedules need administrator review.
        prices = list(gig.ticket_prices.all())
        if starts_at <= now or not prices:
            continue
        upcoming.append({
            "id": gig.id, "venue": gig.venue, "city": gig.city,
            "venue_translations": gig.venue_translations,
            "starts_at": starts_at.isoformat(),
            "ticket_prices": [{"id": price.id, "description": price.description,
                               "description_translations": price.description_translations,
                               "price": format(price.price, ".2f")} for price in prices],
        })
    data = serialize_page(page)
    data.update(upcoming_gigs=upcoming, server_time=now.isoformat(), gig_timezone="Europe/Berlin")
    response = JsonResponse(data)
    response["Cache-Control"] = "no-store"
    return response


@require_POST
def upload_band_image(request, band_id):
    band = get_object_or_404(Band, id=band_id)
    if not can_manage_band_page(request.user, band):
        return JsonResponse({"error": "Forbidden"}, status=403)
    page = get_object_or_404(BandPage, band=band)
    try:
        content = prepare_image(request.FILES.get("image"))
    except ImageUploadError as error:
        return JsonResponse({"error": str(error)}, status=400)
    name = None
    storage = page.main_image.storage
    try:
        name = storage.save(f"bands/main/{content.name}", content)
        with transaction.atomic():
            page.main_image = name
            page.save(update_fields=["main_image", "updated_at"])
    except Exception:
        logging.getLogger(__name__).exception("Band photograph save failed")
        if name:
            try:
                storage.delete(name)
            except Exception:
                logging.getLogger(__name__).exception("Unused photograph cleanup failed")
        return JsonResponse({"error": "image_storage"}, status=503)
    return JsonResponse({"main_image": page.main_image.url})


def admin_bands(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Forbidden"}, status=403)
    if request.method == "GET":
        bands = (
            Band.objects
            .select_related("band_leader", "created_by", "page")
            .prefetch_related("members")
            .all()
        )

        return JsonResponse({
            "bands": [
                serialize_band(band, request.user)
                for band in bands
            ]
        })

    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    if not can_create_band(request.user):
        return JsonResponse({"error": "Forbidden"}, status=403)

    data = json.loads(request.body or "{}")
    try:
        validate_description_translations(data.get("description_translations", {}))
    except ValidationError as error:
        return JsonResponse({"error": str(error)}, status=400)

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
        description_translations=data.get("description_translations", {}),
        band_leader=band_leader,
        created_by=request.user,
        contact_email=(data.get("contact_email") or "").strip(),
        contact_tel=(data.get("contact_tel") or "").strip(),
        website_url=(data.get("website_url") or "").strip(),
        social_media_urls=data.get("social_media_urls") or [],
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

        if "description_translations" in data:
            try:
                validate_description_translations(data["description_translations"])
            except ValidationError as error:
                return JsonResponse({"error": str(error)}, status=400)
            band.description_translations = {
                **band.description_translations, **data["description_translations"]
            }

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

def serialize_band_member(member):
    return {
        "id": member.id,
        "name": member.name,
        "roles": member.roles,
        "sort_order": member.sort_order,
        "user_id": member.user_id,
    }



@require_http_methods(["GET", "PATCH"])
def admin_band_page_detail(request, band_id):
    band = get_object_or_404(
        Band.objects.select_related("band_leader").prefetch_related("members"),
        id=band_id,
    )

    if not can_manage_band_page(request.user, band):
        return JsonResponse({"error": "Forbidden"}, status=403)

    try:
        page = band.page
    except BandPage.DoesNotExist:
        return JsonResponse({"error": "This band does not have a webpage yet."}, status=404)

    if request.method == "PATCH":
        error = apply_page_payload(page, request)
        if error:
            return error
        persist_page(page)
    return JsonResponse(serialize_page(page, request.user))


@require_GET
def public_band_pages(request):
    pages = (
        BandPage.objects
        .filter(published=True)
        .select_related("band")
        .order_by("band__name")
    )

    return JsonResponse({
        "pages": [
            {
                "id": page.id,
                "slug": page.slug,
                "band": {
                    "id": page.band.id,
                    "name": page.band.name,
                    "description": page.band.description,
                    "description_translations": page.band.description_translations,
                    "genres": page.band.genres,
                },
            }
            for page in pages
        ]
    })
