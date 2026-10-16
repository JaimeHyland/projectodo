import { test, expect } from "@playwright/test";
import en from "../src/messages/bands/en.json";
import de from "../src/messages/bands/de.json";
import es from "../src/messages/bands/es.json";
import editor from "../src/messages/band-pages/en.json";

const labels = { en, de, es };
test.beforeEach(async ({ page, request }) => {
  await request.post("http://127.0.0.1:8126/__scenario", { data: {} });
  await page.clock.install({ time: new Date("2030-01-10T18:00:00Z") });
  await page.route("https://media.example.test/**", route => route.abort());
});

for (const locale of ["en", "de", "es"] as const) {
  test(`${locale}: localized photograph, euro prices and Berlin gig times`, async ({ page }) => {
    await page.goto(`/${locale}/bands/test-band/`);
    await expect(page.getByRole("heading", { name: "Test band", exact: true })).toBeVisible();
    const caption = { en: "English caption", de: "Deutsche Bildunterschrift", es: "Pie de foto" }[locale];
    await expect(page.locator("figcaption")).toHaveText(caption);
    await expect(page.getByAltText(`Photograph ${locale}`)).toBeVisible();
    const gigs = page.getByRole("region", { name: labels[locale].details.upcomingGigs, exact: true });
    const venue = { en: "Tonight", de: "Heute", es: "Esta noche" }[locale];
    await expect(gigs.getByRole("heading", { name: `${venue}, Berlin`, exact: true })).toBeVisible();
    await expect(gigs.locator("dt").first()).toHaveText({ en: "Advance", de: "Vorverkauf", es: "Anticipada" }[locale]);
    await expect(page.getByText({ en: "English page", de: "Deutsche Seite", es: "Pagina espanola" }[locale], { exact: true })).toBeVisible();
    await expect(gigs.locator("dd").first()).toHaveText(new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(12.3));
    const expected = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" }).format(new Date("2030-01-10T19:00:00Z"));
    await expect(gigs.locator("time").first()).toContainText(expected);
    await expect(page.locator("article").locator("..")).toHaveCSS("background-color", "rgb(17, 34, 51)");
    await page.goto(`/${locale}/bands/`);
    await expect(page.getByText({ en: "English band", de: "Deutsche Band", es: "Grupo espanol" }[locale], { exact: true })).toBeVisible();
  });
}

