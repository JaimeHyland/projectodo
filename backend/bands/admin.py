# bands/admin.py
from django.contrib import admin
from .models import Band

@admin.register(Band)
class BandAdmin(admin.ModelAdmin):
    list_display = ("name", "band_leader", "contact_email", "created_by", "created_at")
    search_fields = ("name", "description", "contact_email")
    list_filter = ("created_at",)
    ordering = ("name",)
