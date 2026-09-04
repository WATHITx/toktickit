import { test } from "@playwright/test";

const VIEWPORTS = {
  desktop: { width: 1280, height: 800 },
  tablet: { width: 820, height: 1180 },
  mobile: { width: 375, height: 812 },
};

async function loginAsRequester(page: any) {
  await page.goto("/");
  await page.selectOption("#requester-select", { label: "Jennifer Anderson" });
  await page.getByRole("button", { name: /continue/i }).click();
}

for (const [name, size] of Object.entries(VIEWPORTS)) {
  test(`Create Ticket screenshot — ${name}`, async ({ page }) => {
    await page.setViewportSize(size);
    await loginAsRequester(page);
    await page.getByRole("main").getByRole("link", { name: /create ticket/i }).click();
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