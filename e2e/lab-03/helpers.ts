import { Page, APIRequestContext, request as pwRequest } from "@playwright/test";

export const BASE_URL = "http://localhost:5173";
export const DEV_PASSWORD = "DevPass!123";

export const TEST_USERS = {
  requester: "jennifer.a@toktickit.test",
  staff: "kevin.p@toktickit.test",
  admin: "admin@toktickit.test",
  // Seeded with mustChangePassword = true; used only by first-login.spec.ts
  firstLogin: "michael.b@toktickit.test",
};

export async function loginAs(page: Page, email: string, password = DEV_PASSWORD) {
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", password);
  // Use the role: `text=Sign In` also matches the "Sign in to your account" heading and never submits.
  await page.getByRole("button", { name: "Sign In" }).click();
  // Leaves /login for either the app or /change-password
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
  await page.waitForLoadState("networkidle");
}

/** API-authenticated request context (independent of any browser page). */
export async function apiLogin(email: string, password = DEV_PASSWORD): Promise<APIRequestContext> {
  const api = await pwRequest.newContext({ baseURL: BASE_URL });
  const res = await api.post("/api/auth/login", { data: { email, password } });
  if (!res.ok()) throw new Error(`API login failed for ${email}: ${res.status()}`);
  return api;
}

/** Creates a ticket as the seeded Requester so specs do not depend on whatever is already in the DB. */
export async function createTicket(summary: string): Promise<{ id: number; ticketNumber: string }> {
  const api = await apiLogin(TEST_USERS.requester);
  try {
    const categories = await (await api.get("/api/categories")).json();
    const systems = await (await api.get("/api/related-systems")).json();
    const res = await api.post("/api/tickets", {
      data: {
        categoryId: categories[0].id,
        relatedSystemId: systems[0].id,
        summary,
        description: "Created by an E2E test.",
        requestedPriority: "MEDIUM",
      },
    });
    if (!res.ok()) throw new Error(`Ticket creation failed: ${res.status()}`);
    return res.json();
  } finally {
    await api.dispose();
  }
}
