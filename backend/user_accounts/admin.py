from django.contrib import admin
from .models import AuthToken


@admin.register(AuthToken)
class AuthTokenAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'token_type', 'expires_at')
    list_filter = ('token_type',)
    search_fields = ('username', 'email')
