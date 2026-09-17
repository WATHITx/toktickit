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
        ticketNumber: "TKT-TEST-ATT1",
        requesterId: requesterA, categoryId: category!.id, relatedSystemId: relatedSystem!.id,
        summary: "Attachment test ticket", description: "d", requestedPriority: "LOW",
      },
    });
    ticketId = ticket.id;
  });

  afterAll(async () => {
    const prisma = getPrisma();
    await prisma.attachment.deleteMany({ where: { ticketId } });
    await prisma.ticket.delete({ where: { id: ticketId } });
  });

  it("uploads a valid JPG attachment", async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .field("requesterId", String(requesterA))
      .attach("file", path.join(__dirname, "fixtures/sample.jpg"));
    expect(res.status).toBe(201);
    attachmentId = res.body.id;
  });

  it("rejects an unsupported file type", async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .field("requesterId", String(requesterA))
      .attach("file", path.join(__dirname, "fixtures/invalid.docx"));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/JPG, PNG, WEBP, and PDF/i);
  });

  it("rejects upload from a requester who does not own the ticket", async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .field("requesterId", String(requesterB))
      .attach("file", path.join(__dirname, "fixtures/sample.jpg"));
    expect(res.status).toBe(403);
  });

  it("rejects the 6th active attachment on the same ticket", async () => {
    // อัปโหลดเพิ่มให้ครบ 5 (มี 1 แล้วจากเทสแรก อัปอีก 4)
    for (let i = 0; i < 4; i++) {
      await request(app)
        .post(`/api/tickets/${ticketId}/attachments`)
        .field("requesterId", String(requesterA))
        .attach("file", path.join(__dirname, "fixtures/sample.jpg"));
    }
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .field("requesterId", String(requesterA))
      .attach("file", path.join(__dirname, "fixtures/sample.jpg"));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/five active attachments/i);
  });

  it("soft-removes an attachment with a reason", async () => {
    const res = await request(app)
      .delete(`/api/attachments/${attachmentId}`)
      .send({ requesterId: requesterA, reason: "Uploaded the wrong file" });
    expect(res.status).toBe(200);
    expect(res.body.isRemoved).toBe(true);
    expect(res.body.removedReason).toBe("Uploaded the wrong file");
  });

  it("blocks downloading a removed attachment", async () => {
    const res = await request(app).get(`/api/attachments/${attachmentId}/download`);
    expect(res.status).toBe(404);
  });

  it("rejects soft-remove without a reason", async () => {
    const res = await request(app)
      .delete(`/api/attachments/${attachmentId}`)
      .send({ requesterId: requesterA });
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
        ticketNumber: "TKT-TEST-OWN1",
        requesterId: requesters[0].id, categoryId: category!.id, relatedSystemId: relatedSystem!.id,
        summary: "Ownership test", description: "d", requestedPriority: "LOW",
      },
    });

    const res = await request(app).get(`/api/tickets/${ticket.id}?requesterId=${requesters[1].id}`);
    expect(res.status).toBe(403);

    await prisma.ticket.delete({ where: { id: ticket.id } });
  });
});