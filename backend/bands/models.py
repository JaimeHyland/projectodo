# bands/models.py

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

# Create your models here.
