import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { getPrisma } from "../../src/prisma";

describe("POST /api/tickets", () => {
  it("creates a ticket with valid data (API-01)", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: "jennifer.a@toktickit.test", password: "DevPass!123" });

    const prisma = getPrisma();
    const category = await prisma.category.findFirst();
    const relatedSystem = await prisma.relatedSystem.findFirst();

    const res = await agent.post("/api/tickets").send({
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
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: "jennifer.a@toktickit.test", password: "DevPass!123" });

    const prisma = getPrisma();
    const category = await prisma.category.findFirst();
    const relatedSystem = await prisma.relatedSystem.findFirst();

    const res = await agent.post("/api/tickets").send({
      categoryId: category!.id, relatedSystemId: relatedSystem!.id,
      summary: "", description: "valid description", requestedPriority: "LOW",
    });
    expect(res.status).toBe(400);
    expect(res.body.errors.summary).toBeDefined();
  });

  it("rejects invalid priority (API-03)", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: "jennifer.a@toktickit.test", password: "DevPass!123" });

    const prisma = getPrisma();
    const category = await prisma.category.findFirst();
    const relatedSystem = await prisma.relatedSystem.findFirst();

    const res = await agent.post("/api/tickets").send({
      categoryId: category!.id, relatedSystemId: relatedSystem!.id,
      summary: "valid", description: "valid description", requestedPriority: "URGENT",
    });
    expect(res.status).toBe(400);
    expect(res.body.errors.requestedPriority).toBeDefined();
  });
});