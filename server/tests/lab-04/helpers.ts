import request from "supertest";
import { expect } from "vitest";
import app from "../../src/app";
import { getPrisma } from "../../src/prisma";

export const DEV_PASSWORD = "DevPass!123";
export const USERS = {
  requester: "jennifer.a@toktickit.test",
  otherRequester: "sarah.j@toktickit.test",
  staff: "kevin.p@toktickit.test",
  otherStaff: "emily.d@toktickit.test",
  inactiveStaff: "inactive.staff@toktickit.test",
  admin: "admin@toktickit.test",
};

export async function loginAs(email: string, password = DEV_PASSWORD) {
  const agent = request.agent(app);
  const res = await agent.post("/api/auth/login").send({ email, password });
  expect(res.status).toBe(200);
  return agent;
}

export async function userId(email: string): Promise<number> {
  const user = await getPrisma().user.findUniqueOrThrow({ where: { email } });
  return user.id;
}

/** Creates a fresh ticket owned by the given Requester through the real API. */
export async function createTicket(requesterEmail = USERS.requester, summary = `L4-TEST ${Date.now()}`) {
  const agent = await loginAs(requesterEmail);
  const prisma = getPrisma();
  const category = await prisma.category.findFirstOrThrow();
  const relatedSystem = await prisma.relatedSystem.findFirstOrThrow();
  const res = await agent.post("/api/tickets").send({
    categoryId: category.id, relatedSystemId: relatedSystem.id,
    summary, description: "Created by a Lab 4 API test.", requestedPriority: "MEDIUM",
  });
  expect(res.status).toBe(201);
  return res.body as { id: number; createdAt: string; updatedAt: string };
}

/** Creates a throwaway active user that has no tickets or actions (for empty-state tests). Delete it afterwards. */
export async function createFreshUser(role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR", label: string) {
  const bcrypt = (await import("bcrypt")).default;
  const email = `test-${label}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@toktickit.test`;
  const user = await getPrisma().user.create({
    data: { name: `Fresh ${label}`, email, role, isActive: true, mustChangePassword: false, passwordHash: await bcrypt.hash(DEV_PASSWORD, 10) },
  });
  return { id: user.id, email };
}

/** Takes a fresh ticket owned by `requesterEmail` all the way to Resolved through the real API. */
export async function resolveNewTicket(requesterEmail = USERS.requester) {
  const staff = await loginAs(USERS.staff);
  const { id } = await createTicket(requesterEmail);
  const version = async () => (await staff.get(`/api/staff/tickets/${id}`)).body.version;
  await staff.patch(`/api/staff/tickets/${id}/owner`).send({ ownerId: await userId(USERS.staff) });
  expect((await staff.patch(`/api/staff/tickets/${id}/status`).send({ status: "IN_PROGRESS", expectedVersion: await version() })).status).toBe(200);
  const action = await staff.post(`/api/staff/tickets/${id}/actions`).send({ description: "Fixed it" });
  await staff.patch(`/api/staff/tickets/${id}/actions/${action.body.id}`).send({ expectedVersion: 1, status: "COMPLETED", result: "Done" });
  expect((await staff.patch(`/api/staff/tickets/${id}/status`).send({ status: "RESOLVED", expectedVersion: await version() })).status).toBe(200);
  return id;
}
