import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { getPrisma } from "../../src/prisma";

describe("POST /api/tickets", () => {
  it("creates a ticket with valid data (API-01)", async () => {
    const prisma = getPrisma();
    const requester = await prisma.user.findFirst({ where: { isActive: true } });
    const category = await prisma.category.findFirst();
    const relatedSystem = await prisma.relatedSystem.findFirst();

    const res = await request(app).post("/api/tickets").send({
      requesterId: requester!.id,
      categoryId: category!.id,
      relatedSystemId: relatedSystem!.id,
      summary: "Laptop battery drains quickly",
      description: "Battery drains fast even when idle.",
      requestedPriority: "MEDIUM",
    });

    expect(res.status).toBe(201);
    expect(res.body.ticketNumber).toMatch(/^TKT-\d{4}-\d+$/);
  });

  it("rejects empty summary (API-02)", async () => {
    const res = await request(app).post("/api/tickets").send({
      requesterId: 1, categoryId: 1, relatedSystemId: 1,
      summary: "", description: "valid description", requestedPriority: "LOW",
    });
    expect(res.status).toBe(400);
    expect(res.body.errors.summary).toBeDefined();
  });

  it("rejects invalid priority (API-03)", async () => {
    const res = await request(app).post("/api/tickets").send({
      requesterId: 1, categoryId: 1, relatedSystemId: 1,
      summary: "valid", description: "valid description", requestedPriority: "URGENT",
    });
    expect(res.status).toBe(400);
    expect(res.body.errors.requestedPriority).toBeDefined();
  });
});