import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getPrisma } from "../../src/prisma";
import { loginAs, userId, createTicket, createFreshUser, resolveNewTicket, USERS } from "./helpers";

// Independent SQL for each documented metric (docs/lab-04/api-spec.md, "GET /api/dashboard/requester").
// The dashboard must return exactly these numbers (AC-02, BR-20, BR-21).
// Timestamps are stored as UTC without a time zone, so "now" is taken in UTC too (BR-19).
const ACTIVE_SQL = "('NEW','OPEN','IN_PROGRESS','WAITING_FOR_REQUESTER','REOPENED')";

async function sqlCount(sql: string, ...params: unknown[]) {
  const rows = await getPrisma().$queryRawUnsafe<{ n: number }[]>(sql, ...params);
  return rows[0].n;
}

describe("GET /api/dashboard/requester", () => {
  let requester: any;
  let requesterId: number;
  let fresh: { id: number; email: string };

  beforeAll(async () => {
    requesterId = await userId(USERS.requester);
    // Make sure every metric has something to count, and another Requester has tickets too
    await resolveNewTicket(USERS.requester);
    await createTicket(USERS.requester);
    await createTicket(USERS.otherRequester);
    requester = await loginAs(USERS.requester);
    fresh = await createFreshUser("REQUESTER", "empty-requester");
  });

  afterAll(async () => {
    await getPrisma().user.delete({ where: { id: fresh.id } });
  });

  it("returns only the authenticated Requester's tickets (DASH-01, AC-02, BR-21)", async () => {
    const res = await requester.get("/api/dashboard/requester");
    expect(res.status).toBe(200);
    expect(res.body.recentlyUpdated.length).toBeGreaterThan(0);

    const ids = res.body.recentlyUpdated.map((t: any) => t.id);
    const owners = await getPrisma().ticket.findMany({ where: { id: { in: ids } }, select: { requesterId: true } });
    expect(owners.every((t) => t.requesterId === requesterId)).toBe(true);
  });

  it("calculates every metric exactly as documented (DASH-02, FR-12, BR-18, BR-19)", async () => {
    const res = await requester.get("/api/dashboard/requester");
    expect(res.body.metrics).toEqual({
      openTickets: await sqlCount(
        `SELECT COUNT(*)::int AS n FROM "Ticket" WHERE "requesterId" = $1 AND "currentStatus"::text IN ${ACTIVE_SQL}`, requesterId),
      waitingForMe: await sqlCount(
        `SELECT COUNT(*)::int AS n FROM "Ticket" WHERE "requesterId" = $1 AND "currentStatus"::text = 'WAITING_FOR_REQUESTER'`, requesterId),
      recentlyResolved: await sqlCount(
        `SELECT COUNT(DISTINCT t.id)::int AS n FROM "Ticket" t JOIN "TicketStatusHistory" h ON h."ticketId" = t.id
         WHERE t."requesterId" = $1 AND h."toStatus"::text = 'RESOLVED' AND h."changedAt" >= (NOW() AT TIME ZONE 'UTC') - INTERVAL '7 days'`, requesterId),
    });
    expect(res.body.metrics.openTickets).toBeGreaterThan(0);
    expect(res.body.metrics.recentlyResolved).toBeGreaterThan(0);

    const latest = await getPrisma().$queryRawUnsafe<{ id: number }[]>(
      `SELECT id FROM "Ticket" WHERE "requesterId" = $1 ORDER BY "updatedAt" DESC, id DESC LIMIT 5`, requesterId);
    expect(res.body.recentlyUpdated.map((t: any) => t.id)).toEqual(latest.map((r) => r.id));
    expect(res.body.recentlyUpdated[0]).toEqual(expect.objectContaining({
      ticketNumber: expect.any(String), summary: expect.any(String), currentStatus: expect.any(String), updatedAt: expect.any(String),
    }));
  });

  it("drills down to My Tickets lists with the same counts (DASH-02, FR-15)", async () => {
    const { metrics } = (await requester.get("/api/dashboard/requester")).body;
    const total = async (status: string) => (await requester.get(`/api/tickets?status=${status}`)).body.pagination.total;
    expect(await total("ACTIVE")).toBe(metrics.openTickets);
    expect(await total("WAITING_FOR_REQUESTER")).toBe(metrics.waitingForMe);
    expect(await total("RECENTLY_RESOLVED")).toBe(metrics.recentlyResolved);
  });

  it("returns zeros and an empty list for a Requester with no tickets (DASH-03, AC-14, BR-22)", async () => {
    const empty = await loginAs(fresh.email);
    const res = await empty.get("/api/dashboard/requester");
    expect(res.status).toBe(200);
    expect(res.body.metrics).toEqual({ openTickets: 0, waitingForMe: 0, recentlyResolved: 0 });
    expect(res.body.recentlyUpdated).toEqual([]);
    expect(typeof res.body.generatedAt).toBe("string");
  });
});
