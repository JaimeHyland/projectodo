import copy
import json

from django.test import Client, TestCase

from .models import Band, BandGig, BandTicketPrice
from .tests_extras import BandFixtureMixin


class MultilingualBandTests(BandFixtureMixin, TestCase):
    def setUp(self):
        super().setUp()
        self.gigs_url = f"/api/bands/admin/bands/{self.band.id}/gigs/"

    def payload(self):
        return {
            "date": "2030-01-10", "start_time": "20:00", "city": "Berlin",
            "venue_translations": {"en": "Hall", "de": "Saal", "es": "Sala"},
            "ticket_prices": [{"description_translations": {
                "en": "Advance", "de": "Vorverkauf", "es": "Anticipada",
            }, "price": "12.30"}],
        }

    def send(self, method, url, data):
        return getattr(self.client, method)(url, json.dumps(data), content_type="application/json")

    def create_gig(self):
        response = self.send("post", self.gigs_url, self.payload())
        self.assertEqual(response.status_code, 201, response.content)
        return response.json()

    def test_descriptions_preserve_legacy_text_and_merge_locales(self):
        self.page.description_html = "Original page"
        self.page.save()
        self.band.description = "Original band"
        self.band.save()
        data = {"description_translations": {"de": "Seite", "en": ""},
                "band_description_translations": {"de": "Bandbeschreibung"}}
        self.assertEqual(self.send("patch", self.url, data).status_code, 200)
        self.assertEqual(self.send("patch", self.url, {
            "description_translations": {"es": "Pagina"}
        }).status_code, 200)
        self.page.refresh_from_db()
        self.band.refresh_from_db()
        self.assertEqual(self.page.description_html, "Original page")
        self.assertEqual(self.page.description_translations,
                         {"en": "", "de": "Seite", "es": "Pagina"})
        self.assertEqual(self.band.description, "Original band")
        data = Client().get("/api/bands/pages/band/").json()
        self.assertEqual(data["description_translations"]["en"], "")
        self.assertEqual(data["band"]["description_translations"]["de"], "Bandbeschreibung")
        listing = Client().get("/api/bands/pages/").json()["pages"][0]
        self.assertEqual(listing["band"]["description_translations"]["de"], "Bandbeschreibung")
        for value in (None, {"fr": "Non"}, {"de": 42}, {"en": "x" * 20001}):
            self.assertEqual(self.send("patch", self.url, {
                "description_translations": value
            }).status_code, 400)

    def test_band_table_updates_only_selected_translation(self):
        self.band.description = "Legacy"
        self.band.description_translations = {"en": "English"}
        self.band.save()
        response = self.send("post", f"/api/bands/admin/bands/{self.band.id}/", {
            "action": "edit", "name": self.band.name, "description": "Legacy",
            "description_translations": {"de": "Deutsch"},
        })
        self.assertEqual(response.status_code, 200)
        self.band.refresh_from_db()
        self.assertEqual(self.band.description_translations, {"en": "English", "de": "Deutsch"})
        self.assertEqual(self.band.description, "Legacy")

    def test_gig_crud_multilingual_prices_and_public_serialization(self):
        gig = self.create_gig()
        self.assertEqual(gig["venue_translations"]["de"], "Saal")
        entry = gig["ticket_prices"][0]
        self.assertEqual(entry["price"], "12.30")
        url = f"{self.gigs_url}{gig['id']}/"
        response = self.send("patch", url, {
            "venue_translations": {"de": "Neuer Saal"},
            "ticket_prices": [{"id": entry["id"], "description_translations": {
                "de": "Ermaessigt"
            }, "price": "10.50"}, {"description_translations": {"en": "Free"}, "price": "0.00"}],
        })
        self.assertEqual(response.status_code, 200, response.content)
        updated = response.json()
        self.assertEqual(updated["ticket_prices"][0]["id"], entry["id"])
        self.assertEqual(updated["ticket_prices"][0]["description_translations"]["en"], "Advance")
        self.assertEqual(updated["venue_translations"]["en"], "Hall")
        public = Client().get("/api/bands/pages/band/").json()["upcoming_gigs"][0]
        self.assertEqual(public["venue_translations"]["de"], "Neuer Saal")
        self.assertEqual(public["ticket_prices"][0]["description_translations"]["de"], "Ermaessigt")
        # Explicitly removing one entry leaves the other entry and its identity intact.
        self.assertEqual(self.send("patch", url, {
            "ticket_prices": [updated["ticket_prices"][0]]
        }).status_code, 200)
        removed_id = updated["ticket_prices"][1]["id"]
        self.assertFalse(BandTicketPrice.objects.filter(pk=removed_id).exists())
        self.assertEqual(len(self.client.get(self.gigs_url).json()["gigs"]), 1)
        self.assertEqual(self.client.delete(url).status_code, 200)
        self.assertFalse(BandGig.objects.exists())
        self.assertFalse(BandTicketPrice.objects.exists())

    def test_invalid_payloads_are_atomic(self):
        invalid = [dict(self.payload(), date="not a date"),
                   dict(self.payload(), start_time="02:30+02:00"),
                   dict(self.payload(), ticket_prices=[]),
                   dict(self.payload(), venue_translations={"fr": "X"})]
        for amount in ("-1.00", "1.001", "NaN", 12.30):
            payload = copy.deepcopy(self.payload())
            payload["ticket_prices"][0]["price"] = amount
            invalid.append(payload)
        for payload in invalid:
            self.assertEqual(self.send("post", self.gigs_url, payload).status_code, 400)
            self.assertFalse(BandGig.objects.exists())
        gig = self.create_gig()
        response = self.send("patch", f"{self.gigs_url}{gig['id']}/", {
            "city": "Changed", "ticket_prices": [],
        })
        self.assertEqual(response.status_code, 400)
        self.assertEqual(BandGig.objects.get(pk=gig["id"]).city, "Berlin")

    def test_price_and_gig_ids_cannot_cross_band_boundaries(self):
        first = self.create_gig()
        second = self.create_gig()
        response = self.send("patch", f"{self.gigs_url}{first['id']}/", {
            "city": "Changed", "ticket_prices": second["ticket_prices"],
        })
        self.assertEqual(response.status_code, 400)
        self.assertEqual(BandGig.objects.get(pk=first["id"]).city, "Berlin")
        other = Band.objects.create(name="Another", band_leader=self.owner, created_by=self.admin)
        self.assertEqual(self.client.delete(
            f"/api/bands/admin/bands/{other.id}/gigs/{first['id']}/"
        ).status_code, 404)

    def test_admin_gig_read_write_permissions_and_csrf(self):
        for user in (self.admin, self.owner, self.webmaster):
            self.client.force_login(user)
            self.assertEqual(self.client.get(self.gigs_url).status_code, 200)
            self.create_gig()
        gig = BandGig.objects.first()
        for user in (None, self.other):
            self.client.logout()
            if user:
                self.client.force_login(user)
            self.assertEqual(self.client.get(self.gigs_url).status_code, 403)
            self.assertEqual(self.send("post", self.gigs_url, self.payload()).status_code, 403)
            self.assertEqual(self.send("patch", f"{self.gigs_url}{gig.id}/", {}).status_code, 403)
            self.assertEqual(self.client.delete(f"{self.gigs_url}{gig.id}/").status_code, 403)
        client = Client(enforce_csrf_checks=True)
        client.force_login(self.admin)
        self.assertEqual(client.post(self.gigs_url, json.dumps(self.payload()),
                                     content_type="application/json").status_code, 403)
        self.assertEqual(client.delete(f"{self.gigs_url}{gig.id}/").status_code, 403)
        client.cookies["csrftoken"] = "a" * 32
        response = client.post(self.gigs_url, json.dumps(self.payload()),
                               content_type="application/json", HTTP_X_CSRFTOKEN="a" * 32)
        self.assertEqual(response.status_code, 201)
