import json
import logging
from functools import wraps

from django.core.files.storage import storages
from django.db import transaction
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST, require_http_methods

from user_accounts.permissions import is_webmaster
from .cms import FIELDS, LOCALES, PAGES
from .models import PageContent
from .images import ImageUploadError, prepare_image

logger = logging.getLogger(__name__)


def admin_required(view):
    @wraps(view)
    def wrapped(request, *args, **kwargs):
        if not is_webmaster(request.user):
            return JsonResponse({"error": "Forbidden"}, status=403)
        return view(request, *args, **kwargs)
    return wrapped


def uncached(data, status=200):
    response = JsonResponse(data, status=status)
    response["Cache-Control"] = "no-store"
    return response


@require_GET
def public_content(request, page, locale):
    if page not in PAGES or locale not in LOCALES:
        return uncached({"error": "Not found"}, 404)
    identifiers = [key for key, field in FIELDS.items() if field["page"] == page]
    # Preserve blanks. An absent key, rather than a falsey value, means missing.
    values = dict(PageContent.objects.filter(
        identifier__in=identifiers, locale=locale
    ).values_list("identifier", "value"))
    return uncached({"values": values})


@admin_required
@require_GET
@ensure_csrf_cookie
def admin_content(request):
    values = {}
    for row in PageContent.objects.filter(identifier__in=FIELDS, locale__in=LOCALES):
        values.setdefault(row.identifier, {})[row.locale] = row.value
    return uncached({"locales": LOCALES, "items": [
        {"id": key, "page": field["page"], "section": field["section"],
         "path": field["path"], "kind": field["kind"], "values": values.get(key, {}),
         "fallbacks": field["initial"]}
        for key, field in FIELDS.items()
    ]})


@admin_required
@require_http_methods(["PATCH"])
def update_content(request, identifier, locale):
    field = FIELDS.get(identifier)
    if not field or locale not in LOCALES:
        return uncached({"error": "Not found"}, 404)
    if field["kind"] != "text":
        return uncached({"error": "Replace images using the image upload endpoint"}, 400)
    try:
        data = json.loads(request.body)
    except (ValueError, UnicodeDecodeError):
        return uncached({"error": "Invalid JSON"}, 400)
    value = data.get("value") if isinstance(data, dict) else None
    if not isinstance(value, str) or len(value) > 20000:
        return uncached({"error": "Expected text of at most 20000 characters"}, 400)
    PageContent.objects.update_or_create(
        identifier=identifier, locale=locale, defaults={"value": value}
    )
    return uncached({"value": value})


@admin_required
@require_POST
def upload_image(request, identifier, locale):
    field = FIELDS.get(identifier)
    if not field or field["kind"] != "image" or locale not in LOCALES:
        return uncached({"error": "Not found"}, 404)
    try:
        content = prepare_image(request.FILES.get("image"))
    except ImageUploadError as error:
        return uncached({"error": str(error)}, 400)
    name = None
    storage = None
    try:
        storage = storages["cms"]
        name = storage.save(content.name, content)
        value = storage.url(name)
        with transaction.atomic():
            PageContent.objects.update_or_create(
                identifier=identifier, locale=locale, defaults={"value": value}
            )
    except Exception:
        logger.exception("CMS image save failed")
        if name and storage:
            try:
                storage.delete(name)
            except Exception:
                logger.exception("Could not remove unused CMS upload")
        return uncached({"error": "image_storage"}, 503)
    # Never delete a replaced image: other locales/records may still reference it.
    return uncached({"value": value})
