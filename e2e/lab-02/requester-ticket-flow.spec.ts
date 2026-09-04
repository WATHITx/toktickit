import { test, expect } from "@playwright/test";

test.describe("Requester ticket flow", () => {
  test("Requester creates a ticket and finds it in My Tickets (AC-01, FR-04)", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /select development requester/i })).toBeVisible();
    await page.selectOption("#requester-select", { label: "Jennifer Anderson" });
    await page.getByRole("button", { name: /continue/i }).click();

    await page.getByRole("main").getByRole("link", { name: /create ticket/i }).click();
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

  test("Switching Requester isolates ticket visibility (AC-03)", async ({ page }) => {
    await page.goto("/");
    await page.selectOption("#requester-select", { label: "Jennifer Anderson" });
    await page.getByRole("button", { name: /continue/i }).click();

    await expect(page).toHaveURL(/my-tickets/);

    await page.getByRole("button", { name: /change requester/i }).click();
    await page.selectOption("#requester-select", { label: "Michael Brown" });
    await page.getByRole("button", { name: /continue/i }).click();

    await expect(page).toHaveURL(/my-tickets/);
    await expect(page.locator("tbody tr").filter({ hasText: "E2E test — laptop battery drains quickly" })).toHaveCount(0);
  });
});
