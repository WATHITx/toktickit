import { test, expect } from "@playwright/test";
import { loginAs, TEST_USERS } from "./helpers";

test.describe("Authentication", () => {
  test("shows error on invalid credentials (AC-05)", async ({ page }) => {
    await page.goto("/login");
    await page.fill("#email", TEST_USERS.requester);
    await page.fill("#password", "WrongPassword!1");
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("logs in successfully and shows authenticated shell (AC-01)", async ({ page }) => {
    await loginAs(page, TEST_USERS.requester);
    await expect(page.getByText("Jennifer Anderson")).toBeVisible();
    await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();
  });

  test("logs out and blocks direct access to a protected route (AC-07)", async ({ page }) => {
    await loginAs(page, TEST_USERS.requester);
    await page.getByRole("button", { name: "Logout" }).click();
    await expect(page).toHaveURL(/\/login/);

    await page.goto("/my-tickets");
    await expect(page).toHaveURL(/\/login/);
  });

  test("blocks a Requester from opening the staff queue directly", async ({ page }) => {
    await loginAs(page, TEST_USERS.requester);
    await page.goto("/my-queue");

    await expect(page).not.toHaveURL(/\/my-queue/);
    await expect(page.getByRole("heading", { name: "My Queue" })).not.toBeVisible();
  });

  test("shows each role only the navigation it can use", async ({ page }) => {
    const nav = (name: string) => page.getByRole("navigation").getByRole("link", { name });

    await loginAs(page, TEST_USERS.requester);
    await expect(nav("My Tickets")).toBeVisible();
    await expect(nav("My Queue")).toHaveCount(0);
    await expect(nav("Admin")).toHaveCount(0);
    await page.getByRole("button", { name: "Logout" }).click();

    await loginAs(page, TEST_USERS.staff);
    await expect(nav("My Queue")).toBeVisible();
    await expect(nav("My Tickets")).toHaveCount(0);
    await expect(nav("Admin")).toHaveCount(0);
    await page.getByRole("button", { name: "Logout" }).click();

    await loginAs(page, TEST_USERS.admin);
    await expect(nav("My Queue")).toBeVisible();
    await expect(nav("Admin")).toBeVisible();
    await expect(nav("My Tickets")).toHaveCount(0);
  });
});
