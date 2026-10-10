import { test, expect, Page } from "@playwright/test";
import { loginAs, createTicket, TEST_USERS } from "../lab-03/helpers";

// E2E-01 (AC-01, AC-06): two staff members record different Actions Taken on one Ticket,
// one is completed, and the Requester sees both read-only.

const logout = (page: Page) => page.getByRole("button", { name: "Logout" }).click();

async function addAction(page: Page, description: string, opts: { result?: string; followUpNote?: string; assignee?: string } = {}) {
  await page.getByRole("button", { name: "+ Add Action" }).click();
  await page.getByLabel(/action description/i).fill(description);
  if (opts.result) await page.getByLabel(/^result/i).fill(opts.result);
  if (opts.assignee) await page.getByLabel("Assignee").selectOption({ label: opts.assignee });
  if (opts.followUpNote) {
    await page.getByLabel(/follow-up required/i).check();
    await page.getByLabel(/follow-up note/i).fill(opts.followUpNote);
  }
  await page.getByRole("button", { name: "Save Action" }).click();
  await expect(page.getByRole("status")).toContainText("Action saved");
}

test("two IT Staff record Actions Taken on one Ticket and the Requester sees both read-only (E2E-01)", async ({ page }) => {
  const ticket = await createTicket(`E2E actions flow ${Date.now()}`);
  const rows = page.getByTestId("action-row");

  // Kevin records a planned action with a follow-up
  await loginAs(page, TEST_USERS.staff);
  await page.goto(`/staff/tickets/${ticket.id}`);
  await expect(page.getByText(/no actions recorded yet/i)).toBeVisible();
  await addAction(page, "Checked the network cable at the desk", { followUpNote: "Verify the wall port tomorrow" });
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Kevin Patel");
  await expect(rows.first()).toContainText("Planned");
  await expect(rows.first()).toContainText("Follow-up");
  await logout(page);

  // A second staff member (Administrator) records another action and assigns it to Emily
  await loginAs(page, TEST_USERS.admin);
  await page.goto(`/staff/tickets/${ticket.id}`);
  await addAction(page, "Moved the user to a spare switch port", { assignee: "Emily Davis" });
  await expect(rows).toHaveCount(2);
  await expect(page.getByRole("heading", { name: "Actions Taken (2)" })).toBeVisible();
  await expect(rows.nth(1)).toContainText("Admin User");
  await expect(rows.nth(1)).toContainText("Emily Davis");

  // Complete Kevin's action; it becomes read-only
  await rows.first().getByRole("button", { name: "Edit" }).click();
  await rows.first().getByLabel(/^result/i).fill("Cable replaced, link is stable");
  await rows.first().getByRole("button", { name: "Mark Completed" }).click();
  await expect(rows.first()).toContainText("Completed");
  await expect(rows.first().getByRole("button", { name: "View" })).toBeVisible();
  await logout(page);

  // The Requester sees both actions with no write controls
  await loginAs(page, TEST_USERS.requester);
  await page.goto(`/tickets/${ticket.id}`);
  await expect(page.getByRole("heading", { name: "Work Performed by IT" })).toBeVisible();
  await expect(rows).toHaveCount(2);
  await expect(rows.first()).toContainText("Kevin Patel");
  await expect(rows.nth(1)).toContainText("Admin User");
  await expect(page.getByRole("button", { name: "+ Add Action" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Edit" })).toHaveCount(0);

  await rows.first().getByRole("button", { name: "View" }).click();
  await expect(rows.first()).toContainText("Cable replaced, link is stable");
  await expect(rows.first()).toContainText("Verify the wall port tomorrow");
  await expect(page.getByText(/internal notes/i)).toHaveCount(0);
});

test("shows a field error and keeps the form when the Follow-up Note is missing (AC-03)", async ({ page }) => {
  const ticket = await createTicket(`E2E actions validation ${Date.now()}`);
  await loginAs(page, TEST_USERS.staff);
  await page.goto(`/staff/tickets/${ticket.id}`);

  await page.getByRole("button", { name: "+ Add Action" }).click();
  await page.getByLabel(/action description/i).fill("Needs a follow-up");
  await page.getByLabel(/follow-up required/i).check();
  await page.getByRole("button", { name: "Save Action" }).click();

  await expect(page.getByText("Follow-up Note is required when follow-up is needed")).toBeVisible();
  await expect(page.getByLabel(/follow-up note/i)).toBeFocused();
  await expect(page.getByLabel(/action description/i)).toHaveValue("Needs a follow-up");
  await expect(page.getByTestId("action-row")).toHaveCount(0);
});
