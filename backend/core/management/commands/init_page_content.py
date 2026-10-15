import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from core.cms import FIELDS, LOCALES, source_value
from core.models import PageContent


class Command(BaseCommand):
    help = "Import approved page fields; never overwrite an existing translation, even if blank."

    def add_arguments(self, parser):
        parser.add_argument(
            "--messages-dir", type=Path,
            help="Path to src/messages (defaults to this checkout)",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        root = Path(__file__).resolve().parents[4]
        messages_dir = options["messages_dir"] or root / "src" / "messages"
        documents = {}
        created = 0
        for identifier, field in FIELDS.items():
            for locale in LOCALES:
                if field["kind"] == "image":
                    value = field["displayedImage"]
                else:
                    key = (field["page"], locale)
                    directory = "" if field["page"] == "home" else field["page"]
                    file = messages_dir / directory / f"{locale}.json"
                    try:
                        if key not in documents:
                            documents[key] = json.loads(file.read_text(encoding="utf-8"))
                        value = source_value(documents[key], field["path"])
                    except (OSError, ValueError, KeyError, IndexError,
                            TypeError, StopIteration) as error:
                        raise CommandError(
                            f"Cannot import {identifier}/{locale} from {file}: {error}"
                        ) from error
                if not isinstance(value, str):
                    raise CommandError(f"Expected text at {identifier}/{locale}")
                _, added = PageContent.objects.get_or_create(
                    identifier=identifier, locale=locale, defaults={"value": value}
                )
                created += added
        self.stdout.write(self.style.SUCCESS(
            f"Created {created} translations; existing content preserved."
        ))
