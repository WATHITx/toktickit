import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { getPrisma } from "../../src/prisma";
import { loginAs, userId, createTicket, createFreshUser, USERS } from "./helpers";

// Independent SQL for each documented metric (docs/lab-04/api-spec.md, "GET /api/dashboard/staff").
const ACTIVE_SQL = "('NEW','OPEN','IN_PROGRESS','WAITING_FOR_REQUESTER','REOPENED')";
const STATUSES = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"];

const sql = <T = any>(query: string, ...params: unknown[]) => getPrisma().$queryRawUnsafe<T[]>(query, ...params);
const sqlCount = async (query: string, ...params: unknown[]) => (await sql<{ n: number }>(query, ...params))[0].n;

describe("GET /api/dashboard/staff", () => {
  let staff: any;
  let staffId: number;
  let fresh: { id: number; email: string };

  beforeAll(async () => {
    staffId = await userId(USERS.staff);
    staff = await loginAs(USERS.staff);
    // An unassigned HIGH ticket and a planned action assigned to Kevin, so the counts are not all zero
    const { id } = await createTicket();
    await staff.patch(`/api/staff/tickets/${id}/priority`).send({ itPriority: "HIGH" });
    await staff.post(`/api/staff/tickets/${id}/actions`).send({ description: "Plan the fix" });
    fresh = await createFreshUser("IT_STAFF", "empty-staff");
  });

  afterAll(async () => {
    await getPrisma().user.delete({ where: { id: fresh.id } });
  });

  it("calculates every metric and list exactly as documented (DASH-04, AC-13, BR-20)", async () => {
    const res = await staff.get("/api/dashboard/staff");
    expect(res.status).toBe(200);
    const body = res.body;

    expect(body.metrics).toEqual({
      unassigned: await sqlCount(`SELECT COUNT(*)::int AS n FROM "Ticket" WHERE "currentStatus"::text IN ${ACTIVE_SQL} AND "ticketOwnerId" IS NULL`),
      assignedToMe: await sqlCount(`SELECT COUNT(*)::int AS n FROM "Ticket" WHERE "currentStatus"::text IN ${ACTIVE_SQL} AND "ticketOwnerId" = $1`, staffId),
      myOpenActions: await sqlCount(`SELECT COUNT(*)::int AS n FROM "ActionTaken" WHERE "assigneeId" = $1 AND status::text = 'PLANNED'`, staffId),
    });
    expect(body.metrics.unassigned).toBeGreaterThan(0);
    expect(body.metrics.myOpenActions).toBeGreaterThan(0);

    const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]));
    for (const r of await sql<{ s: string; n: number }>(`SELECT "currentStatus"::text AS s, COUNT(*)::int AS n FROM "Ticket" GROUP BY 1`)) byStatus[r.s] = r.n;
    expect(body.byStatus).toEqual(byStatus);

    const byPriority: Record<string, number> = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    for (const r of await sql<{ p: string; n: number }>(
      `SELECT "itPriority"::text AS p, COUNT(*)::int AS n FROM "Ticket" WHERE "currentStatus"::text IN ${ACTIVE_SQL} GROUP BY 1`)) byPriority[r.p] = r.n;
    expect(body.byItPriority).toEqual(byPriority);

    const urgent = await sql<{ id: number }>(
      `SELECT id FROM "Ticket" WHERE "currentStatus"::text IN ${ACTIVE_SQL} AND "itPriority"::text = 'HIGH' ORDER BY "createdAt" ASC, id ASC LIMIT 5`);
    expect(body.urgent.map((t: any) => t.id)).toEqual(urgent.map((r) => r.id));

    const recent = await sql<{ id: number }>(`SELECT id FROM "Ticket" ORDER BY "updatedAt" DESC, id DESC LIMIT 5`);
    expect(body.recentlyUpdated.map((t: any) => t.id)).toEqual(recent.map((r) => r.id));

    const myActions = await sql<{ id: number }>(
      `SELECT id FROM "ActionTaken" WHERE "assigneeId" = $1 AND status::text = 'PLANNED' ORDER BY "actionAt" ASC, id ASC LIMIT 5`, staffId);
    expect(body.myOpenActionsList.map((a: any) => a.id)).toEqual(myActions.map((r) => r.id));
    expect(body.myOpenActionsList[0]).toEqual(expect.objectContaining({
      ticketId: expect.any(Number), ticketNumber: expect.any(String), description: expect.any(String), actionAt: expect.any(String),
    }));
  });

  it("drills down to Ticket Queue filters that return the same counts (DASH-05, AC-13, FR-15, FR-16)", async () => {
    const { metrics, byStatus, byItPriority } = (await staff.get("/api/dashboard/staff")).body;
    const total = async (query: string) => (await staff.get(`/api/staff/tickets?${query}`)).body.pagination.total;

    expect(await total("status=ACTIVE&ownership=unassigned")).toBe(metrics.unassigned);
    expect(await total("status=ACTIVE&ownership=mine")).toBe(metrics.assignedToMe);
    for (const s of STATUSES) expect(await total(`status=${s}`), s).toBe(byStatus[s]);
    for (const p of ["HIGH", "MEDIUM", "LOW"]) expect(await total(`status=ACTIVE&itPriority=${p}`), p).toBe(byItPriority[p]);
  });

  it("returns zeros, empty lists and at most 5 list items (DASH-06, AC-14, BR-22, BR-24)", async () => {
    const empty = await loginAs(fresh.email);
    const res = await empty.get("/api/dashboard/staff");
    expect(res.status).toBe(200);
    expect(res.body.metrics.assignedToMe).toBe(0);
    expect(res.body.metrics.myOpenActions).toBe(0);
    expect(res.body.myOpenActionsList).toEqual([]);
    expect(Object.keys(res.body.byStatus).sort()).toEqual([...STATUSES].sort());
    expect(Object.keys(res.body.byItPriority).sort()).toEqual(["HIGH", "LOW", "MEDIUM"]);
    for (const list of ["urgent", "recentlyUpdated", "myOpenActionsList"]) expect(res.body[list].length).toBeLessThanOrEqual(5);
  });

  it("adds user counts for Administrators only (DASH-07, FR-14)", async () => {
    expect((await staff.get("/api/dashboard/staff")).body.userCounts).toBeUndefined();

    const admin = await loginAs(USERS.admin);
    const res = await admin.get("/api/dashboard/staff");
    expect(res.status).toBe(200);
    const expected: Record<string, { active: number; inactive: number }> = {
      REQUESTER: { active: 0, inactive: 0 }, IT_STAFF: { active: 0, inactive: 0 }, ADMINISTRATOR: { active: 0, inactive: 0 },
    };
    for (const r of await sql<{ role: string; active: boolean; n: number }>(
      `SELECT role::text AS role, "isActive" AS active, COUNT(*)::int AS n FROM "User" GROUP BY 1, 2`)) {
      expected[r.role][r.active ? "active" : "inactive"] = r.n;
    }
    expect(res.body.userCounts).toEqual(expected);
  });

  it("rejects the wrong role on each dashboard and anonymous callers (SEC-04, AC-02, BR-21)", async () => {
    const requester = await loginAs(USERS.requester);
    expect((await requester.get("/api/dashboard/staff")).status).toBe(403);
    expect((await staff.get("/api/dashboard/requester")).status).toBe(403);
    expect((await request(app).get("/api/dashboard/staff")).status).toBe(401);
    expect((await request(app).get("/api/dashboard/requester")).status).toBe(401);
  });

  it("responds within the performance-smoke budget on seeded data (PERF-01)", async () => {
    const requester = await loginAs(USERS.requester);
    for (const [agent, path] of [[staff, "/api/dashboard/staff"], [requester, "/api/dashboard/requester"]] as const) {
      await agent.get(path); // warm up
      const started = performance.now();
      const res = await agent.get(path);
      const elapsed = performance.now() - started;
      expect(res.status).toBe(200);
      expect(elapsed, `${path} took ${Math.round(elapsed)} ms`).toBeLessThan(500);
    }
  });
});
