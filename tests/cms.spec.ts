import { test, expect } from "@playwright/test";
import catalogue from "../backend/core/cms_catalogue.json";
import en from "../src/messages/en.json";
import de from "../src/messages/de.json";
import es from "../src/messages/es.json";
import admin from "../src/messages/admin-dashboard/en.json";
import { applyPageContent } from "../src/lib/page-content-values";

const sources = { en, de, es };
const m = admin.cms;
test.beforeEach(async ({ request }) => {
  await request.post("http://127.0.0.1:8125/__scenario", { data: {} });
});

for (const locale of ["en", "de", "es"] as const) {
  test(`${locale}: server content, blank values, stable card IDs and shared translations`, async ({ page, request }) => {
    await request.post("http://127.0.0.1:8125/__scenario", { data: { values: {
      "home.titleHome": { [locale]: `CMS ${locale}` },
      "home.home.intro.paragraphs.0": { [locale]: "" },
      "home.home.sections.bands.body": { [locale]: `Band content ${locale}` },
      ...(locale === "es" ? { "home.home.intro.imageSrc": { es: "" } } : {}),
    } } });
    await page.goto(`/${locale}/`);
    await expect(page.getByRole("heading", { name: `CMS ${locale}`, exact: true })).toBeVisible();
    await expect(page.getByText(sources[locale].home.intro.paragraphs[0], { exact: true })).toHaveCount(0);
    await expect(page.getByText(sources[locale].home.intro.paragraphs[1], { exact: true })).toBeVisible();
    const bandTitle = sources[locale].home.sections.find(section => section.id === "bands")!.title;
    await expect(page.locator("article").filter({ has: page.getByRole("heading", { name: bandTitle, exact: true }) })).toContainText(`Band content ${locale}`);
    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator("footer")).toBeVisible();
    await expect(page.locator("article")).toHaveCount(2);
    if (locale === "es") await expect(page.locator("main img")).toHaveCount(0);
  });
}

test("missing and unavailable CMS use each language's JSON fallback", async ({ page, request }) => {
  for (const publicMode of ["missing", "unavailable", "disconnect"]) {
    await request.post("http://127.0.0.1:8125/__scenario", { data: { publicMode } });
    for (const locale of ["en", "de", "es"] as const) {
      await page.goto(`/${locale}/`);
      await expect(page.getByRole("heading", { name: sources[locale].titleHome, exact: true })).toBeVisible();
    }
  }
});

test("only catalogue fields merge; missing and blank are distinct without mutating JSON", () => {
  const source = { titleHome: "Local", home: { intro: { claim: "Claim" } }, system: "Keep" };
  const merged = applyPageContent("home", source, { "home.titleHome": "", "home.system": "Denied", "contact.titleContact": "Other" }, catalogue.fields);
  expect(merged.titleHome).toBe("");
  expect(merged.home.intro.claim).toBe("Claim");
  expect(merged.system).toBe("Keep");
  expect(source.titleHome).toBe("Local");
});

test("editor keeps drafts across languages, saves independently and preserves blanks", async ({ page, request }, testInfo) => {
  await request.post("http://127.0.0.1:8125/__scenario", { data: { missing: [["home.titleHome", "de"]] } });
  await page.goto("/en/admin-dashboard/");
  await page.getByRole("button", { name: m.title, exact: true }).click();
  await page.getByLabel(m.value, { exact: true }).fill("English draft");
  await page.getByLabel(m.language, { exact: true }).selectOption("de");
  await expect(page.getByRole("option", { selected: true }).filter({ hasText: m.missing })).toHaveCount(1);
  await expect(page.getByLabel(m.value, { exact: true })).toHaveValue(de.titleHome);
  await page.getByLabel(m.value, { exact: true }).fill("German saved");
  await page.getByRole("button", { name: m.save, exact: true }).click();
  await expect(page.getByRole("status")).toHaveText(m.saved);
  await page.getByLabel(m.language, { exact: true }).selectOption("en");
  await expect(page.getByLabel(m.value, { exact: true })).toHaveValue("English draft");
  await page.getByLabel(m.value, { exact: true }).fill("");
  await page.getByRole("button", { name: m.save, exact: true }).click();
  await expect(page.getByRole("status")).toHaveText(m.saved);
  await expect(page.getByRole("option", { selected: true }).filter({ hasText: m.missing })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("cms-editor.png"), fullPage: true });
  await page.goto("/en/");
  await expect(page.locator("h1")).toHaveText("");
  await page.goto("/de/");
  await expect(page.getByRole("heading", { name: "German saved", exact: true })).toBeVisible();
});

test("every other catalogued public page uses CMS titles and image references", async ({ page, request }) => {
  test.setTimeout(120000);
  const fields = catalogue.fields.filter(field => field.page !== "home" && field.path.length === 1);
  const values = Object.fromEntries(fields.map(field => [field.id, { en: `CMS ${field.page}` }]));
  values["production.production.image.src"] = { en: "/cms-media/fixture.jpg" };
  values["technical.technical.image.src"] = { en: "/cms-media/fixture.jpg" };
  await request.post("http://127.0.0.1:8125/__scenario", { data: { values } });
  for (const field of fields) {
    // Privacy's lastUpdated/introduction also have one-element paths.
    if (!field.id.split(".").at(-1)?.startsWith("title")) continue;
    await page.goto(`/en/${field.page}/`);
    await expect(page.getByRole("heading", { name: `CMS ${field.page}`, exact: true })).toBeVisible();
    if (field.page === "production" || field.page === "technical") {
      await expect(page.locator('main img[src="/cms-media/fixture.jpg"]')).toBeVisible();
    }
  }
});

test("image preview and replacement preserve the current image on storage failure", async ({ page, request }) => {
  await page.goto("/en/admin-dashboard/");
  await page.getByRole("button", { name: m.title, exact: true }).click();
  await page.getByLabel(m.field, { exact: true }).selectOption("home.home.intro.imageSrc");
  await expect(page.getByAltText(m.currentImage)).toHaveAttribute("src", "/guitarist.jpg");
  const image = { name: "image.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jL1sAAAAASUVORK5CYII=", "base64") };
  await page.getByLabel(m.upload, { exact: true }).setInputFiles(image);
  await expect(page.getByRole("status")).toHaveText(m.saved);
  await expect(page.getByAltText(m.currentImage)).toHaveAttribute("src", "/cms-media/fixture.jpg");
  await request.post("http://127.0.0.1:8125/__scenario", { data: { uploadFail: true } });
  await page.getByLabel(m.upload, { exact: true }).setInputFiles(image);
  await expect(page.locator("main").getByRole("alert")).toHaveText(m.image_storage);
  await expect(page.getByAltText(m.currentImage)).toHaveAttribute("src", "/cms-media/fixture.jpg");
});

test("ordinary users cannot access the dashboard editor", async ({ page, request }) => {
  await request.post("http://127.0.0.1:8125/__scenario", { data: { ordinary: true } });
  await page.goto("/en/admin-dashboard/");
  await expect(page.getByRole("button", { name: m.title, exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: admin.titleAdminDashboard, exact: true })).toHaveCount(0);
});
