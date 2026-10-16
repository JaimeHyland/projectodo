import io
import json
import tempfile
from datetime import date, datetime, time, timezone
from decimal import Decimal
from unittest.mock import patch

from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.exceptions import ValidationError
from django.core.files.storage import FileSystemStorage
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import IntegrityError, transaction
from django.test import Client, RequestFactory, TestCase
from PIL import Image

from .admin import TicketPriceInline
from .forms import BandPageForm
from .models import Band, BandPage, BandGig, BandTicketPrice
from .validation import gig_start, readable_foreground


class BandFixtureMixin:
    @classmethod
    def setUpTestData(cls):
        users = get_user_model()
        cls.admin = users.objects.create_user("admin", is_superuser=True, is_staff=True)
        cls.owner = users.objects.create_user("owner")
        cls.other = users.objects.create_user("other")
        cls.webmaster = users.objects.create_user("webmaster")
        cls.webmaster.groups.add(Group.objects.create(name="webmaster"))
        cls.band = Band.objects.create(name="Band", band_leader=cls.owner, created_by=cls.admin)
        cls.page = BandPage.objects.create(band=cls.band, slug="band", published=True)

    def setUp(self):
        self.client.force_login(self.admin)
        self.url = f"/api/bands/admin/bands/{self.band.id}/page/"


