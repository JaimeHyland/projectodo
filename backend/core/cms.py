"""The fixed, approved main-page catalogue and its source JSON paths."""
import json
from pathlib import Path

CATALOGUE = json.loads(Path(__file__).with_name("cms_catalogue.json").read_text(encoding="utf-8"))
LOCALES = CATALOGUE["locales"]
FIELDS = {field["id"]: field for field in CATALOGUE["fields"]}
PAGES = {field["page"] for field in FIELDS.values()}


def source_value(document, path):
    for part in path:
        if isinstance(part, dict):
            document = next(item for item in document if item.get("id") == part["id"])
        else:
            document = document[part]
    return document
