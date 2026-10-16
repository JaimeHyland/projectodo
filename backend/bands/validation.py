from datetime import date as Date, datetime, time as Time, timezone
from pathlib import PurePosixPath
from urllib.parse import urlsplit
from zoneinfo import ZoneInfo

from django.core.exceptions import ValidationError
from django.core.files.storage import storages
from django.core.validators import RegexValidator, URLValidator
from core.cms import LOCALES

GIG_TIMEZONE = ZoneInfo("Europe/Berlin")
validate_colour = RegexValidator(r"\A#[0-9a-fA-F]{6}\Z", "Enter a six-digit hex colour.")


def band_image_storage():
    return storages["cms"]


def validate_localized_text(value):
    if (not isinstance(value, dict) or set(value) - set(LOCALES)
            or any(not isinstance(text, str) or len(text) > 500 for text in value.values())):
        raise ValidationError("Use supported locale keys and text up to 500 characters.")


def validate_translations(value, maximum, required=False):
    if (not isinstance(value, dict) or set(value) - set(LOCALES)
            or any(not isinstance(text, str) or len(text) > maximum
                   or (required and not text.strip()) for text in value.values())):
        raise ValidationError(f"Use supported locale keys and text up to {maximum} characters.")


def validate_description_translations(value):
    validate_translations(value, 20000)


def validate_venue_translations(value):
    validate_translations(value, 200, required=True)


def validate_ticket_translations(value):
    validate_translations(value, 100, required=True)


def validate_media_url(value, kind):
    if not value:
        return
    URLValidator(schemes=["https"])(value)
    parsed = urlsplit(value)
    extensions = {"audio": {".mp3", ".m4a", ".ogg", ".wav"},
                  "video": {".mp4", ".webm"}, "captions": {".vtt"}}
    if (parsed.username or parsed.password or parsed.fragment
            or PurePosixPath(parsed.path).suffix.lower() not in extensions[kind]):
        raise ValidationError(f"Enter a direct HTTPS {kind} file URL.")


def gig_start(date, start_time):
    if not isinstance(date, Date) or not isinstance(start_time, Time):
        raise ValidationError("A gig requires both a date and a start time.")
    local = datetime.combine(date, start_time, tzinfo=GIG_TIMEZONE)
    roundtrip = local.astimezone(timezone.utc).astimezone(GIG_TIMEZONE)
    if (roundtrip.replace(tzinfo=None) != local.replace(tzinfo=None)
            or local.utcoffset() != local.replace(fold=1).utcoffset()):
        raise ValidationError("This Berlin time is missing or ambiguous due to daylight saving.")
    return local


def readable_foreground(background, preferred="#000000"):
    def luminance(colour):
        channels = [int(colour[index:index + 2], 16) / 255 for index in (1, 3, 5)]
        channels = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
                    for c in channels]
        return sum(c * weight for c, weight in zip(channels, (0.2126, 0.7152, 0.0722)))

    try:
        validate_colour(background)
        light = luminance(background)
    except ValidationError:
        return "#000000"
    try:
        validate_colour(preferred)
        other = luminance(preferred)
        if (max(light, other) + 0.05) / (min(light, other) + 0.05) >= 4.5:
            return preferred
    except ValidationError:
        pass
    return "#000000" if (light + 0.05) / 0.05 >= 1.05 / (light + 0.05) else "#ffffff"
