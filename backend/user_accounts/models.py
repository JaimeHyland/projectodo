# users/models.py

import uuid
import hashlib
from django.db import models
from django.utils import timezone
from django.contrib.auth.models import User


class AuthToken(models.Model):
    TOKEN_TYPE_CHOICES = (
        ('signup', 'Signup'),
        ('password_reset', 'Password Reset'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    token_hash = models.CharField(max_length=64, unique=True)

    # For signup: store username/email before the user exists
    username = models.CharField(max_length=150, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)

    # For password reset: link directly to user
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        blank=True,
        null=True)

    token_type = models.CharField(max_length=20, choices=TOKEN_TYPE_CHOICES)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    def is_expired(self):
        return timezone.now() > self.expires_at

    @staticmethod
    def hash_token(raw_token: str):
        """Generate SHA-256 hash of a token for storage"""
        return hashlib.sha256(raw_token.encode()).hexdigest()

    def __str__(self):
        return f"{self.token_type} token for {
            self.username or (self.user.username if self.user else 'Unknown')
        }"
