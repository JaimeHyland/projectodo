from django.db import models

# Create your models here.


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class PageContent(TimeStampedModel):
    identifier = models.CharField(max_length=200)
    locale = models.CharField(max_length=10)
    value = models.TextField(blank=True)

    class Meta:
        constraints = [models.UniqueConstraint(
            fields=["identifier", "locale"], name="unique_page_content_locale"
        )]
