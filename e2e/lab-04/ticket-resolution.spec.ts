import { test, expect, Page } from "@playwright/test";
import { loginAs, createTicket, TEST_USERS } from "../lab-03/helpers";

// E2E-02 (AC-07, AC-08, AC-15): the full lifecycle through the real UI —
// create → claim → In Progress → Resolved blocked by the gate → complete an action → Resolved → Closed
// → the Requester reopens it. Every step shows in the status badge and the history.

const logout = (page: Page) => page.getByRole("button", { name: "Logout" }).click();

async function changeStatus(page: Page, to: string, label: string) {
  await page.getByTestId("status-select").selectOption(to);
  await page.getByTestId("status-confirm").getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByRole("status").filter({ hasText: `Status changed to ${label}` })).toBeVisible();
  await expect(page.getByTestId("ticket-status-badge")).toHaveText(label);
}

test("a ticket goes from creation to closure and the Requester reopens it (E2E-02)", async ({ page }) => {
  const ticket = await createTicket(`E2E lifecycle ${Date.now()}`);

  await loginAs(page, TEST_USERS.staff);
  await page.goto(`/staff/tickets/${ticket.id}`);
  await expect(page.getByTestId("ticket-status-badge")).toHaveText("New");
  await expect(page.getByText("No status changes recorded since this feature was introduced.")).toBeVisible();

  await page.getByRole("button", { name: "Claim for me" }).click();
  await expect(page.getByTestId("owner-select").locator("option:checked")).toHaveText("Kevin Patel");
  await changeStatus(page, "IN_PROGRESS", "In Progress");

  // The gate explains what is missing before trying, and the server blocks the attempt anyway
  await expect(page.getByTestId("gate-hint")).toContainText("Complete at least one Action Taken");
  await page.getByTestId("status-select").selectOption("RESOLVED");
  await page.getByTestId("status-confirm").getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByText("This ticket cannot be resolved yet.")).toBeVisible();
  await expect(page.getByTestId("ticket-status-badge")).toHaveText("In Progress");

  // Record and complete the work; the hint disappears
  await page.getByRole("button", { name: "+ Add Action" }).click();
  await page.getByLabel(/action description/i).fill("Reinstalled the VPN client");
  await page.getByLabel(/^result/i).fill("Connection stable for 30 minutes");
  await page.getByRole("button", { name: "Save Action" }).click();
  const row = page.getByTestId("action-row").first();
  await row.getByRole("button", { name: "Edit" }).click();
  await row.getByRole("button", { name: "Mark Completed" }).click();
  await expect(row).toContainText("Completed");
  await expect(page.getByTestId("gate-hint")).toHaveCount(0);

  await changeStatus(page, "RESOLVED", "Resolved");
  await changeStatus(page, "CLOSED", "Closed");

  const history = page.getByTestId("status-history").getByRole("listitem");
  await expect(history).toHaveCount(3);
  await expect(history.first()).toContainText("Resolved → Closed");
  await expect(history.first()).toContainText("Kevin Patel");
  await logout(page);

  // The Requester sees the outcome and reopens the ticket
  await loginAs(page, TEST_USERS.requester);
  await page.goto(`/tickets/${ticket.id}`);
  await expect(page.getByTestId("ticket-status-badge")).toHaveText("Closed");
  await page.getByRole("button", { name: "Reopen Ticket" }).click();
  await page.getByRole("button", { name: "Yes, reopen" }).click();
  await expect(page.getByTestId("ticket-status-badge")).toHaveText("Reopened");
  await expect(page.getByRole("button", { name: "Reopen Ticket" })).toHaveCount(0);

  const requesterHistory = page.getByTestId("status-history").getByRole("listitem");
  await expect(requesterHistory).toHaveCount(4);
  await expect(requesterHistory.first()).toContainText("Closed → Reopened");
  await expect(requesterHistory.first()).toContainText("Jennifer Anderson");
});
