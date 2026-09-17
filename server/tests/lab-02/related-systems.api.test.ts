import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";

describe("GET /api/related-systems", () => {
  it("returns active related systems with id and name", async () => {
    const res = await request(app).get("/api/related-systems");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    const firstItem = res.body[0];
    expect(firstItem).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        name: expect.any(String),
      })
    );

    const names = res.body.map((system: any) => system.name);
    expect(names).toContain("Email");
    expect(names).toContain("Campus Wi-Fi");
    expect([...names].sort()).toEqual(names);
  });
});
