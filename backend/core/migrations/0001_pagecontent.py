from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True
    dependencies = []
    operations = [migrations.CreateModel(
        name="PageContent",
        fields=[
            ("id", models.BigAutoField(
                auto_created=True, primary_key=True, serialize=False, verbose_name="ID"
            )),
            ("created_at", models.DateTimeField(auto_now_add=True)),
            ("updated_at", models.DateTimeField(auto_now=True)),
            ("identifier", models.CharField(max_length=200)),
            ("locale", models.CharField(max_length=10)),
            ("value", models.TextField(blank=True)),
        ],
        options={"constraints": [models.UniqueConstraint(
            fields=("identifier", "locale"), name="unique_page_content_locale"
        )]},
    )]
