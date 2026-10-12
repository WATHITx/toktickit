import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { loginAs, USERS } from "./helpers";

// Final hardening (FR-18): the start-up session check never produces an error response,
// while /auth/me keeps its Lab 3 contract.
describe("GET /api/auth/session", () => {
  it("answers 200 with a null user when signed out or the cookie is invalid", async () => {
    const anon = await request(app).get("/api/auth/session");
    expect(anon.status).toBe(200);
    expect(anon.body).toEqual({ user: null });

    const tampered = await request(app).get("/api/auth/session").set("Cookie", "toktickit_session=not-a-real-token");
    expect(tampered.status).toBe(200);
    expect(tampered.body).toEqual({ user: null });
  });

  it("returns the same identity as /auth/me when signed in, without the password hash", async () => {
    const agent = await loginAs(USERS.staff);
    const session = await agent.get("/api/auth/session");
    const me = await agent.get("/api/auth/me");
    expect(session.status).toBe(200);
    expect(session.body.user).toEqual(me.body);
    expect(session.body.user.passwordHash).toBeUndefined();
  });

  it("leaves /auth/me returning 401 without a session (Lab 3 API-06)", async () => {
    expect((await request(app).get("/api/auth/me")).status).toBe(401);
  });
});
