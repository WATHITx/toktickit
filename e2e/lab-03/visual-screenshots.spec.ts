import { test } from "@playwright/test";
import { loginAs, createTicket, TEST_USERS } from "./helpers";

const VIEWPORTS = {
  desktop: { width: 1280, height: 800 },
  tablet: { width: 820, height: 1180 },
  mobile: { width: 375, height: 812 },
};

test.beforeAll(async () => {
  // Staff Ticket Detail needs at least one ticket in the queue
  await createTicket(`E2E screenshot ticket ${Date.now()}`);
});

for (const [name, size] of Object.entries(VIEWPORTS)) {
  test(`Login screenshot — ${name}`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto("/login");
    await page.screenshot({
      path: `artifacts/lab-03/screenshots/authentication/login-${name}.png`,
      fullPage: true,
    });
  });

  test(`Staff Queue screenshot — ${name}`, async ({ page }) => {
    await page.setViewportSize(size);
    await loginAs(page, TEST_USERS.staff);
    await page.goto("/my-queue");
    await page.locator('[data-testid="ticket-row"]:visible').first().waitFor();
    await page.screenshot({
      path: `artifacts/lab-03/screenshots/staff-queue/${name}.png`,
      fullPage: true,
    });
  });

  test(`Staff Ticket Detail screenshot — ${name}`, async ({ page }) => {
    await page.setViewportSize(size);
    await loginAs(page, TEST_USERS.staff);
    await page.goto("/my-queue");
    await page.locator('[data-testid="ticket-row"]:visible').first().click();
    await page.waitForURL(/\/staff\/tickets\/\d+/);
    await page.getByText(/staff only/i).waitFor();
    await page.screenshot({
      path: `artifacts/lab-03/screenshots/staff-ticket-detail/${name}.png`,
      fullPage: true,
    });
  });

  test(`User Management screenshot — ${name}`, async ({ page }) => {
    await page.setViewportSize(size);
    await loginAs(page, TEST_USERS.admin);
    await page.goto("/admin/users");
    await page.getByTestId("user-row").first().waitFor();
    await page.screenshot({
      path: `artifacts/lab-03/screenshots/user-management/${name}.png`,
      fullPage: true,
    });
  });
}