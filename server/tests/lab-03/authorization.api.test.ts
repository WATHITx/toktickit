import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { getPrisma } from "../../src/prisma";

describe("Requester ownership from authenticated identity", () => {
  it("ignores a client-supplied requesterId and uses the authenticated identity (AC-03, SEC-01)", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({
      email: "jennifer.a@toktickit.test", password: "DevPass!123",
    });

    const prisma = getPrisma();
    const category = await prisma.category.findFirst();
    const relatedSystem = await prisma.relatedSystem.findFirst();

    const res = await agent.post("/api/tickets").send({
      requesterId: 9999, // fake — server must ignore
      categoryId: category!.id,
      relatedSystemId: relatedSystem!.id,
      summary: "AC-03 test ticket",
      description: "Testing that fake requesterId is ignored",
      requestedPriority: "LOW",
    });

    expect(res.status).toBe(201);

    const jennifer = await prisma.user.findUnique({ where: { email: "jennifer.a@toktickit.test" } });
    expect(res.body.requesterId).toBe(jennifer!.id);
    expect(res.body.requesterId).not.toBe(9999);
  });

  it("does not return another Requester's ticket even if ID is guessed (AC-03)", async () => {
    const prisma = getPrisma();
    const otherUser = await prisma.user.findFirst({ where: { email: { not: "jennifer.a@toktickit.test" }, isActive: true, role: "REQUESTER" } });
    const otherAgent = request.agent(app);
    await otherAgent.post("/api/auth/login").send({ email: otherUser!.email, password: "DevPass!123" });
    const category = await prisma.category.findFirst();
    const relatedSystem = await prisma.relatedSystem.findFirst();
    const createRes = await otherAgent.post("/api/tickets").send({
      categoryId: category!.id, relatedSystemId: relatedSystem!.id,
      summary: "Private ticket", description: "d", requestedPriority: "LOW",
    });
    expect(createRes.status).toBe(201);
    const ticketId = createRes.body.id;

    const jenniferAgent = request.agent(app);
    await jenniferAgent.post("/api/auth/login").send({
      email: "jennifer.a@toktickit.test", password: "DevPass!123",
    });
    const res = await jenniferAgent.get(`/api/tickets/${ticketId}`);

    expect(res.status).toBe(403);
  });
});
