import { test, expect } from "@playwright/test";
import { loginAs, apiLogin, createTicket, TEST_USERS } from "./helpers";

test("IT Staff claims a ticket and changes its status end-to-end (AC-08)", async ({ page }) => {
  const summary = `E2E staff flow ${Date.now()}`;
  const ticket = await createTicket(summary);

  await loginAs(page, TEST_USERS.staff);
  await page.getByRole("navigation").getByRole("link", { name: "My Queue" }).click();
  await expect(page).toHaveURL(/\/my-queue/);

  // Find the new ticket through the queue search instead of assuming it is the first row
  await page.getByPlaceholder(/search by ticket number/i).fill(summary);
  await page.locator('[data-testid="ticket-row"]:visible').filter({ hasText: ticket.ticketNumber }).click();
  await expect(page).toHaveURL(/\/staff\/tickets\/\d+/);

  await page.getByRole("button", { name: "Claim for me" }).click();
  await expect(page.getByTestId("owner-select").locator("option:checked")).toHaveText("Kevin Patel");

  const statusSelect = page.getByTestId("status-select");
  await expect(statusSelect).toHaveValue("NEW");
  await statusSelect.selectOption("OPEN");
  await expect(statusSelect).toHaveValue("OPEN");

  // An invalid jump (OPEN -> CLOSED) is never offered by the UI (BR-13)
  await expect(statusSelect.locator("option[value='CLOSED']")).toHaveCount(0);
});

test("Requester cannot see Internal Notes on their own ticket view", async ({ page }) => {
  const ticket = await createTicket(`E2E internal note ${Date.now()}`);
  const secret = `secret-note-${Date.now()}`;

  const staffApi = await apiLogin(TEST_USERS.staff);
  const noteRes = await staffApi.post(`/api/staff/tickets/${ticket.id}/notes`, { data: { content: secret } });
  expect(noteRes.ok()).toBe(true);
  await staffApi.dispose();

  await loginAs(page, TEST_USERS.requester);
  await page.goto(`/tickets/${ticket.id}`);
  await expect(page.getByRole("heading", { name: ticket.ticketNumber })).toBeVisible();

  await expect(page.getByText(/internal notes/i)).toHaveCount(0);
  await expect(page.getByText(/staff only/i)).toHaveCount(0);
  await expect(page.getByText(secret)).toHaveCount(0);
});
