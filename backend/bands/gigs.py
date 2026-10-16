"""Dashboard gig editing uses the same band-page permission and session/CSRF policy."""
import json
import re
from decimal import Decimal, InvalidOperation

from django.core.exceptions import ValidationError
from django.db import transaction
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_http_methods

from user_accounts.permissions import can_manage_band_page
from .models import Band, BandGig, BandTicketPrice
from .validation import validate_venue_translations, validate_ticket_translations


def serialize_gig(gig):
    return {
        "id": gig.id, "venue": gig.venue, "venue_translations": gig.venue_translations,
        "city": gig.city, "date": gig.date.isoformat(),
        "start_time": gig.start_time.isoformat() if gig.start_time else "",
        "ticket_prices": [{
            "id": price.id, "description": price.description,
            "description_translations": price.description_translations,
            "price": format(price.price, ".2f"),
        } for price in gig.ticket_prices.all()],
    }


def save_gig(gig, request):
    """Validate the complete gig and price list before changing any rows."""
    data = json.loads(request.body)
    if not isinstance(data, dict):
        raise ValueError("Expected an object")
    for field in ("date", "start_time", "venue", "city"):
        if field in data:
            if not isinstance(data[field], str):
                raise ValueError(f"{field} must be text")
            setattr(gig, field, data[field])
    if "start_time" in data and not re.fullmatch(r"\d{2}:\d{2}(?::\d{2})?", data["start_time"]):
        raise ValueError("Enter a Berlin-local time as HH:MM")
    if "venue_translations" in data:
        validate_venue_translations(data["venue_translations"])
        gig.venue_translations = {**gig.venue_translations, **data["venue_translations"]}
    if not gig.venue:
        gig.venue = next(iter(gig.venue_translations.values()), "")
    gig.full_clean()

    existing = {price.id: price for price in gig.ticket_prices.all()} if gig.pk else {}
    entries = data.get("ticket_prices")
    if entries is None:
        if not existing:
            raise ValueError("Add at least one ticket price")
        gig.save()
        return
    if not isinstance(entries, list) or not 1 <= len(entries) <= 50:
        raise ValueError("Add between one and fifty ticket prices")
    prices, seen = [], set()
    for entry in entries:
        if not isinstance(entry, dict):
            raise ValueError("Invalid ticket-price entry")
        identifier = entry.get("id")
        if identifier is not None:
            if type(identifier) is not int or identifier not in existing or identifier in seen:
                raise ValueError("Ticket price does not belong to this gig or is duplicated")
            seen.add(identifier)
        price = existing[identifier] if identifier is not None else BandTicketPrice(gig=gig)
        if "description_translations" in entry:
            validate_ticket_translations(entry["description_translations"])
            price.description_translations = {
                **price.description_translations, **entry["description_translations"]
            }
        if "description" in entry:
            if not isinstance(entry["description"], str):
                raise ValueError("Ticket description must be text")
            price.description = entry["description"]
        if not price.description:
            price.description = next(iter(price.description_translations.values()), "")
        if not isinstance(entry.get("price"), str):
            raise ValueError("Send euro prices as decimal strings")
        price.price = Decimal(entry["price"])
        price.full_clean(exclude=["gig"])
        prices.append(price)
    gig.save()
    for price in prices:
        price.gig = gig
        price.save()
    # Removing a row in the editor is an explicit removal from the submitted list.
    gig.ticket_prices.filter(pk__in=set(existing) - seen).delete()


def error_response(error):
    return JsonResponse({"error": getattr(error, "message_dict", str(error))}, status=400)


@require_http_methods(["GET", "POST"])
def admin_band_gigs(request, band_id):
    band = get_object_or_404(Band, pk=band_id)
    if not can_manage_band_page(request.user, band):
        return JsonResponse({"error": "Forbidden"}, status=403)
    if request.method == "GET":
        response = JsonResponse({"gigs": [serialize_gig(gig) for gig in
                                 band.gigs.prefetch_related("ticket_prices").all()]})
        response["Cache-Control"] = "no-store"
        return response
    try:
        with transaction.atomic():
            gig = BandGig(band=band)
            save_gig(gig, request)
    except (ValueError, InvalidOperation, ValidationError) as error:
        return error_response(error)
    return JsonResponse(serialize_gig(gig), status=201)


@require_http_methods(["PATCH", "DELETE"])
def admin_band_gig_detail(request, band_id, gig_id):
    band = get_object_or_404(Band, pk=band_id)
    if not can_manage_band_page(request.user, band):
        return JsonResponse({"error": "Forbidden"}, status=403)
    try:
        with transaction.atomic():
            gig = get_object_or_404(BandGig.objects.select_for_update(), pk=gig_id, band=band)
            if request.method == "DELETE":
                gig.delete()
                return JsonResponse({"ok": True})
            save_gig(gig, request)
    except (ValueError, InvalidOperation, ValidationError) as error:
        return error_response(error)
    return JsonResponse(serialize_gig(gig))
