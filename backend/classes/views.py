
from django.http import JsonResponse
from django.views.decorators.http import require_GET

from .models import Location


@require_GET
def public_locations_view(request):
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
