import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { getPrisma } from "../../src/prisma";

describe("GET /api/tickets", () => {
  let requesterA: number;
  let requesterB: number;

  beforeAll(async () => {
    const prisma = getPrisma();
    const category = await prisma.category.findFirst();
    const relatedSystem = await prisma.relatedSystem.findFirst();
    const requesters = await prisma.user.findMany({ where: { isActive: true }, orderBy: { id: "asc" }, take: 2 });
    requesterA = requesters[0].id;
    requesterB = requesters[1].id;
    // create tickets for requester A and B
    await prisma.ticket.createMany({
      data: [
        { ticketNumber: "TKT-TEST-MYT-A1", requesterId: requesterA, categoryId: category!.id, relatedSystemId: relatedSystem!.id, summary: "A ticket one about printer", description: "d", requestedPriority: "LOW" },
        { ticketNumber: "TKT-TEST-MYT-A2", requesterId: requesterA, categoryId: category!.id, relatedSystemId: relatedSystem!.id, summary: "A ticket two", description: "d", requestedPriority: "HIGH" },
        { ticketNumber: "TKT-TEST-MYT-B1", requesterId: requesterB, categoryId: category!.id, relatedSystemId: relatedSystem!.id, summary: "B ticket one", description: "d", requestedPriority: "LOW" },
      ],
    });
  });

  afterAll(async () => {
    const prisma = getPrisma();
    await prisma.ticket.deleteMany({ where: { ticketNumber: { startsWith: "TKT-TEST-MYT-" } } });
  });

  it("returns only tickets owned by the authenticated requester", async () => {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { id: requesterA } });
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: user!.email, password: "DevPass!123" });

    const res = await agent.get(`/api/tickets?search=TKT-TEST-MYT`);
    expect(res.status).toBe(200);
    const numbers = res.body.data.map((t: any) => t.ticketNumber);
    expect(numbers).toContain("TKT-TEST-MYT-A1");
    expect(numbers).toContain("TKT-TEST-MYT-A2");
    expect(numbers).not.toContain("TKT-TEST-MYT-B1");
  });

  it("filters by search term matching summary", async () => {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { id: requesterA } });
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: user!.email, password: "DevPass!123" });

    const res = await agent.get(`/api/tickets?search=TKT-TEST-MYT-A1`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].ticketNumber).toBe("TKT-TEST-MYT-A1");
  });

  it("paginates results correctly", async () => {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { id: requesterA } });
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: user!.email, password: "DevPass!123" });

    const res = await agent.get(`/api/tickets?search=TKT-TEST-MYT&page=1&pageSize=1`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.pagination.total).toBe(2);
    expect(res.body.pagination.totalPages).toBe(2);
  });

  it("requires authentication", async () => {
    const res = await request(app).get("/api/tickets");
    expect(res.status).toBe(401);
  });
});