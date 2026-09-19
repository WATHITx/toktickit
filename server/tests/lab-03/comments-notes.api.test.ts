import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { getPrisma } from "../../src/prisma";

describe("Public Comments", () => {
  it("allows the ticket owner to post and read a comment", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: "jennifer.a@toktickit.test", password: "DevPass!123" });

    const prisma = getPrisma();
    const category = await prisma.category.findFirst();
    const relatedSystem = await prisma.relatedSystem.findFirst();
    const createRes = await agent.post("/api/tickets").send({
      categoryId: category!.id, relatedSystemId: relatedSystem!.id,
      summary: "Comment test ticket", description: "d", requestedPriority: "LOW",
    });
    const ticketId = createRes.body.id;

    const commentRes = await agent.post(`/api/tickets/${ticketId}/comments`).send({
      content: "Still seeing this issue.",
    });
    expect(commentRes.status).toBe(201);

    const listRes = await agent.get(`/api/tickets/${ticketId}/comments`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.length).toBe(1);
  });

  it("rejects empty comment content", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: "jennifer.a@toktickit.test", password: "DevPass!123" });
    const res = await agent.post("/api/tickets/1/comments").send({ content: "   " });
    expect(res.status).toBe(400);
  });

  it("allows IT Staff to see a Requester's public comments", async () => {
    const staffAgent = request.agent(app);
    await staffAgent.post("/api/auth/login").send({ email: "kevin.p@toktickit.test", password: "DevPass!123" });
    const prisma = getPrisma();
    let ticket = await prisma.ticket.findFirst();
    if (!ticket) {
      const user = await prisma.user.findFirst({ where: { isActive: true } });
      const category = await prisma.category.findFirst();
      const relatedSystem = await prisma.relatedSystem.findFirst();
      ticket = await prisma.ticket.create({
        data: { ticketNumber: `TKT-TEST-COMM-${Date.now()}`, requesterId: user!.id, categoryId: category!.id, relatedSystemId: relatedSystem!.id, summary: "t", description: "d", requestedPriority: "LOW" },
      });
    }

    const res = await staffAgent.get(`/api/tickets/${ticket.id}/comments`);
    expect(res.status).toBe(200);
  });
});

describe("Mark Problem Resolved", () => {
  it("allows the Requester to mark their own ticket as resolved (FR-08, BR-05)", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: "jennifer.a@toktickit.test", password: "DevPass!123" });

    const prisma = getPrisma();
    const category = await prisma.category.findFirst();
    const relatedSystem = await prisma.relatedSystem.findFirst();
    const createRes = await agent.post("/api/tickets").send({
      categoryId: category!.id, relatedSystemId: relatedSystem!.id,
      summary: "Resolve test", description: "d", requestedPriority: "LOW",
    });
    const ticketId = createRes.body.id;

    const res = await agent.patch(`/api/tickets/${ticketId}/mark-resolved`).send({});
    expect(res.status).toBe(200);
    expect(res.body.problemAppearsResolved).toBe(true);
    expect(res.body.currentStatus).toBe("NEW");
  });
});
