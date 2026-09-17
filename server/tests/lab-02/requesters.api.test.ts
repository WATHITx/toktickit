import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";

describe("GET /api/requesters", () => {
  it("returns only active requesters", async () => {
    const res = await request(app).get("/api/requesters");
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(4);
    const names = res.body.map((r: any) => r.name);
    expect(names).not.toContain("Inactive Test User");
  });
});