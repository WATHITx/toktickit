import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { getPrisma } from "../../src/prisma";

const RUN = Date.now();
const testEmail = (label: string) => `test-${label}-${RUN}@toktickit.test`;
const PASSWORD = "DevPass!123";

async function loginAs(email: string, password = PASSWORD) {
  const agent = request.agent(app);
  const res = await agent.post("/api/auth/login").send({ email, password });
  expect(res.status).toBe(200);
  return agent;
}

describe("Administrator User Management", () => {
  let adminAgent: any;
  let adminUserId: number;
  let createdUserId: number;

  beforeAll(async () => {
    adminAgent = await loginAs("admin@toktickit.test");
    const me = await adminAgent.get("/api/auth/me");
    adminUserId = me.body.id;
  });

  afterAll(async () => {
    const prisma = getPrisma();
    // Safety net: the last-admin test deactivates the seeded admin; always restore it.
    await prisma.user.update({ where: { id: adminUserId }, data: { isActive: true, role: "ADMINISTRATOR" } });
    await prisma.user.deleteMany({ where: { email: { contains: `-${RUN}@toktickit.test` } } });
  });

  it("rejects non-Administrator calling any admin endpoint (SEC-04)", async () => {
    const staffAgent = await loginAs("kevin.p@toktickit.test");
    expect((await staffAgent.get("/api/admin/users")).status).toBe(403);
    expect((await staffAgent.post("/api/admin/users").send({})).status).toBe(403);
    expect((await staffAgent.patch(`/api/admin/users/${adminUserId}`).send({ name: "x" })).status).toBe(403);
    expect((await staffAgent.patch(`/api/admin/users/${adminUserId}/reset-password`).send({})).status).toBe(403);
  });

  it("rejects an unauthenticated caller with 401", async () => {
    expect((await request(app).get("/api/admin/users")).status).toBe(401);
  });

  it("does not leak password hashes in the user list", async () => {
    const res = await adminAgent.get("/api/admin/users");
    expect(res.status).toBe(200);
    expect(res.body[0].passwordHash).toBeUndefined();
  });

  it("lists users with optional search and role filter (FR-14)", async () => {
    const search = await adminAgent.get("/api/admin/users?search=jennifer");
    expect(search.status).toBe(200);
    expect(search.body.length).toBeGreaterThanOrEqual(1);
    expect(search.body[0].email).toContain("jennifer");

    const byRole = await adminAgent.get("/api/admin/users?role=ADMINISTRATOR");
    expect(byRole.status).toBe(200);
    expect(byRole.body.every((u: any) => u.role === "ADMINISTRATOR")).toBe(true);
  });

  it("creates a user with one permitted role (FR-15)", async () => {
    const res = await adminAgent.post("/api/admin/users").send({
      name: "TEST-USER-ADMIN", email: testEmail("created"),
      role: "IT_STAFF", isActive: true, initialPassword: "TempPass!99",
    });
    expect(res.status).toBe(201);
    expect(res.body.role).toBe("IT_STAFF");
    expect(res.body.passwordHash).toBeUndefined();
    createdUserId = res.body.id;
  });

  it("forces the new user to change password at first login", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: testEmail("created"), password: "TempPass!99" });
    expect(res.status).toBe(200);
    expect(res.body.mustChangePassword).toBe(true);
  });

  it("rejects duplicate email on create (AC-12, BR-10)", async () => {
    const res = await adminAgent.post("/api/admin/users").send({
      name: "Duplicate Test", email: "jennifer.a@toktickit.test",
      role: "REQUESTER", isActive: true, initialPassword: "TempPass!99",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already exists/i);
  });

  it("rejects duplicate email that differs only by case (BR-10)", async () => {
    const res = await adminAgent.post("/api/admin/users").send({
      name: "Case Test", email: "JENNIFER.A@toktickit.test",
      role: "REQUESTER", isActive: true, initialPassword: "TempPass!99",
    });
    expect(res.status).toBe(400);
  });

  it("rejects weak initial password and invalid role on create (BR-08)", async () => {
    const weak = await adminAgent.post("/api/admin/users").send({
      name: "Weak Pass Test", email: testEmail("weak"),
      role: "REQUESTER", isActive: true, initialPassword: "weak",
    });
    expect(weak.status).toBe(400);

    const badRole = await adminAgent.post("/api/admin/users").send({
      name: "Bad Role", email: testEmail("badrole"),
      role: "SUPERUSER", isActive: true, initialPassword: "TempPass!99",
    });
    expect(badRole.status).toBe(400);
  });

  it("edits a user's name, email, role, and activation state (FR-16)", async () => {
    const res = await adminAgent.patch(`/api/admin/users/${createdUserId}`).send({
      name: "Updated Name", email: testEmail("renamed"), role: "REQUESTER", isActive: false,
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: "Updated Name", email: testEmail("renamed"), role: "REQUESTER", isActive: false });
  });

  it("rejects editing a user's email to one already in use (BR-10)", async () => {
    const res = await adminAgent.patch(`/api/admin/users/${createdUserId}`).send({ email: "jennifer.a@toktickit.test" });
    expect(res.status).toBe(400);
  });

  it("returns 404 when editing a user that does not exist", async () => {
    expect((await adminAgent.patch("/api/admin/users/999999").send({ name: "x" })).status).toBe(404);
  });

  it("resets a user's password and flags mustChangePassword (FR-17)", async () => {
    const prisma = getPrisma();
    await prisma.user.update({ where: { id: createdUserId }, data: { isActive: true, mustChangePassword: false } });

    const weak = await adminAgent.patch(`/api/admin/users/${createdUserId}/reset-password`).send({ newInitialPassword: "weak" });
    expect(weak.status).toBe(400);

    const res = await adminAgent.patch(`/api/admin/users/${createdUserId}/reset-password`).send({ newInitialPassword: "NewTemp!88" });
    expect(res.status).toBe(200);
    expect((await prisma.user.findUnique({ where: { id: createdUserId } }))!.mustChangePassword).toBe(true);

    const login = await request(app).post("/api/auth/login").send({ email: testEmail("renamed"), password: "NewTemp!88" });
    expect(login.status).toBe(200);
  });

  it("prevents an admin from deactivating their own account (AC-10, BR-17)", async () => {
    const res = await adminAgent.patch(`/api/admin/users/${adminUserId}`).send({ isActive: false });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/own account/i);
  });

  it("prevents removing the last active Administrator (AC-11, BR-18)", async () => {
    const prisma = getPrisma();

    // Create a second admin, sign in as them, then let them deactivate the seeded admin (allowed: two active admins).
    const created = await adminAgent.post("/api/admin/users").send({
      name: "TEST-SECOND-ADMIN", email: testEmail("admin2"),
      role: "ADMINISTRATOR", isActive: true, initialPassword: "TempPass!99",
    });
    expect(created.status).toBe(201);
    const secondAgent = await loginAs(testEmail("admin2"), "TempPass!99");

    const deactivateFirst = await secondAgent.patch(`/api/admin/users/${adminUserId}`).send({ isActive: false });
    expect(deactivateFirst.status).toBe(200);
    expect(await prisma.user.count({ where: { role: "ADMINISTRATOR", isActive: true } })).toBe(1);

    // The second admin is now the last active Administrator; demoting themself must be blocked (BR-18).
    const demote = await secondAgent.patch(`/api/admin/users/${created.body.id}`).send({ role: "IT_STAFF" });
    expect(demote.status).toBe(400);
    expect(demote.body.error).toMatch(/last active administrator/i);

    // Self-deactivation is blocked as well (BR-17).
    const deactivateSelf = await secondAgent.patch(`/api/admin/users/${created.body.id}`).send({ isActive: false });
    expect(deactivateSelf.status).toBe(400);

    // Restore the seeded admin so later tests and other files are unaffected.
    const restore = await secondAgent.patch(`/api/admin/users/${adminUserId}`).send({ isActive: true });
    expect(restore.status).toBe(200);
  });
});
