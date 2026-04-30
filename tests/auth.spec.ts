import { test, expect } from "@playwright/test";

const TEST_USER = {
  username: `testuser_${Date.now()}`,
  firstName: "Test",
  lastName: "User",
  email: `testuser_${Date.now()}@example.com`,
  password: "TestPassword123!",
  newPassword: "NewTestPassword123!",
};

test.describe("Authentication flows", () => {
  test("register, sign in, reset password, change password, sign out", async ({ page }) => {
    await page.goto("/");

    // -------------------------
    // Register
    // -------------------------
    await page.getByRole("button", { name: /^Sign up$/i }).click();

    await page.getByLabel(/username/i).fill(TEST_USER.username);
    await page.getByLabel(/first name/i).fill(TEST_USER.firstName);
    await page.getByLabel(/last name/i).fill(TEST_USER.lastName);
    await page.getByLabel(/^email/i).fill(TEST_USER.email);
    await page.getByLabel(/confirm email/i).fill(TEST_USER.email);

    await page.getByRole("button", { name: /sign up|register|submit/i }).click();

    await expect(
      page.getByText(/verify|check your email|success|registered/i)
    ).toBeVisible();

    // Close signup modal if needed
    const closeButton = page.getByRole("button", { name: /close|ok|continue/i });
    if (await closeButton.isVisible().catch(() => false)) {
      await closeButton.click();
    }

    // -------------------------
    // Sign in
    // -------------------------
    await page.getByRole("button", { name: /log in|sign in/i }).click();

    await page.getByLabel(/username/i).fill(TEST_USER.username);
    await page.getByLabel(/password/i).fill(TEST_USER.password);

    await page.getByRole("button", { name: /log in|sign in/i }).click();

    await expect(
      page.getByText(new RegExp(TEST_USER.username, "i"))
    ).toBeVisible();

    // -------------------------
    // Reset password request
    // -------------------------
    // This only tests requesting a reset link, not consuming email token.
    await page.getByRole("button", { name: /forgot|forgotten|reset password/i }).click();

    await page.getByLabel(/^email/i).fill(TEST_USER.email);
    await page.getByLabel(/confirm email/i).fill(TEST_USER.email);

    await page.getByRole("button", { name: /reset|send/i }).click();

    await expect(
      page.getByText(/reset link has been sent|check your email|if an account exists/i)
    ).toBeVisible();

    await page.getByRole("button", { name: /close/i }).click();

    // -------------------------
    // Change password
    // -------------------------
    await page.getByRole("button", { name: /change password/i }).click();

    await page.getByLabel(/old password/i).fill(TEST_USER.password);
    await page.getByLabel(/^new password/i).fill(TEST_USER.newPassword);
    await page.getByLabel(/confirm new password/i).fill(TEST_USER.newPassword);

    await page.getByRole("button", { name: /change password|submit/i }).click();

    await expect(
      page.getByText(/password changed|success|updated/i)
    ).toBeVisible();

    // -------------------------
    // Sign out
    // -------------------------
    await page.getByRole("button", { name: /log out|sign out/i }).click();
    await page.getByRole("button", { name: /log out|sign out|confirm/i }).click();

    await expect(
      page.getByRole("button", { name: /log in|sign in/i })
    ).toBeVisible();
  });
});