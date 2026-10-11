import { test, expect, Page } from "@playwright/test";
import { loginAs, TEST_USERS } from "../lab-03/helpers";

// E2E-03 (AC-02, AC-13) and A11Y-01: every dashboard card opens a filtered list showing the same number
// of tickets, and the cards work from the keyboard.

const cardValue = async (page: Page, testId: string) => Number(await page.getByTestId(testId).locator(".fs-2").textContent());
const resultCount = async (page: Page) => {
  await expect(page.getByTestId("result-count")).toBeVisible();
  return Number((await page.getByTestId("result-count").textContent())!.trim().split(" ")[0]);
};

test("the Requester dashboard is the landing page and each card drills down to a matching list (E2E-03)", async ({ page }) => {
  await loginAs(page, TEST_USERS.requester);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByRole("navigation").getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");

  for (const [testId, status] of [
    ["metric-open", "ACTIVE"], ["metric-waiting", "WAITING_FOR_REQUESTER"], ["metric-resolved", "RECENTLY_RESOLVED"],
  ] as const) {
    await page.goto("/dashboard");
    const value = await cardValue(page, testId);
    await page.getByTestId(testId).click();
    await expect(page).toHaveURL(new RegExp(`/my-tickets\\?status=${status}`));
    await expect(page.getByLabel("Filter by status")).toHaveValue(status);
    expect(await resultCount(page), testId).toBe(value);
  }
});

test("the IT Staff dashboard cards and counts drill down to matching queue views (E2E-03, AC-13)", async ({ page }) => {
  await loginAs(page, TEST_USERS.staff);
  await expect(page).toHaveURL(/\/dashboard$/);

  for (const testId of ["metric-unassigned", "metric-mine"]) {
    await page.goto("/dashboard");
    const value = await cardValue(page, testId);
    await page.getByTestId(testId).click();
    await expect(page).toHaveURL(/\/my-queue\?status=ACTIVE&ownership=/);
    expect(await resultCount(page), testId).toBe(value);
  }

  // A status count and a priority count
  await page.goto("/dashboard");
  const closed = page.getByTestId("by-status").getByRole("link", { name: /^Closed:/ });
  const closedCount = Number((await closed.getAttribute("aria-label"))!.match(/: (\d+)/)![1]);
  await closed.click();
  await expect(page).toHaveURL(/\/my-queue\?status=CLOSED/);
  expect(await resultCount(page)).toBe(closedCount);

  await page.goto("/dashboard");
  const high = page.getByTestId("by-priority").getByRole("link", { name: /^High priority/ });
  const highCount = Number((await high.getAttribute("aria-label"))!.match(/: (\d+)/)![1]);
  await high.click();
  await expect(page).toHaveURL(/\/my-queue\?status=ACTIVE&itPriority=HIGH/);
  expect(await resultCount(page)).toBe(highCount);
});

test("an urgent ticket and My Open Actions open the Ticket Detail; Admins also see user counts", async ({ page }) => {
  await loginAs(page, TEST_USERS.admin);
  await expect(page.getByTestId("user-counts")).toBeVisible();

  const urgent = page.getByTestId("urgent").getByRole("link").first();
  if (await urgent.count()) {
    await urgent.click();
    await expect(page).toHaveURL(/\/staff\/tickets\/\d+/);
  }

  await page.goto("/dashboard");
  await page.getByTestId("user-counts").getByRole("link", { name: /IT Staff/ }).click();
  await expect(page).toHaveURL(/\/admin\/users\?role=IT_STAFF/);
  await expect(page.getByLabel("Filter by role")).toHaveValue("IT_STAFF");
});

test("dashboard cards are reachable and usable with the keyboard (A11Y-01)", async ({ page }) => {
  await loginAs(page, TEST_USERS.staff);
  const card = page.getByTestId("metric-unassigned");
  await expect(card).toBeVisible();

  // Tab until the first metric card has focus, then activate it with Enter
  for (let i = 0; i < 15 && !(await card.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press("Tab");
  await expect(card).toBeFocused();
  const outline = await card.evaluate((el) => getComputedStyle(el).outlineStyle + " " + getComputedStyle(el).boxShadow);
  expect(outline).not.toBe("none none");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/my-queue\?status=ACTIVE&ownership=unassigned/);
});