class BandPageExtrasTests(BandFixtureMixin, TestCase):
    def update(self, **data):
        return self.client.patch(self.url, json.dumps(data), content_type="application/json")

    def test_existing_page_without_optional_content(self):
        response = Client().get("/api/bands/pages/band/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["background_colour"], "#ffffff")
        self.assertIsNone(data["main_image"])
        self.assertEqual(data["image_caption"], {})
        self.assertEqual(data["upcoming_gigs"], [])
        self.assertEqual(data["audio_url"], "")
        self.assertEqual(data["video_url"], "")
        self.assertEqual(response["Cache-Control"], "no-store")

    def test_colour_validation_and_readable_foreground(self):
        for colour in ("red", "#fff", "#ffffff;background:red", "<script>"):
            self.assertEqual(self.update(background_colour=colour).status_code, 400)
        self.assertEqual(self.update(background_colour="#000000").status_code, 200)
        self.assertEqual(Client().get("/api/bands/pages/band/").json()["foreground_colour"],
                         "#ffffff")
        self.assertEqual(readable_foreground("#ffffff"), "#000000")
        self.assertEqual(readable_foreground("bad"), "#000000")
        self.page.refresh_from_db()
        self.assertEqual(self.page.background_colour, "#000000")

    def test_captions_and_alt_text_remain_independent_by_locale(self):
        captions = {"en": "English caption", "de": "Deutsch", "es": ""}
        alternatives = {"en": "Band performing", "de": "Band beim Auftritt", "es": "Grupo"}
        response = self.update(image_caption=captions, image_alt=alternatives)
        self.assertEqual(response.status_code, 200)
        data = Client().get("/api/bands/pages/band/").json()
        self.assertEqual(data["image_caption"], captions)
        self.assertEqual(data["image_alt"], alternatives)
        for invalid in (None, "text", {"fr": "Non"}, {"en": 42}, {"en": "x" * 501}):
            self.assertEqual(self.update(image_caption=invalid).status_code, 400)

    def test_media_validation(self):
        for field, good in (("audio_url", "https://media.example.com/clip.mp3"),
                            ("video_url", "https://media.example.com/clip.mp4")):
            self.assertEqual(self.update(**{field: good}).status_code, 200)
            for bad in ("http://media.example.com/clip.mp4", "javascript:alert(1)",
                        "https://example.com/page", "https://user:pass@example.com/clip.mp3"):
                self.assertEqual(self.update(**{field: bad}).status_code, 400)
        response = self.update(video_captions_url="https://media.example.com/track.vtt")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.update(video_url="").status_code, 400)
        response = self.update(audio_url="", video_url="", video_captions_url="")
        self.assertEqual(response.status_code, 200)

    def test_permissions_preserve_existing_band_page_policy(self):
        for user in (self.admin, self.owner, self.webmaster):
            self.client.force_login(user)
            self.assertEqual(self.client.get(self.url).status_code, 200)
            self.assertEqual(self.update(image_caption={"en": user.username}).status_code, 200)
        for user in (None, self.other):
            self.client.logout()
            if user:
                self.client.force_login(user)
            self.assertEqual(self.client.get(self.url).status_code, 403)
            self.assertEqual(self.update(background_colour="#123456").status_code, 403)
            self.assertEqual(self.client.post(self.url + "image/").status_code, 403)
        response = Client().patch("/api/bands/pages/band/", "{}", content_type="application/json")
        self.assertEqual(response.status_code, 405)

    def test_photo_requires_csrf_and_rejects_arbitrary_references(self):
        client = Client(enforce_csrf_checks=True)
        client.force_login(self.admin)
        self.assertEqual(client.post(self.url + "image/").status_code, 403)
        self.assertEqual(self.update(main_image="/etc/passwd").status_code, 400)
        self.assertEqual(self.update(main_image="cms-images/other.jpg").status_code, 400)

    @staticmethod
    def photograph():
        output = io.BytesIO()
        Image.new("RGB", (20, 10), "white").save(output, format="PNG")
        return SimpleUploadedFile("../../photo.svg", output.getvalue(), content_type="text/plain")

    def test_photo_upload_uses_shared_validation_and_keeps_previous_files(self):
        field = BandPage._meta.get_field("main_image")
        with tempfile.TemporaryDirectory() as directory, patch.object(
            field, "storage", FileSystemStorage(location=directory, base_url="/cms-media/")
        ):
            for user in (self.admin, self.owner, self.webmaster):
                self.client.force_login(user)
                response = self.client.post(self.url + "image/", {"image": self.photograph()})
                self.assertEqual(response.status_code, 200)
                self.assertRegex(response.json()["main_image"],
                                 r"^/cms-media/bands/main/[a-f0-9]{32}\.jpg$")
            self.page.refresh_from_db()
            old_name = self.page.main_image.name
            bad = SimpleUploadedFile("fake.jpg", b"<svg></svg>", content_type="image/jpeg")
            self.assertEqual(self.client.post(self.url + "image/", {"image": bad}).status_code, 400)
            self.page.refresh_from_db()
            self.assertEqual(self.page.main_image.name, old_name)
            with self.page.main_image.open() as file:
                self.assertEqual(Image.open(file).format, "JPEG")
            data = Client().get("/api/bands/pages/band/").json()
            self.assertTrue(data["main_image"].endswith(old_name))

    def test_photo_storage_failure_does_not_change_reference(self):
        self.page.main_image = "bands/main/old.jpg"
        self.page.save()
        with patch.object(BandPage._meta.get_field("main_image").storage, "save",
                          side_effect=OSError("Unavailable")), self.assertLogs("bands.views"):
            response = self.client.post(self.url + "image/", {"image": self.photograph()})
        self.assertEqual(response.status_code, 503)
        self.page.refresh_from_db()
        self.assertEqual(self.page.main_image.name, "bands/main/old.jpg")

    def test_admin_page_form_exposes_each_language(self):
        self.page.description_html = "Existing page text"
        self.page.description_translations = {"de": "German page text"}
        self.page.save()
        form = BandPageForm(instance=self.page)
        response = self.client.get(f"/admin/bands/bandpage/{self.page.id}/change/")
        for locale in ("en", "de", "es"):
            self.assertIn("image_caption_" + locale, form.fields)
            self.assertIn("image_alt_" + locale, form.fields)
            self.assertIn("description_translations_" + locale, form.fields)
            self.assertContains(response, f'name="image_caption_{locale}"')
        form = BandPageForm(instance=self.page, data={
            "band": self.band.id, "slug": "band", "background_colour": "#ffffff",
            "foreground_colour": "#000000", "image_caption_de": "German caption",
            "image_alt_en": "A band performing", "published": "on",
        })
        self.assertTrue(form.is_valid(), form.errors)
        form.save()
        self.page.refresh_from_db()
        self.assertEqual(self.page.image_caption["de"], "German caption")
        self.assertEqual(self.page.description_translations, {"de": "German page text"})


