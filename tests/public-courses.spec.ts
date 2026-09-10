import { test, expect, type Page } from "@playwright/test";
import en from "../src/messages/lessons/en.json";
import de from "../src/messages/lessons/de.json";
import es from "../src/messages/lessons/es.json";

const locations = [
  { id: 1, name: "Studio A", street_address: "Street A", postcode: "12345", city: "Berlin", state: "", country: "Germany" },
  { id: 2, name: "Studio B", street_address: "Street B", postcode: "12345", city: "Berlin", state: "", country: "Germany" },
];
const courses = locations.map((location) => ({
  id: location.id, name: `Course ${location.id}`, start_date: "2030-01-07", end_date: null,
  start_time: "10:00:00", duration_minutes: 60, location, place: { id: location.id, name: "Room" },
}));
async function setup(page: Page, empty = false) {
  await page.route("**/api/**", (route) => route.fulfill({ json: {} }));
  await page.route("**/api/courses/locations/", (route) => route.fulfill({ json: { locations } }));
  await page.route("**/api/courses/public/**", (route) => {
    const filter = new URL(route.request().url()).searchParams.get("location");
    if (filter !== null && !["1", "2"].includes(filter)) return route.fulfill({ status: 404, json: { error: "Location not found" } });
    return route.fulfill({ json: { location: locations.find((item) => String(item.id) === filter) ?? null,
      courses: empty ? [] : courses.filter((item) => filter === null || String(item.location.id) === filter) } });
  });
}
for (const [locale, messages] of Object.entries({ en, de, es })) {
  test(`${locale}: course links open lessons and preserve location context`, async ({ page }) => {
    await setup(page);
    await page.route("**/api/courses/public/1/", route => route.fulfill({ json: {
      course: { id: 1, name: "Course 1" }, timezone: "Europe/Berlin", lessons: [
        { id: 10, date: "2030-01-07", start_time: "10:00:00", duration_minutes: 60, cancelled: false,
          location: { name: "Studio A" }, place: { name: "Room A" } },
        { id: 11, date: "2030-01-14", start_time: "11:30:00", duration_minutes: 45, cancelled: true,
          location: { name: "Studio B" }, place: null },
      ],
    } }));
    await page.goto(`/${locale}/lessons/courses/?location=1`);
    await page.getByRole("link", { name: /Course 1/ }).click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/lessons/courses/1/\\?location=1`));
    await expect(page.getByRole("heading", { name: "Course 1", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: messages.courseLessons.title, exact: true })).toBeVisible();
    await expect(page.getByText(messages.courseLessons.cancelled, { exact: true })).toBeVisible();
    await expect(page.getByText(/Studio B/)).toBeVisible();
    await expect(page.getByText(/Room A/)).toBeVisible();
    await expect(page.locator("main time[datetime='2030-01-07']")).toBeVisible();
    await page.getByRole("link", { name: messages.courseLessons.back }).click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/lessons/courses/\\?location=1`));
  });
  test(`${locale}: direct lesson page handles loading, error, retry and empty results`, async ({ page }) => {
    await setup(page);
    let release!: () => void;
    const hold = new Promise<void>(resolve => { release = resolve; });
    let fail = true;
    await page.route("**/api/courses/public/1/", async route => {
      await hold;
      return route.fulfill({ status: fail ? 503 : 200,
        json: fail ? {} : { course: { id: 1, name: "Course 1" }, timezone: "Europe/Berlin", lessons: [] } });
    });
    await page.goto(`/${locale}/lessons/courses/1/`);
    await expect(page.locator("main").getByRole("status")).toHaveText(messages.courseLessons.loading);
    release();
    await expect(page.locator("main").getByRole("alert")).toHaveText(messages.courseLessons.error);
    fail = false;
    await page.getByRole("button", { name: messages.courses.retry }).click();
    await expect(page.getByText(messages.courseLessons.empty)).toBeVisible();
    await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
  });
  test(`${locale}: missing and invalid course IDs show localized information`, async ({ page }) => {
    await setup(page);
    await page.route("**/api/courses/public/999/", route => route.fulfill({ status: 404, json: {} }));
    for (const id of ["999", "invalid"]) {
      await page.goto(`/${locale}/lessons/courses/${id}/`);
      await expect(page.locator("main").getByRole("alert")).toHaveText(messages.courseLessons.invalid);
      await expect(page.getByRole("link", { name: messages.courseLessons.back })).toHaveAttribute("href", `/${locale}/lessons/courses/`);
    }
  });
  test(`${locale}: location and all-locations links reach localized course lists`, async ({ page }) => {
    await setup(page);
    await page.goto(`/${locale}/lessons/`);
    await page.getByRole("link", { name: /Studio A/ }).click();
    await expect(page).toHaveURL(new RegExp(`/${locale}/lessons/courses/\\?location=1`));
    await expect(page.getByRole("heading", { name: messages.courses.title, exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Course 1" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Course 2" })).toHaveCount(0);
    await page.getByRole("link", { name: messages.courses.back }).click();
    await page.getByRole("link", { name: messages.courses.all, exact: true }).click();
    await expect(page.getByRole("heading", { name: "Course 1" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Course 2" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
  });
  for (const filtered of [true, false]) {
    test(`${locale}: ${filtered ? "location" : "global"} empty selection stays on Lessons with accessible modal`, async ({ page }) => {
      await setup(page, true);
      await page.goto(`/${locale}/lessons/`);
      const trigger = page.getByRole("link", { name: filtered ? /Studio A/ : messages.courses.all, exact: !filtered });
      await trigger.click();
      const dialog = page.getByRole("dialog", { name: messages.courses.title });
      await expect(dialog).toBeVisible();
      await expect(dialog).toHaveAccessibleDescription(filtered ? messages.courses.emptyLocation : messages.courses.emptyAll);
      const close = dialog.getByRole("button", { name: messages.courses.close });
      await expect(close).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(close).toBeFocused();
      await page.keyboard.press("Shift+Tab");
      await expect(close).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await expect(trigger).toBeFocused();
      await expect(page).toHaveURL(new RegExp(`/${locale}/lessons/$`));
      await trigger.press("Enter");
      await dialog.getByRole("button", { name: messages.courses.close }).click();
      await expect(trigger).toBeFocused();
    });
    test(`${locale}: direct empty ${filtered ? "location" : "global"} URL returns to Lessons`, async ({ page }) => {
      await setup(page, true);
      await page.goto(`/${locale}/lessons/courses/${filtered ? "?location=1" : ""}`);
      const dialog = page.getByRole("dialog");
      await expect(dialog).toContainText(filtered ? messages.courses.emptyLocation : messages.courses.emptyAll);
      await dialog.getByRole("button", { name: messages.courses.close }).click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/lessons/$`));
    });
  }
}
test("invalid and unknown filters produce localized errors rather than empty modals", async ({ page }) => {
  await setup(page);
  for (const filter of ["bad", "999", "", "1&location=2"]) {
    await page.goto(`/en/lessons/courses/?location=${filter}`);
    await expect(page.getByRole("main").getByRole("alert")).toHaveText(en.courses.invalid);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("link", { name: en.courses.back })).toBeVisible();
  }
});
test("loading, failed fetch, and retry are distinct from empty results", async ({ page }) => {
  await setup(page);
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/api/courses/public/**", async (route) => {
    await pending;
    await route.fulfill({ status: 503, json: {} });
  });
  await page.goto("/en/lessons/courses/");
  await expect(page.locator("main").getByRole("status")).toHaveText(en.courses.loading);
  release();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(en.courses.error);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.route("**/api/courses/public/**", (route) => route.fulfill({ json: { location: null, courses } }));
  await page.getByRole("button", { name: en.courses.retry }).click();
  await expect(page.getByRole("heading", { name: "Course 1" })).toBeVisible();
});

test("a failed selection check stays on Lessons and is not reported as empty", async ({ page }) => {
  await setup(page);
  await page.route("**/api/courses/public/**", (route) => route.fulfill({ status: 503, json: {} }));
  await page.goto("/en/lessons/");
  await page.getByRole("link", { name: en.courses.all, exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(en.courses.error);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).toHaveURL(/\/en\/lessons\/$/);
});
