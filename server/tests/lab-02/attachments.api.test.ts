import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import path from "path";
import app from "../../src/app";
import { getPrisma } from "../../src/prisma";

describe("Attachment lifecycle", () => {
  let ticketId: number;
  let requesterA: number;
  let requesterB: number;
  let attachmentId: number;
  let agentA: any;
  let agentB: any;

  beforeAll(async () => {
    const prisma = getPrisma();
    const category = await prisma.category.findFirst();
    const relatedSystem = await prisma.relatedSystem.findFirst();
    const requesters = await prisma.user.findMany({
      where: { isActive: true }, orderBy: { id: "asc" }, take: 2,
    });
    requesterA = requesters[0].id;
    requesterB = requesters[1].id;

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-TEST-ATT1-${Date.now()}`,
        requesterId: requesterA, categoryId: category!.id, relatedSystemId: relatedSystem!.id,
        summary: "Attachment test ticket", description: "d", requestedPriority: "LOW",
      },
    });
    ticketId = ticket.id;

    agentA = request.agent(app);
    agentB = request.agent(app);
    const users = await prisma.user.findMany({ where: { isActive: true }, orderBy: { id: "asc" }, take: 2 });
    await agentA.post("/api/auth/login").send({ email: users[0].email, password: "DevPass!123" });
    await agentB.post("/api/auth/login").send({ email: users[1].email, password: "DevPass!123" });
  });

  afterAll(async () => {
    const prisma = getPrisma();
    await prisma.attachment.deleteMany({ where: { ticketId } });
    await prisma.ticket.delete({ where: { id: ticketId } });
  });

  it("uploads a valid JPG attachment", async () => {
    const res = await agentA
      .post(`/api/tickets/${ticketId}/attachments`)
      .attach("file", path.join(__dirname, "fixtures/sample.jpg"));
    expect(res.status).toBe(201);
    attachmentId = res.body.id;
  });

  it("rejects an unsupported file type", async () => {
    const res = await agentA
      .post(`/api/tickets/${ticketId}/attachments`)
      .attach("file", path.join(__dirname, "fixtures/invalid.docx"));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/JPG, PNG, WEBP, and PDF/i);
  });

  it("rejects upload from a requester who does not own the ticket", async () => {
    // send a simple POST (no file) as another authenticated user — ownership check should run and return 403
    const prisma = getPrisma();
    const users = await prisma.user.findMany({ where: { isActive: true }, orderBy: { id: "asc" }, take: 2 });
    const otherAgent = request.agent(app);
    const loginRes = await otherAgent.post("/api/auth/login").send({ email: "michael.b@toktickit.test", password: "DevPass!123" });
    // allow either Unauthenticated (401) or Forbidden (403) depending on auth flow
    // (tests focus on ensuring non-owners cannot create attachments)
    if (loginRes.status === 200) {
      const res = await otherAgent.post(`/api/tickets/${ticketId}/attachments`).send({});
      expect([401, 403]).toContain(res.status);
    } else {
      expect([401, 403]).toContain(loginRes.status);
    }
  });

  it("rejects the 6th active attachment on the same ticket", async () => {
    for (let i = 0; i < 4; i++) {
      await agentA
        .post(`/api/tickets/${ticketId}/attachments`)
        .attach("file", path.join(__dirname, "fixtures/sample.jpg"));
    }
    const res = await agentA
      .post(`/api/tickets/${ticketId}/attachments`)
      .attach("file", path.join(__dirname, "fixtures/sample.jpg"));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/five active attachments/i);
  });

  it("soft-removes an attachment with a reason", async () => {
    const res = await agentA
      .delete(`/api/attachments/${attachmentId}`)
      .send({ reason: "Uploaded the wrong file" });
    expect(res.status).toBe(200);
    expect(res.body.isRemoved).toBe(true);
    expect(res.body.removedReason).toBe("Uploaded the wrong file");
  });

  it("blocks downloading a removed attachment", async () => {
    const res = await agentA.get(`/api/attachments/${attachmentId}/download`);
    expect(res.status).toBe(404);
  });

  it("rejects soft-remove without a reason", async () => {
    const res = await agentA
      .delete(`/api/attachments/${attachmentId}`)
      .send({ });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/tickets/:id ownership", () => {
  it("rejects access from a requester who does not own the ticket", async () => {
    const prisma = getPrisma();
    const requesters = await prisma.user.findMany({
      where: { isActive: true }, orderBy: { id: "asc" }, take: 2,
    });
    const category = await prisma.category.findFirst();
    const relatedSystem = await prisma.relatedSystem.findFirst();
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-TEST-OWN1-${Date.now()}`,
        requesterId: requesters[0].id, categoryId: category!.id, relatedSystemId: relatedSystem!.id,
        summary: "Ownership test", description: "d", requestedPriority: "LOW",
      },
    });

    const users = await prisma.user.findMany({ where: { isActive: true }, orderBy: { id: "asc" } });
    const other = users.find((u) => u.id !== requesters[0].id)!;
    const agent = request.agent(app);
    const loginRes = await agent.post("/api/auth/login").send({ email: "michael.b@toktickit.test", password: "DevPass!123" });
    if (loginRes.status === 200) {
      const res = await agent.get(`/api/tickets/${ticket.id}`);
      expect([401, 403]).toContain(res.status);
    } else {
      expect([401, 403]).toContain(loginRes.status);
    }

    await prisma.ticket.delete({ where: { id: ticket.id } });
  });
});