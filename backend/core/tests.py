import io
import json
import tempfile
from pathlib import Path
from unittest.mock import patch

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import Client, TestCase, override_settings
from PIL import Image

from .cms import FIELDS, LOCALES, source_value
from .models import PageContent

TEXT = "home.titleHome"
IMAGE = "home.home.intro.imageSrc"
ADMIN_URL = "/api/content/admin/"


class ContentUsersMixin:
    @classmethod
    def setUpTestData(cls):
        user_model = get_user_model()
        cls.admin = user_model.objects.create_user("superuser", is_superuser=True)
        cls.webmaster = user_model.objects.create_user("webmaster")
        cls.webmaster.groups.add(Group.objects.create(name="webmaster"))
        cls.ordinary = user_model.objects.create_user("ordinary")
        cls.staff = user_model.objects.create_user("staff", is_staff=True)
        cls.teacher = user_model.objects.create_user("teacher")
        cls.teacher.groups.add(Group.objects.create(name="teacher"))

    def setUp(self):
        self.client.force_login(self.admin)


class PageContentTests(ContentUsersMixin, TestCase):
    def save_text(self, value, locale="en", identifier=TEXT, client=None):
        return (client or self.client).patch(
            f"{ADMIN_URL}{identifier}/{locale}/", json.dumps({"value": value}),
            content_type="application/json",
        )

    def test_catalogue_matches_source_and_locale_configuration(self):
        root = Path(__file__).resolve().parents[2]
        config = (root / "src/i18n/config.ts").read_text(encoding="utf-8")
        for locale in LOCALES:
            self.assertIn(f'"{locale}"', config)
        self.assertEqual(len(FIELDS), 99)
        for field in FIELDS.values():
            self.assertNotIn(field["page"], ("header", "footer", "news", "press", "guestbook"))
            if field["kind"] == "image":
                self.assertTrue((root / "public" / field["displayedImage"].lstrip("/")).is_file())
                continue
            for locale in LOCALES:
                source = (root / field["sources"][locale]).read_text(encoding="utf-8")
                self.assertEqual(source_value(json.loads(source), field["path"]),
                                 field["initial"][locale], field["id"])

    def test_import_is_repeatable_and_preserves_edits_and_blanks(self):
        PageContent.objects.create(identifier=TEXT, locale="de", value="Edited")
        PageContent.objects.create(identifier=TEXT, locale="es", value="")
        call_command("init_page_content", stdout=io.StringIO())
        call_command("init_page_content", stdout=io.StringIO())
        self.assertEqual(PageContent.objects.count(), len(FIELDS) * len(LOCALES))
        self.assertEqual(PageContent.objects.get(identifier=TEXT, locale="de").value, "Edited")
        self.assertEqual(PageContent.objects.get(identifier=TEXT, locale="es").value, "")
        for locale in LOCALES:
            for identifier, field in FIELDS.items():
                if identifier == TEXT and locale in ("de", "es"):
                    continue
                stored = PageContent.objects.get(identifier=identifier, locale=locale).value
                self.assertEqual(stored, field["initial"][locale], f"{identifier}/{locale}")
        # German home cards have a different array order; IDs must win over positions.
        stored = PageContent.objects.get(identifier="home.home.sections.bands.title", locale="de")
        self.assertEqual(stored.value, "Bands")

    def test_failed_import_rolls_back_all_insertions(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(__file__).resolve().parents[2]
            # Import some English home fields, then encounter a missing German file.
            source = (root / "src/messages/en.json").read_bytes()
            Path(directory, "en.json").write_bytes(source)
            with self.assertRaises(CommandError):
                call_command(
                    "init_page_content", messages_dir=Path(directory), stdout=io.StringIO()
                )
        self.assertFalse(PageContent.objects.exists())

    def test_public_reads_all_locales_and_keeps_intentionally_blank_values(self):
        for locale in LOCALES:
            self.assertEqual(self.save_text(locale, locale).status_code, 200)
        public = Client()
        for locale in LOCALES:
            response = public.get(f"/api/content/public/home/{locale}/")
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()["values"][TEXT], locale)
            self.assertNotIn(IMAGE, response.json()["values"])
        self.save_text("", "de")
        self.assertEqual(public.get("/api/content/public/home/de/").json()["values"][TEXT], "")
        self.assertEqual(PageContent.objects.get(identifier=TEXT, locale="en").value, "en")

    def test_admin_list_distinguishes_missing_and_blank(self):
        self.save_text("", "de")
        response = self.client.get(ADMIN_URL)
        item = next(row for row in response.json()["items"] if row["id"] == TEXT)
        self.assertEqual(item["values"], {"de": ""})
        self.assertEqual(response["Cache-Control"], "no-store")

    def test_superuser_and_webmaster_can_read_and_save(self):
        for user in (self.admin, self.webmaster):
            self.client.force_login(user)
            self.assertEqual(self.client.get(ADMIN_URL).status_code, 200)
            self.assertEqual(self.save_text(user.username).status_code, 200)

    def test_anonymous_ordinary_staff_and_teacher_cannot_read_or_write(self):
        for user in (None, self.ordinary, self.staff, self.teacher):
            self.client.logout()
            if user:
                self.client.force_login(user)
            self.assertEqual(self.client.get(ADMIN_URL).status_code, 403)
            self.assertEqual(self.save_text("Denied").status_code, 403)
            self.assertEqual(self.client.post(f"{ADMIN_URL}{IMAGE}/en/image/").status_code, 403)
        self.assertFalse(PageContent.objects.exists())

    def test_csrf_is_required_for_text_and_uploads(self):
        client = Client(enforce_csrf_checks=True)
        client.force_login(self.admin)
        self.assertEqual(self.save_text("Denied", client=client).status_code, 403)
        self.assertEqual(client.post(f"{ADMIN_URL}{IMAGE}/en/image/").status_code, 403)
        client.get(ADMIN_URL)
        token = client.cookies["csrftoken"].value
        response = client.patch(
            f"{ADMIN_URL}{TEXT}/en/", json.dumps({"value": "Allowed"}),
            content_type="application/json", HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(response.status_code, 200)
        # CSRF succeeds; missing upload is then rejected by image validation.
        response = client.post(f"{ADMIN_URL}{IMAGE}/en/image/", HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 400)

    def test_rejects_unknown_fields_locales_and_invalid_values(self):
        for identifier, locale in (("header.title", "en"), (TEXT, "fr")):
            self.assertEqual(self.save_text("x", locale, identifier).status_code, 404)
        for value in (None, 42, {}, "x" * 20001):
            self.assertEqual(self.save_text(value).status_code, 400)
        response = self.client.patch(
            f"{ADMIN_URL}{TEXT}/en/", "{", content_type="application/json"
        )
        self.assertEqual(response.status_code, 400)
        for value in ("/etc/passwd", "cms-images/arbitrary.jpg", "https://example.com/image.jpg"):
            self.assertEqual(self.save_text(value, identifier=IMAGE).status_code, 400)
        for page, locale in (("header", "en"), ("news", "en"), ("home", "fr")):
            response = self.client.get(f"/api/content/public/{page}/{locale}/")
            self.assertEqual(response.status_code, 404)
        self.assertFalse(PageContent.objects.exists())


class PageImageTests(ContentUsersMixin, TestCase):
    @staticmethod
    def image_file(format="PNG", size=(16, 12)):
        output = io.BytesIO()
        Image.new("RGB", size, "white").save(output, format=format)
        return SimpleUploadedFile(
            "../../untrusted.svg", output.getvalue(), content_type="text/plain"
        )

    def upload(self, file, locale="en", identifier=IMAGE):
        return self.client.post(f"{ADMIN_URL}{identifier}/{locale}/image/", {"image": file})

    def test_upload_reencodes_formats_and_changes_only_one_locale(self):
        with tempfile.TemporaryDirectory() as directory, override_settings(STORAGES={
            **settings.STORAGES,
            "cms": {"BACKEND": "django.core.files.storage.FileSystemStorage",
                    "OPTIONS": {"location": directory, "base_url": "/cms-media/"}},
        }):
            PageContent.objects.create(identifier=IMAGE, locale="de", value="/guitarist.jpg")
            for user in (self.admin, self.webmaster):
                self.client.force_login(user)
                for format in ("JPEG", "PNG", "WEBP"):
                    response = self.upload(self.image_file(format))
                    self.assertEqual(response.status_code, 200)
                    value = response.json()["value"]
                    self.assertRegex(value, r"^/cms-media/[a-f0-9]{32}\.jpg$")
                    with Image.open(Path(directory, value.rsplit("/", 1)[1])) as image:
                        self.assertEqual(image.format, "JPEG")
            self.assertEqual(len(list(Path(directory).iterdir())), 6)  # Replaced files retained.
            stored = PageContent.objects.get(identifier=IMAGE, locale="de")
            self.assertEqual(stored.value, "/guitarist.jpg")
            public = self.client.get("/api/content/public/home/en/").json()["values"]
            self.assertEqual(public[IMAGE], value)

    def test_invalid_uploads_leave_current_image_unchanged(self):
        PageContent.objects.create(identifier=IMAGE, locale="en", value="/guitarist.jpg")
        invalid = [SimpleUploadedFile("fake.jpg", b"<svg></svg>", content_type="image/jpeg"),
                   SimpleUploadedFile("large.png", b"x" * (5 * 1024 * 1024 + 1))]
        output = io.BytesIO()
        Image.new("1", (5000, 4001)).save(output, format="PNG")
        invalid.append(SimpleUploadedFile("dimensions.png", output.getvalue()))
        for file in invalid:
            self.assertEqual(self.upload(file).status_code, 400)
        self.assertEqual(self.upload(self.image_file(), identifier=TEXT).status_code, 404)
        self.assertEqual(self.upload(self.image_file(), locale="fr").status_code, 404)
        self.assertEqual(
            PageContent.objects.get(identifier=IMAGE, locale="en").value, "/guitarist.jpg"
        )

    def test_storage_failure_preserves_current_reference(self):
        PageContent.objects.create(identifier=IMAGE, locale="en", value="/guitarist.jpg")
        with patch("core.views.storages") as storage, self.assertLogs("core.views", level="ERROR"):
            storage.__getitem__.return_value.save.side_effect = OSError("Unavailable")
            self.assertEqual(self.upload(self.image_file()).status_code, 503)
            storage.__getitem__.return_value.delete.assert_not_called()
        self.assertEqual(
            PageContent.objects.get(identifier=IMAGE, locale="en").value, "/guitarist.jpg"
        )

    def test_database_failure_cleans_only_new_upload(self):
        PageContent.objects.create(identifier=IMAGE, locale="en", value="/guitarist.jpg")
        with (
            patch("core.views.storages") as storage,
            patch.object(PageContent.objects, "update_or_create",
                         side_effect=RuntimeError("DB failure")),
            self.assertLogs("core.views", level="ERROR"),
        ):
            backend = storage.__getitem__.return_value
            backend.save.return_value = "new.jpg"
            backend.url.return_value = "/cms-media/new.jpg"
            self.assertEqual(self.upload(self.image_file()).status_code, 503)
            backend.delete.assert_called_once_with("new.jpg")
        self.assertEqual(
            PageContent.objects.get(identifier=IMAGE, locale="en").value, "/guitarist.jpg"
        )
