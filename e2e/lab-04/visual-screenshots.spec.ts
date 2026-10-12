import { test, expect, Page } from "@playwright/test";
import { loginAs, apiLogin, TEST_USERS } from "../lab-03/helpers";

// RESP-01..09: Lab 4 screens at desktop / tablet / mobile. Besides saving the screenshots for the report,
// each test asserts there is no horizontal page scroll at that width and no console errors on the page.

const VIEWPORTS = {
  desktop: { width: 1280, height: 800 },
  tablet: { width: 820, height: 1180 },
  mobile: { width: 375, height: 812 },
};
const OUT = "artifacts/lab-04/screenshots";

let demoTicketId: number;
let consoleErrors: string[] = [];

test.beforeEach(async ({ page }) => {
  consoleErrors = [];
  page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
  page.on("pageerror", (err) => consoleErrors.push(err.message));
});

test.afterEach(() => {
  expect(consoleErrors, "console errors on the page").toEqual([]);
});

test.beforeAll(async () => {
  // SEED-L4-03 has actions by three different staff members (prisma/seed.ts)
  const api = await apiLogin(TEST_USERS.staff);
  const res = await api.get("/api/staff/tickets?search=SEED-L4-03");
  demoTicketId = (await res.json()).data[0].id;
  await api.dispose();
});

async function expectNoHorizontalScroll(page: Page, width: number) {
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth, "page is wider than the viewport").toBeLessThanOrEqual(width);
}

for (const [name, size] of Object.entries(VIEWPORTS)) {
  test(`Staff Dashboard — ${name}`, async ({ page }) => {
    await page.setViewportSize(size);
    await loginAs(page, TEST_USERS.staff);
    await page.getByTestId("metric-unassigned").waitFor();
    await expectNoHorizontalScroll(page, size.width);
    await page.screenshot({ path: `${OUT}/staff-dashboard/${name}.png`, fullPage: true });
  });

  test(`Requester Dashboard — ${name}`, async ({ page }) => {
    await page.setViewportSize(size);
    await loginAs(page, TEST_USERS.requester);
    await page.getByTestId("metric-open").waitFor();
    await expectNoHorizontalScroll(page, size.width);
    await page.screenshot({ path: `${OUT}/requester-dashboard/${name}.png`, fullPage: true });
  });

  test(`Actions Taken (IT Staff) — ${name}`, async ({ page }) => {
    await page.setViewportSize(size);
    await loginAs(page, TEST_USERS.staff);
    await page.goto(`/staff/tickets/${demoTicketId}`);
    await page.getByTestId("action-row").first().waitFor();
    await page.getByRole("button", { name: "+ Add Action" }).click(); // show the create panel too
    await expectNoHorizontalScroll(page, size.width);
    await page.screenshot({ path: `${OUT}/actions-taken/${name}.png`, fullPage: true });
  });

  test(`Actions Taken (Requester, read-only) — ${name}`, async ({ page }) => {
    await page.setViewportSize(size);
    await loginAs(page, "david.l@toktickit.test"); // SEED-L4-03's Requester
    await page.goto(`/tickets/${demoTicketId}`);
    await page.getByTestId("action-row").first().waitFor();
    await expectNoHorizontalScroll(page, size.width);
    await page.screenshot({ path: `${OUT}/actions-taken/requester-${name}.png`, fullPage: true });
  });
}
