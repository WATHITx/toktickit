import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { getPrisma } from "../../src/prisma";

describe("GET /api/staff/tickets (Ticket Queue)", () => {
  let staffAgent: any;
  let requesterAgent: any;
  let staffUserId: number;

  beforeAll(async () => {
    staffAgent = request.agent(app);
    await staffAgent.post("/api/auth/login").send({ email: "kevin.p@toktickit.test", password: "DevPass!123" });

    requesterAgent = request.agent(app);
    await requesterAgent.post("/api/auth/login").send({ email: "jennifer.a@toktickit.test", password: "DevPass!123" });

    const me = await staffAgent.get("/api/auth/me");
    staffUserId = me.body.id;

    // สร้าง test ticket ไว้ค้นหา
    const prisma = getPrisma();
    const category = await prisma.category.findFirst();
    const relatedSystem = await prisma.relatedSystem.findFirst();
    await requesterAgent.post("/api/tickets").send({
      categoryId: category!.id, relatedSystemId: relatedSystem!.id,
      summary: "TKT-TEST-QUEUE searchable ticket", description: "d", requestedPriority: "HIGH",
    });
  });

  it("rejects Requester access to the staff queue (SEC-03)", async () => {
    const res = await requesterAgent.get("/api/staff/tickets");
    expect(res.status).toBe(403);
  });

  it("rejects unauthenticated access", async () => {
    const res = await request(app).get("/api/staff/tickets");
    expect(res.status).toBe(401);
  });

  it("allows IT Staff to see tickets from all Requesters", async () => {
    const res = await staffAgent.get("/api/staff/tickets");
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it("filters by search term matching summary", async () => {
    const res = await staffAgent.get("/api/staff/tickets?search=TKT-TEST-QUEUE");
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].summary).toContain("TKT-TEST-QUEUE");
  });

  it("filters by unassigned ownership", async () => {
    const res = await staffAgent.get("/api/staff/tickets?ownership=unassigned&search=TKT-TEST-QUEUE");
    expect(res.status).toBe(200);
    res.body.data.forEach((t: any) => expect(t.ticketOwner).toBeNull());
  });

  it("filters by IT Priority", async () => {
    const res = await staffAgent.get("/api/staff/tickets?itPriority=HIGH&search=TKT-TEST-QUEUE");
    expect(res.status).toBe(200);
    res.body.data.forEach((t: any) => expect(t.itPriority).toBe("HIGH"));
  });

  it("falls back to default sort on invalid sortBy (BR-10 pattern from Lab 2)", async () => {
    const res = await staffAgent.get("/api/staff/tickets?sortBy=nonsense");
    expect(res.status).toBe(200); // ไม่ error แม้ sortBy จะแปลก
  });

  it("paginates the queue (API-10)", async () => {
    const res = await staffAgent.get("/api/staff/tickets?page=1&pageSize=2");
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(2);
    expect(res.body.pagination).toMatchObject({ page: 1, pageSize: 2 });
    expect(res.body.pagination.totalPages).toBe(Math.ceil(res.body.pagination.total / 2));
  });
});
