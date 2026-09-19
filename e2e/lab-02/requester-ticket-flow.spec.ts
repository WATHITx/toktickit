import { test, expect } from "@playwright/test";
import { loginAs, createTicket, TEST_USERS } from "../lab-03/helpers";

// Lab 2's "Select Development Requester" screen was replaced by real login in Lab 3,
// so these regression tests now sign in as the seeded Requesters.
test.describe("Requester ticket flow", () => {
  test("Requester creates a ticket and finds it in My Tickets (AC-01, FR-04)", async ({ page }) => {
    await loginAs(page, TEST_USERS.requester);
    await expect(page).toHaveURL(/my-tickets/);

    await page.getByRole("navigation").getByRole("link", { name: /create ticket/i }).click();
    await expect(page.getByRole("heading", { name: /create ticket/i })).toBeVisible();

    await page.selectOption("#category", { label: "Hardware" });
    await page.selectOption("#relatedSystem", { label: "Corporate Laptop" });
    await page.getByLabel(/summary/i).fill("E2E test — laptop battery drains quickly");
    await page.getByLabel(/description/i).fill("Battery drains fast even when idle. Created via E2E test.");
    await page.getByRole("button", { name: /^submit$/i }).click();

    const ticketNumberLocator = page.getByText(/TKT-\d{4}-\d+/);
    await expect(ticketNumberLocator).toBeVisible();
    const ticketNumberText = await ticketNumberLocator.textContent();

    await page.getByRole("button", { name: /view my tickets/i }).click();

    const createdRow = page.locator("tbody tr").filter({ hasText: "E2E test — laptop battery drains quickly" }).first();
    await expect(createdRow).toContainText("E2E test — laptop battery drains quickly");
    expect(ticketNumberText).toMatch(/TKT-\d{4}-\d+/);
  });

  test("Signing in as a different Requester isolates ticket visibility (AC-03)", async ({ page }) => {
    const summary = `E2E isolation ${Date.now()}`;
    await createTicket(summary); // owned by Jennifer

    await loginAs(page, TEST_USERS.requester);
    await expect(page).toHaveURL(/my-tickets/);
    await page.getByPlaceholder(/search/i).fill(summary);
    await expect(page.locator("tbody tr").filter({ hasText: summary })).toHaveCount(1);

    await page.getByRole("button", { name: "Logout" }).click();
    await loginAs(page, "sarah.j@toktickit.test");
    await expect(page).toHaveURL(/my-tickets/);

    await page.getByPlaceholder(/search/i).fill(summary);
    await expect(page.locator("tbody tr").filter({ hasText: summary })).toHaveCount(0);
  });
});
