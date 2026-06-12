from django.conf import settings
from django.db import models
from core.models import TimeStampedModel


class Band(TimeStampedModel):
    name = models.CharField(max_length=200, unique=True)
    description = models.TextField(blank=True)

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
        blank=True,
        null=True,
    )

    description_html = models.TextField(blank=True)

    foreground_colour = models.CharField(
        max_length=7,
        default="#000000",
    )

    background_colour = models.CharField(
        max_length=7,
        default="#ffffff",
    )

    published = models.BooleanField(default=True)

    slug = models.SlugField(
        unique=True,
        blank=True
    )

    def __str__(self):
        return f"Page for {self.band.name}"
    

class BandGig(TimeStampedModel):
    band = models.ForeignKey(
        Band,
        on_delete=models.CASCADE,
        related_name="gigs",
    )

    date = models.DateField()

    venue = models.CharField(max_length=200)

    city = models.CharField(max_length=100)

    description = models.TextField(blank=True)

    class Meta:
        ordering = ["-date"]

    def __str__(self):
        return f"{self.band.name} — {self.venue} ({self.date})"


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
    