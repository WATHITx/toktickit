import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

describe("GET /api/categories", () => {
  it("returns the seeded categories in id order", async () => {
    const res = await request(app).get("/api/categories");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(4);
    expect(res.body.map((category: { name: string }) => category.name)).toEqual([
      "Account and Access",
      "Hardware",
      "Software",
      "Network",
    ]);
  });
});