test("gigs disappear as their start time passes without a reload", async ({ page }) => {
  await page.goto("/en/bands/test-band/");
  await page.clock.fastForward(3600001);
  await expect(page.getByRole("heading", { name: "Tonight, Berlin", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Tomorrow, Berlin", exact: true })).toBeVisible();
  await page.clock.fastForward(86400000);
  await expect(page.getByRole("heading", { name: en.details.upcomingGigs, exact: true })).toHaveCount(0);
});

test("native media controls do not autoplay and failed media is handled", async ({ page }) => {
  await page.goto("/en/bands/test-band/");
  for (const tag of ["audio", "video"]) {
    await expect(page.locator(tag)).toHaveJSProperty("controls", true);
    await expect(page.locator(tag)).toHaveJSProperty("autoplay", false);
    await expect(page.locator(tag)).toHaveAttribute("preload", "none");
  }
  await page.locator("audio").dispatchEvent("error");
  await expect(page.getByText(en.details.mediaUnavailable, { exact: true })).toBeVisible();
  await expect(page.locator("audio")).toHaveCount(0);
});

test("legacy pages work with all optional fields absent", async ({ page, request }) => {
  await request.post("http://127.0.0.1:8126/__scenario", { data: { legacy: true } });
  await page.goto("/en/bands/test-band/");
  await expect(page.getByText("Band description", { exact: true })).toBeVisible();
  await expect(page.locator("main figure, main audio, main video")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: en.details.upcomingGigs, exact: true })).toHaveCount(0);
});

test("builder saves multilingual captions, background and media and uploads a photograph", async ({ page, request }, testInfo) => {
  const m = editor.editor;
  await page.goto("/en/admin-dashboard/bands/1/webpage/");
  await expect(page.getByLabel(m.background, { exact: true })).toHaveValue("#112233");
  await page.getByLabel(m.caption, { exact: true }).fill("Updated English");
  await page.getByLabel(m.description, { exact: true }).fill("Updated English page");
  await page.getByLabel(m.bandDescription, { exact: true }).fill("Updated English band");
  await page.getByLabel(m.language, { exact: true }).selectOption("de");
  await page.getByLabel(m.caption, { exact: true }).fill("Updated German");
  await page.getByLabel(m.description, { exact: true }).fill("Updated German page");
  await page.getByLabel(m.bandDescription, { exact: true }).fill("Updated German band");
  await page.getByLabel(m.language, { exact: true }).selectOption("en");
  await expect(page.getByLabel(m.caption, { exact: true })).toHaveValue("Updated English");
  await page.getByLabel(m.audio, { exact: true }).fill("https://media.example.test/updated.mp3");
  await page.getByRole("button", { name: m.save, exact: true }).click();
  await expect(page.locator("main").getByRole("status").filter({ hasText: m.saved })).toBeVisible();
  const response = await request.get("http://127.0.0.1:8126/api/bands/admin/bands/1/page/");
  const saved = await response.json();
  expect(saved.image_caption).toMatchObject({ en: "Updated English", de: "Updated German", es: "Pie de foto" });
  expect(saved.audio_url).toContain("updated.mp3");
  expect(saved.description_translations).toMatchObject({ en: "Updated English page", de: "Updated German page", es: "Pagina espanola" });
  expect(saved.band.description_translations).toMatchObject({ en: "Updated English band", de: "Updated German band", es: "Grupo espanol" });
  const buffer = await (await request.get("http://127.0.0.1:8126/cms-media/photo.jpg")).body();
  await page.getByLabel(m.upload, { exact: true }).setInputFiles({ name: "photo.jpg", mimeType: "image/jpeg", buffer });
  await expect(page.getByAltText(m.currentPhoto)).toHaveAttribute("src", "/cms-media/bands/main/replacement.jpg");
  await expect(page.locator('a[href*="/admin/bands/bandgig/"]')).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath("band-editor-mobile.png"), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("blank page translations remain blank", async ({ page, request }) => {
  await request.post("http://127.0.0.1:8126/__scenario", { data: { blankDescription: true } });
  await page.goto("/en/bands/test-band/");
  await expect(page.getByText("Band description", { exact: true })).toHaveCount(0);
  await expect(page.getByText("English page", { exact: true })).toHaveCount(0);
});

test("customers manage gigs and multilingual ticket prices entirely in the dashboard", async ({ page, request }, testInfo) => {
  const m = editor.gigEditor;
  await page.goto("/en/admin-dashboard/bands/1/webpage/");
  const region = page.getByRole("region", { name: m.title, exact: true });
  await region.getByRole("button", { name: m.addGig, exact: true }).click();
  await region.getByLabel(m.city, { exact: true }).fill("Berlin");
  await region.getByLabel(m.date, { exact: true }).fill("2030-02-10");
  await region.getByLabel(m.time, { exact: true }).fill("19:30");
  for (const [language, venue, description] of [
    ["en", "New Hall", "Standard"], ["de", "Neuer Saal", "Normal"], ["es", "Sala nueva", "General"],
  ]) {
    await region.getByLabel(m.language, { exact: true }).selectOption(language);
    await region.getByLabel(m.venue, { exact: true }).fill(venue);
    await region.getByLabel(m.description, { exact: true }).fill(description);
  }
  await region.getByLabel(m.price, { exact: true }).fill("18.50");
  await region.getByRole("button", { name: m.addPrice, exact: true }).click();
  await region.getByLabel(m.description, { exact: true }).nth(1).fill("Gratis");
  await region.getByLabel(m.price, { exact: true }).nth(1).fill("0.00");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath("gig-editor-mobile.png"), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await region.getByRole("button", { name: m.save, exact: true }).click();
  await expect(region.getByRole("status")).toHaveText(m.saved);
  await region.getByLabel(m.language, { exact: true }).selectOption("en");
  const row = region.getByRole("listitem").filter({ hasText: "New Hall" });
  await row.getByRole("button", { name: m.edit, exact: true }).click();
  await expect(region.getByLabel(m.venue, { exact: true })).toHaveValue("New Hall");
  await expect(region.getByLabel(m.price, { exact: true }).first()).toHaveValue("18.50");
  await region.getByRole("button", { name: m.removePrice, exact: true }).nth(1).click();
  await region.getByLabel(m.price, { exact: true }).fill("20.00");
  await region.getByRole("button", { name: m.save, exact: true }).click();
  await expect(region.getByRole("status")).toHaveText(m.saved);
  const data = await (await request.get("http://127.0.0.1:8126/api/bands/admin/bands/1/gigs/")).json();
  const stored = data.gigs.find((gig: { venue: string }) => gig.venue === "New Hall");
  expect(stored.venue_translations).toMatchObject({ en: "New Hall", de: "Neuer Saal", es: "Sala nueva" });
  expect(stored.ticket_prices).toHaveLength(1);
  expect(stored.ticket_prices[0].description_translations).toMatchObject({ en: "Standard", de: "Normal", es: "General" });
  expect(stored.ticket_prices[0].price).toBe("20.00");
  await row.getByRole("button", { name: m.delete, exact: true }).click();
  await region.getByRole("button", { name: m.cancel, exact: true }).click();
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: m.delete, exact: true }).click();
  await region.getByRole("button", { name: m.confirm, exact: true }).click();
  await expect(row).toHaveCount(0);
  await expect(page.locator('a[href*="/admin/bands/"]')).toHaveCount(0);
});

test("denied gig saves show an error and preserve the customer's draft", async ({ page, request }) => {
  const m = editor.gigEditor;
  await request.post("http://127.0.0.1:8126/__scenario", { data: { denyGigSave: true } });
  await page.goto("/en/admin-dashboard/bands/1/webpage/");
  const region = page.getByRole("region", { name: m.title, exact: true });
  await region.getByRole("button", { name: m.edit, exact: true }).first().click();
  await region.getByLabel(m.price, { exact: true }).fill("17.50");
  await region.getByRole("button", { name: m.save, exact: true }).click();
  await expect(region.getByRole("alert")).toContainText(m.error);
  await expect(region.getByLabel(m.price, { exact: true })).toHaveValue("17.50");
});
