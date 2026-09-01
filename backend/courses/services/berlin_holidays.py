import json
import ssl
from dataclasses import dataclass
from datetime import date
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import certifi
from django.conf import settings
from django.core.cache import cache


COUNTRY_CODE = "DE"
SUBDIVISION_CODE = "DE-BE"


class HolidayCalendarUnavailable(Exception):
    pass


@dataclass(frozen=True)
class HolidayPeriod:
    start_date: date
    end_date: date
    name: str
    kind: str


def _localized_name(item):
    names = item.get("name") or []
    for name in names:
        if name.get("language") == "EN":
            return name.get("text") or "Holiday"
    return names[0].get("text", "Holiday") if names else "Holiday"


def _fetch_holidays(endpoint, valid_from, valid_to, kind):
    base_url = getattr(
        settings,
        "OPEN_HOLIDAYS_API_URL",
        "https://openholidaysapi.org",
    ).rstrip("/")
    query = urlencode({
        "countryIsoCode": COUNTRY_CODE,
        "subdivisionCode": SUBDIVISION_CODE,
        "validFrom": valid_from.isoformat(),
        "validTo": valid_to.isoformat(),
        "languageIsoCode": "EN",
    })
    request = Request(
        f"{base_url}/{endpoint}?{query}",
        headers={"Accept": "application/json", "User-Agent": "projectodo/1.0"},
    )

    try:
        context = ssl.create_default_context(cafile=certifi.where())
        with urlopen(request, timeout=10, context=context) as response:
            payload = json.load(response)
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as error:
        raise HolidayCalendarUnavailable(
            "Berlin holiday data could not be retrieved."
        ) from error

    try:
        return [
            HolidayPeriod(
                start_date=date.fromisoformat(item["startDate"]),
                end_date=date.fromisoformat(item["endDate"]),
                name=_localized_name(item),
                kind=kind,
            )
            for item in payload
        ]
    except (KeyError, TypeError, ValueError) as error:
        raise HolidayCalendarUnavailable(
            "Berlin holiday data had an unexpected format."
        ) from error


def _year_holidays(year):
    cache_key = f"berlin-holidays:{year}:v1"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    valid_from = date(year, 1, 1)
    valid_to = date(year, 12, 31)
    result = {
        "public": _fetch_holidays(
            "PublicHolidays", valid_from, valid_to, "public"
        ),
        "school": _fetch_holidays(
            "SchoolHolidays", valid_from, valid_to, "school"
        ),
    }
    cache.set(cache_key, result, timeout=60 * 60 * 24)
    return result


def get_berlin_holiday_calendar(valid_from, valid_to):
    public_holidays = []
    school_holidays = []

    for year in range(valid_from.year, valid_to.year + 1):
        year_data = _year_holidays(year)
        public_holidays.extend(year_data["public"])
        school_holidays.extend(year_data["school"])

    def overlaps(period):
        return period.start_date <= valid_to and period.end_date >= valid_from

    return {
        "public": [period for period in public_holidays if overlaps(period)],
        "school": [period for period in school_holidays if overlaps(period)],
    }
