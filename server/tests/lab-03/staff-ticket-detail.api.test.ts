import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { getPrisma } from "../../src/prisma";

describe("IT Staff Ticket Detail operations", () => {
  let staffAgent: any;
  let staffUserId: number;
  let ticketId: number;

  beforeAll(async () => {
    staffAgent = request.agent(app);
    await staffAgent.post("/api/auth/login").send({ email: "kevin.p@toktickit.test", password: "DevPass!123" });
    const me = await staffAgent.get("/api/auth/me");
    staffUserId = me.body.id;

    const requesterAgent = request.agent(app);
    await requesterAgent.post("/api/auth/login").send({ email: "jennifer.a@toktickit.test", password: "DevPass!123" });
    const prisma = getPrisma();
    const category = await prisma.category.findFirst();
    const relatedSystem = await prisma.relatedSystem.findFirst();
    const createRes = await requesterAgent.post("/api/tickets").send({
      categoryId: category!.id, relatedSystemId: relatedSystem!.id,
      summary: "TKT-TEST-STAFFDETAIL ticket", description: "d", requestedPriority: "MEDIUM",
    });
    ticketId = createRes.body.id;
  });

  it("allows IT Staff to claim an unassigned ticket (AC-08)", async () => {
    const res = await staffAgent.patch(`/api/staff/tickets/${ticketId}/owner`).send({ ownerId: staffUserId });
    expect(res.status).toBe(200);
    expect(res.body.ticketOwner.id).toBe(staffUserId);
  });

  it("rejects assigning owner to a non-staff user", async () => {
    const prisma = getPrisma();
    const requester = await prisma.user.findUnique({ where: { email: "jennifer.a@toktickit.test" } });
    const res = await staffAgent.patch(`/api/staff/tickets/${ticketId}/owner`).send({ ownerId: requester!.id });
    expect(res.status).toBe(400);
  });

  it("allows IT Staff to set IT Priority without changing Requested Priority (BR-12)", async () => {
    const res = await staffAgent.patch(`/api/staff/tickets/${ticketId}/priority`).send({ itPriority: "HIGH" });
    expect(res.status).toBe(200);
    expect(res.body.itPriority).toBe("HIGH");
    expect(res.body.requestedPriority).toBe("MEDIUM"); // ไม่เปลี่ยน
  });

  it("rejects an invalid status transition (AC-09, BR-13)", async () => {
    // ticket ตอนนี้อยู่ NEW (ยังไม่เคยเปลี่ยน status)
    const res = await staffAgent.patch(`/api/staff/tickets/${ticketId}/status`).send({ status: "CLOSED" });
    expect(res.status).toBe(400);
  });

  it("allows a valid status transition NEW to OPEN", async () => {
    const res = await staffAgent.patch(`/api/staff/tickets/${ticketId}/status`).send({ status: "OPEN" });
    expect(res.status).toBe(200);
    expect(res.body.currentStatus).toBe("OPEN");
  });

  it("rejects empty Internal Note content (BR-15)", async () => {
    const res = await staffAgent.post(`/api/staff/tickets/${ticketId}/notes`).send({ content: "   " });
    expect(res.status).toBe(400);
  });

  it("allows IT Staff to create and read an Internal Note", async () => {
    const createRes = await staffAgent.post(`/api/staff/tickets/${ticketId}/notes`).send({ content: "Escalated to network team." });
    expect(createRes.status).toBe(201);

    const listRes = await staffAgent.get(`/api/staff/tickets/${ticketId}/notes`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.length).toBeGreaterThanOrEqual(1);
  });

  it("rejects a Requester requesting Internal Notes without exposing content (AC-04, SEC-02)", async () => {
    const requesterAgent = request.agent(app);
    await requesterAgent.post("/api/auth/login").send({ email: "jennifer.a@toktickit.test", password: "DevPass!123" });
    const res = await requesterAgent.get(`/api/staff/tickets/${ticketId}/notes`);
    expect(res.status).toBe(403);
    expect(res.body.content).toBeUndefined();
    expect(Array.isArray(res.body)).toBe(false); // ไม่ leak array ของ note ออกไปเลย
  });

  it("rejects a Requester posting an Internal Note directly (SEC-05)", async () => {
    const requesterAgent = request.agent(app);
    await requesterAgent.post("/api/auth/login").send({ email: "jennifer.a@toktickit.test", password: "DevPass!123" });
    const res = await requesterAgent.post(`/api/staff/tickets/${ticketId}/notes`).send({ content: "trying to sneak a note in" });
    expect(res.status).toBe(403);
  });

  it("returns a single ticket to IT Staff with requester and owner", async () => {
    const res = await staffAgent.get(`/api/staff/tickets/${ticketId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(ticketId);
    expect(res.body.requester.name).toBeDefined();
  });

  it("returns 404 for a missing ticket and 403 for a Requester on staff detail", async () => {
    const missing = await staffAgent.get("/api/staff/tickets/999999");
    expect(missing.status).toBe(404);

    const requesterAgent = request.agent(app);
    await requesterAgent.post("/api/auth/login").send({ email: "jennifer.a@toktickit.test", password: "DevPass!123" });
    const res = await requesterAgent.get(`/api/staff/tickets/${ticketId}`);
    expect(res.status).toBe(403);
  });

  it("lists only active staff users for the owner dropdown and blocks Requesters", async () => {
    const res = await staffAgent.get("/api/staff/users");
    expect(res.status).toBe(200);
    expect(res.body.some((u: any) => u.id === staffUserId)).toBe(true);

    const requesterAgent = request.agent(app);
    await requesterAgent.post("/api/auth/login").send({ email: "jennifer.a@toktickit.test", password: "DevPass!123" });
    expect((await requesterAgent.get("/api/staff/users")).status).toBe(403);
  });

  it("allows IT Staff to unassign the owner", async () => {
    const res = await staffAgent.patch(`/api/staff/tickets/${ticketId}/owner`).send({ ownerId: null });
    expect(res.status).toBe(200);
    expect(res.body.ticketOwner).toBeNull();
  });
});
