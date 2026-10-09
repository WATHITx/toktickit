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
