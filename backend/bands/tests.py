import json

from django.contrib.auth import get_user_model
from django.test import TestCase

from .models import Band


class BandPagePublicationTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_superuser(
            username="webmaster",
            email="webmaster@example.com",
            password="test-password",
        )
        self.client.force_login(self.user)
        self.band = Band.objects.create(
            name="Test band",
            band_leader=self.user,
            created_by=self.user,
        )

    def test_unchecked_page_is_not_public(self):
        response = self.client.post(
            f"/api/bands/admin/bands/{self.band.id}/page/create/",
            data=json.dumps({"published": False}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        page = self.band.page
        self.assertFalse(page.published)
        self.assertEqual(self.client.get("/api/bands/pages/").json()["pages"], [])
        self.assertEqual(
            self.client.get(f"/api/bands/pages/{page.slug}/").status_code,
            404,
        )

    def test_checking_page_publishes_listing_and_detail(self):
        self.client.post(
            f"/api/bands/admin/bands/{self.band.id}/page/create/",
            data=json.dumps({"published": False}),
            content_type="application/json",
        )
        page = self.band.page

        response = self.client.patch(
            f"/api/bands/admin/bands/{self.band.id}/page/",
            data=json.dumps({"published": True}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        page.refresh_from_db()
        self.assertTrue(page.published)
        self.assertEqual(len(self.client.get("/api/bands/pages/").json()["pages"]), 1)
        self.assertEqual(
            self.client.get(f"/api/bands/pages/{page.slug}/").status_code,
            200,
        )

    def test_unchecking_page_removes_listing_and_detail(self):
        self.client.post(
            f"/api/bands/admin/bands/{self.band.id}/page/create/",
            data=json.dumps({"published": True}),
            content_type="application/json",
        )
        page = self.band.page

        response = self.client.patch(
            f"/api/bands/admin/bands/{self.band.id}/page/",
            data=json.dumps({"published": False}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        page.refresh_from_db()
        self.assertFalse(page.published)
        self.assertEqual(self.client.get("/api/bands/pages/").json()["pages"], [])
        self.assertEqual(
            self.client.get(f"/api/bands/pages/{page.slug}/").status_code,
            404,
        )

# Create your tests here.
