from django.conf import settings
from django.db import models


class Band(models.Model):
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
    band_members = models.JSONField(default=list, blank=True)
    genres = models.JSONField(default=list, blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_bands",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class BandPage(models.Model):
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

    updated_at = models.DateTimeField(auto_now=True)


class BandGig(models.Model):
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


class BandGalleryImage(models.Model):
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
    