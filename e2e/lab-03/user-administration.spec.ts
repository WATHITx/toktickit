import { test, expect } from "@playwright/test";
import { loginAs, TEST_USERS } from "./helpers";

test("Administrator creates and edits a user end-to-end", async ({ page }) => {
  await loginAs(page, TEST_USERS.admin);

  await page.getByRole("navigation").getByRole("link", { name: "Admin" }).click();
  await expect(page).toHaveURL(/\/admin\/users/);

  // The "e2e-test-" prefix lets e2e/global-setup.ts clean these users up on the next run
  const email = `e2e-test-${Date.now()}@toktickit.test`;
  await page.getByRole("button", { name: "+ Create User" }).click();
  await page.getByLabel(/full name/i).fill("E2E Test User");
  await page.getByLabel(/email address/i).fill(email);
  await page.getByLabel(/initial password/i).fill("TempPass!99");
  await page.getByRole("button", { name: "Save User" }).click();

  const row = page.getByTestId("user-row").filter({ hasText: email });
  await expect(row).toBeVisible();
  await expect(row).toContainText("REQUESTER");

  await row.getByRole("button", { name: "Edit" }).click();
  await page.getByLabel(/full name/i).fill("E2E Renamed User");
  await page.getByLabel(/^role/i).selectOption("IT_STAFF");
  await page.getByRole("button", { name: "Save User" }).click();

  const updated = page.getByTestId("user-row").filter({ hasText: email });
  await expect(updated).toContainText("E2E Renamed User");
  await expect(updated).toContainText("IT_STAFF");
});

test("shows an error when creating a user with a duplicate email (AC-12)", async ({ page }) => {
  await loginAs(page, TEST_USERS.admin);
  await page.goto("/admin/users");

  await page.getByRole("button", { name: "+ Create User" }).click();
  await page.getByLabel(/full name/i).fill("Duplicate Person");
  await page.getByLabel(/email address/i).fill(TEST_USERS.requester);
  await page.getByLabel(/initial password/i).fill("TempPass!99");
  await page.getByRole("button", { name: "Save User" }).click();

  await expect(page.getByRole("alert")).toContainText(/already exists/i);
});

test("non-Administrator cannot access User Management directly", async ({ page }) => {
  await loginAs(page, TEST_USERS.staff);
  await page.goto("/admin/users");

  await expect(page).not.toHaveURL(/\/admin\/users/);
  await expect(page.getByRole("button", { name: "+ Create User" })).toHaveCount(0);
});