class BandGigTests(BandFixtureMixin, TestCase):
    def make_gig(self, day, start, venue="Venue", price=True, band=None):
        gig = BandGig.objects.create(
            band=band or self.band, date=day, start_time=start, venue=venue, city="Berlin"
        )
        if price:
            BandTicketPrice.objects.create(gig=gig, description="Advance", price=Decimal("12.30"))
        return gig

    def test_future_filter_is_aware_ordered_and_excludes_started_today(self):
        day = date(2026, 10, 15)
        now = datetime(2026, 10, 15, 18, 30, tzinfo=timezone.utc)  # 20:30 in Berlin.
        for start in (time(18), time(20), time(20, 30), None):
            self.make_gig(day, start)
        self.make_gig(date(2026, 10, 14), time(23))
        tomorrow = self.make_gig(date(2026, 10, 16), time(8), "Tomorrow")
        tonight = self.make_gig(day, time(21), "Tonight")
        self.make_gig(day, time(22), price=False)
        other_band = Band.objects.create(
            name="Other", band_leader=self.owner, created_by=self.admin
        )
        self.make_gig(day, time(22), band=other_band)
        with patch("bands.views.timezone.now", return_value=now):
            gigs = Client().get("/api/bands/pages/band/").json()["upcoming_gigs"]
        self.assertEqual([gig["id"] for gig in gigs], [tonight.id, tomorrow.id])
        self.assertEqual(gigs[0]["starts_at"], "2026-10-15T21:00:00+02:00")
        self.assertEqual(gigs[0]["ticket_prices"][0]["price"], "12.30")

    def test_gig_and_price_validation_and_database_constraint(self):
        gig = self.make_gig(date(2030, 1, 1), time(19))
        price = gig.ticket_prices.get()
        for invalid in (Decimal("-0.01"), Decimal("1.001"), Decimal("1000000.00")):
            price.price = invalid
            with self.assertRaises(ValidationError):
                price.full_clean()
        price.price = Decimal("0.00")
        price.full_clean()
        with self.assertRaises(IntegrityError), transaction.atomic():
            BandTicketPrice.objects.create(gig=gig, description="Invalid", price=Decimal("-1"))
        gig.start_time = None
        with self.assertRaises(ValidationError):
            gig.full_clean()
        self.assertEqual(price.gig.band_id, self.band.id)

    def test_dst_gap_and_ambiguous_times_are_not_guessed(self):
        for day in (date(2026, 3, 29), date(2026, 10, 25)):
            with self.assertRaises(ValidationError):
                gig_start(day, time(2, 30))
        self.assertEqual(gig_start(date(2026, 10, 25), time(20)).utcoffset().total_seconds(), 3600)

    def test_admin_requires_at_least_one_ticket_price_and_permissions(self):
        gig = self.make_gig(date(2030, 1, 1), time(19), price=False)
        request = RequestFactory().get("/")
        request.user = self.admin
        formset_type = TicketPriceInline(BandGig, admin.site).get_formset(request, gig)
        formset = formset_type(instance=gig, prefix="prices", data={
            "prices-TOTAL_FORMS": "0", "prices-INITIAL_FORMS": "0",
            "prices-MIN_NUM_FORMS": "1", "prices-MAX_NUM_FORMS": "1000",
        })
        self.assertFalse(formset.is_valid())
        self.assertTrue(formset.non_form_errors())
        self.assertEqual(self.client.get(f"/admin/bands/bandgig/{gig.id}/change/").status_code, 200)
        self.client.force_login(self.other)
        self.assertEqual(self.client.get(f"/admin/bands/bandgig/{gig.id}/change/").status_code, 302)
        self.other.is_staff = True
        self.other.save(update_fields=["is_staff"])
        self.client.force_login(self.other)
        response = self.client.post(f"/admin/bands/bandgig/{gig.id}/change/", {"venue": "Denied"})
        self.assertEqual(response.status_code, 403)
        gig.refresh_from_db()
        self.assertEqual(gig.venue, "Venue")
