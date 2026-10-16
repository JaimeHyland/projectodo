from django.conf import settings
from django.db import models
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from core.models import TimeStampedModel
from .validation import (
    band_image_storage, gig_start, validate_colour, validate_localized_text, validate_media_url,
    validate_description_translations, validate_venue_translations, validate_ticket_translations,
)


class Band(TimeStampedModel):
    name = models.CharField(max_length=200, unique=True)
    description = models.TextField(blank=True)
    description_translations = models.JSONField(
        default=dict, blank=True, validators=[validate_description_translations]
    )

    band_leader = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="led_bands",
    )

    contact_email = models.EmailField(blank=True)
    contact_tel = models.CharField(max_length=50, blank=True)
    website_url = models.URLField(blank=True)

    social_media_urls = models.JSONField(default=list, blank=True)
    genres = models.JSONField(default=list, blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_bands",
    )


    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class BandPage(TimeStampedModel):
    band = models.OneToOneField(
        Band,
        on_delete=models.CASCADE,
        related_name="page",
    )

    main_image = models.ImageField(
        upload_to="bands/main/",
        storage=band_image_storage,
        blank=True,
        null=True,
    )

    description_html = models.TextField(blank=True)
    description_translations = models.JSONField(
        default=dict, blank=True, validators=[validate_description_translations]
    )
    image_caption = models.JSONField(default=dict, blank=True, validators=[validate_localized_text])
    image_alt = models.JSONField(default=dict, blank=True, validators=[validate_localized_text])
    audio_url = models.URLField(max_length=1000, blank=True)
    video_url = models.URLField(max_length=1000, blank=True)
    video_captions_url = models.URLField(max_length=1000, blank=True)

    foreground_colour = models.CharField(
        max_length=7,
        default="#000000",
        validators=[validate_colour],
    )

    background_colour = models.CharField(
        max_length=7,
        default="#ffffff",
        validators=[validate_colour],
    )

    published = models.BooleanField(default=True)

    slug = models.SlugField(
        unique=True,
        blank=True
    )

    def clean(self):
        super().clean()
        errors = {}
        for field, kind in (("audio_url", "audio"), ("video_url", "video"),
                            ("video_captions_url", "captions")):
            try:
                validate_media_url(getattr(self, field), kind)
            except ValidationError as error:
                errors[field] = error.messages
        if self.video_captions_url and not self.video_url:
            errors["video_captions_url"] = "Add a video before its caption track."
        if errors:
            raise ValidationError(errors)

    def __str__(self):
        return f"Page for {self.band.name}"
    

class BandGig(TimeStampedModel):
    band = models.ForeignKey(
        Band,
        on_delete=models.CASCADE,
        related_name="gigs",
    )

    date = models.DateField()
    # Nullable only to preserve legacy gigs with an unknown start time.
    start_time = models.TimeField(null=True, help_text="Local time in Europe/Berlin.")

    venue = models.CharField(max_length=200)
    venue_translations = models.JSONField(
        default=dict, blank=True, validators=[validate_venue_translations]
    )

    city = models.CharField(max_length=100)

    description = models.TextField(blank=True)

    class Meta:
        ordering = ["date", "start_time", "id"]

    def clean(self):
        super().clean()
        try:
            gig_start(self.date, self.start_time)
        except ValidationError as error:
            raise ValidationError({"start_time": error.messages}) from error
        if not isinstance(self.venue, str) or not self.venue.strip():
            raise ValidationError({"venue": "Enter a venue name."})

    def __str__(self):
        return f"{self.band.name} — {self.venue} ({self.date})"


class BandTicketPrice(TimeStampedModel):
    gig = models.ForeignKey(BandGig, on_delete=models.CASCADE, related_name="ticket_prices")
    description = models.CharField(max_length=100)
    description_translations = models.JSONField(
        default=dict, blank=True, validators=[validate_ticket_translations]
    )
    price = models.DecimalField(
        "Price (EUR)", max_digits=8, decimal_places=2, validators=[MinValueValidator(0)]
    )

    class Meta:
        ordering = ["id"]
        constraints = [models.CheckConstraint(
            condition=models.Q(price__gte=0), name="band_ticket_price_nonnegative"
        )]

    def clean(self):
        super().clean()
        if not isinstance(self.description, str) or not self.description.strip():
            raise ValidationError({"description": "Enter a ticket-price description."})

    def __str__(self):
        return f"{self.description}: {self.price} EUR"


class BandGalleryImage(TimeStampedModel):
    band = models.ForeignKey(
        Band,
        on_delete=models.CASCADE,
        related_name="gallery_images",
    )

    image = models.ImageField(
        upload_to="bands/gallery/",
    )

    caption = models.CharField(
        max_length=500,
        blank=True,
    )

    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order"]

    def __str__(self):
        if self.caption:
            return f"{self.band.name} — {self.caption}"
        
        return f"Gallery image for {self.band.name}"


class BandMember(TimeStampedModel):
    band = models.ForeignKey(
        Band,
        on_delete=models.CASCADE,
        related_name="members",
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="band_memberships",
    )

    name = models.CharField(max_length=255)

    roles = models.JSONField(
        default=list,
        blank=True,
    )

    sort_order = models.PositiveIntegerField(
        default=0,
    )

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self):
        return self.name

