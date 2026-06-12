# bands/admin.py
from django.contrib import admin
from .models import Band, BandPage, BandGig, BandGalleryImage, BandMember

@admin.register(Band)
class BandAdmin(admin.ModelAdmin):
    list_display = ("name", "band_leader", "contact_email", "created_by", "created_at",)
    search_fields = ("name", "description", "contact_email",)
    list_filter = ("created_at",)
    ordering = ("name",)

@admin.register(BandPage)
class BandPageAdmin(admin.ModelAdmin):
    list_display = ("band", "slug", "published", "created_at", "updated_at",)
    search_fields = ("band__name", "slug", "description_html",)
    list_filter = ("published", "created_at", "updated_at",)
    readonly_fields = ( "created_at", "updated_at",)

@admin.register(BandMember)
class BandMemberAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "band",
        "user",
        "roles",
        "sort_order",
        "created_at",
        "updated_at",
    )
    search_fields = (
        "name",
        "band__name",
        "user__username",
        "user__email",
    )
    list_filter = (
        "band",
        "created_at",
        "updated_at",
    )
    readonly_fields = (
        "created_at",
        "updated_at",
    )


@admin.register(BandGig)
class BandGigAdmin(admin.ModelAdmin):
    list_display = (
        "band",
        "venue",
        "city",
        "date",
        "created_at",
        "updated_at",
    )
    search_fields = (
        "band__name",
        "venue",
        "city",
        "description",
    )
    list_filter = (
        "band",
        "date",
        "created_at",
        "updated_at",
    )
    readonly_fields = (
        "created_at",
        "updated_at",
    )


@admin.register(BandGalleryImage)
class BandGalleryImageAdmin(admin.ModelAdmin):
    list_display = (
        "band",
        "caption",
        "sort_order",
        "created_at",
        "updated_at",
    )
    search_fields = (
        "band__name",
        "caption",
    )
    list_filter = (
        "band",
        "created_at",
        "updated_at",
    )
    readonly_fields = (
        "created_at",
        "updated_at",
    )

