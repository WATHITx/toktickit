import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";

describe("Authentication", () => {
  it("logs in with valid credentials (API-01)", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "jennifer.a@toktickit.test", password: "DevPass!123",
    });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("REQUESTER");
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  it("rejects wrong password with generic message (API-02)", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "jennifer.a@toktickit.test", password: "WrongPass!1",
    });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid email or password");
  });

  it("rejects unknown email with identical generic message (API-03)", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "nobody@toktickit.test", password: "DevPass!123",
    });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid email or password");
  });

  it("rejects login to inactive account (API-04)", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "inactive.req@toktickit.test", password: "DevPass!123",
    });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid email or password");
  });

  it("rejects /auth/me without a session (API-06)", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns current user identity when authenticated (API-07)", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({
      email: "jennifer.a@toktickit.test", password: "DevPass!123",
    });
    const res = await agent.get("/api/auth/me");
    expect(res.status).toBe(200);
    expect(res.body.email).toBe("jennifer.a@toktickit.test");
  });

  it("rejects weak new password on change-password (API-09)", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({
      email: "jennifer.a@toktickit.test", password: "DevPass!123",
    });
    const res = await agent.post("/api/auth/change-password").send({
      currentPassword: "DevPass!123", newPassword: "weak",
    });
    expect(res.status).toBe(400);
  });
});
