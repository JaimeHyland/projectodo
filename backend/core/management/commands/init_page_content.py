import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from core.cms import FIELDS, LOCALES
from core.models import PageContent


class Command(BaseCommand):
    help = (
        "Import approved page fields; never overwrite an existing "
        "translation, even if blank."
    )

    @transaction.atomic
    def handle(self, *args, **options):
        seed_file = Path(__file__).resolve().parents[2] / "cms_seed.json"

        try:
            seed = json.loads(seed_file.read_text(encoding="utf-8"))
        except (OSError, ValueError) as error:
            raise CommandError(
                f"Cannot read CMS seed file {seed_file}: {error}"
            ) from error

        created = 0

        for identifier, field in FIELDS.items():
            for locale in LOCALES:
                try:
                    value = seed[identifier][locale]
                except (KeyError, TypeError) as error:
                    raise CommandError(
                        f"Missing seed value for {identifier}/{locale}"
                    ) from error

                if not isinstance(value, str):
                    raise CommandError(
                        f"Expected text at {identifier}/{locale}"
                    )

                _, added = PageContent.objects.get_or_create(
                    identifier=identifier,
                    locale=locale,
                    defaults={"value": value},
                )
                created += added

        self.stdout.write(self.style.SUCCESS(
            f"Created {created} translations; existing content preserved."
        ))
