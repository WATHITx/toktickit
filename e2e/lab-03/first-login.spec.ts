import { test, expect } from "@playwright/test";
import { TEST_USERS, DEV_PASSWORD } from "./helpers";

// This test changes michael.b's password in the DB. e2e/global-setup.ts re-seeds it before every run,
// so a retry inside the same run would log in with a password that no longer works: never retry.
test.describe.configure({ retries: 0 });

test("requires password change on first login (AC-02)", async ({ page }) => {
  await page.goto("/login");
  await page.fill("#email", TEST_USERS.firstLogin);
  await page.fill("#password", DEV_PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();

  await expect(page).toHaveURL(/\/change-password/);

  // The app must stay locked to the change-password screen until the change is saved
  await page.goto("/my-tickets");
  await expect(page).toHaveURL(/\/change-password/);

  await page.fill("#current", DEV_PASSWORD);
  await page.fill("#new", "NewSecure!456");
  await page.fill("#confirm", "NewSecure!456");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page).toHaveURL(/\/my-tickets/);
});
