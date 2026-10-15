from django.contrib import admin
from django.utils.text import Truncator

from user_accounts.permissions import is_webmaster
from .models import PageContent


@admin.register(PageContent)
class PageContentAdmin(admin.ModelAdmin):
    list_display = ("identifier", "locale", "text_preview", "updated_at")
    list_filter = ("locale",)
    search_fields = ("identifier", "value")
    ordering = ("identifier", "locale")
    readonly_fields = ("identifier", "locale", "value", "created_at", "updated_at")

    @admin.display(description="Content")
    def text_preview(self, obj):
        return Truncator(obj.value).chars(120)

    def has_view_permission(self, request, obj=None):
        return is_webmaster(request.user)

    # Keep writes in the CMS editor, which validates fields, locales and uploads.
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
