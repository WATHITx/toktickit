import { test } from "@playwright/test";
import { loginAs, TEST_USERS } from "../lab-03/helpers";

const VIEWPORTS = {
  desktop: { width: 1280, height: 800 },
  tablet: { width: 820, height: 1180 },
  mobile: { width: 375, height: 812 },
};

// Lab 3 replaced the development requester selector with real login
const loginAsRequester = (page: any) => loginAs(page, TEST_USERS.requester);

for (const [name, size] of Object.entries(VIEWPORTS)) {
  test(`Create Ticket screenshot — ${name}`, async ({ page }) => {
    await page.setViewportSize(size);
    await loginAsRequester(page);
    await page.getByRole("navigation").getByRole("link", { name: /create ticket/i }).click();
    await page.screenshot({
      path: `artifacts/lab-02/screenshots/create-ticket/${name}.png`,
      fullPage: true,
    });
  });

  test(`My Tickets screenshot — ${name}`, async ({ page }) => {
    await page.setViewportSize(size);
    await loginAsRequester(page);
    await page.screenshot({
      path: `artifacts/lab-02/screenshots/my-tickets/${name}.png`,
      fullPage: true,
    });
  });

  test(`Ticket Detail screenshot — ${name}`, async ({ page }) => {
    await page.setViewportSize(size);
    await loginAsRequester(page);
    // เปิด ticket ใบแรกที่เจอในลิสต์ (ต้องมี ticket อย่างน้อย 1 ใบอยู่แล้วก่อนรัน)
    // เลือกเฉพาะ element ที่มองเห็นได้ (table จะถูกซ่อนบนมือถือ)
    await page.locator('[data-testid="ticket-row"]:visible').first().click();
    await page.waitForURL(/\/tickets\/\d+/);
    await page.screenshot({
      path: `artifacts/lab-02/screenshots/ticket-detail/${name}.png`,
      fullPage: true,
    });
  });
}