import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { getPrisma } from "../../src/prisma";
import { loginAs, userId, createTicket, USERS } from "./helpers";

describe("Actions Taken API", () => {
  let staff: any;
  let requester: any;
  let staffId: number;
  let otherStaffId: number;
  let ticketId: number;

  beforeAll(async () => {
    staff = await loginAs(USERS.staff);
    requester = await loginAs(USERS.requester);
    staffId = await userId(USERS.staff);
    otherStaffId = await userId(USERS.otherStaff);
    ticketId = (await createTicket()).id;
  });

  const create = (body: Record<string, unknown>, id = ticketId) =>
    staff.post(`/api/staff/tickets/${id}/actions`).send(body);

  it("creates a valid Action Taken under the correct Ticket and actor (API-01, AC-01)", async () => {
    const res = await create({ description: "Checked VPN client logs", result: "" });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      ticketId, description: "Checked VPN client logs", result: null, status: "PLANNED", version: 1,
      followUpRequired: false, followUpNote: null,
      performedBy: { id: staffId, name: "Kevin Patel" },
    });
    const saved = await getPrisma().actionTaken.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(saved.ticketId).toBe(ticketId);
    expect(saved.performedById).toBe(staffId);
  });

  it("ignores client-supplied performedById, ticketId, status and version (API-02, BR-04)", async () => {
    const otherTicket = await createTicket();
    const res = await create({
      description: "Spoof attempt", performedById: otherStaffId, ticketId: otherTicket.id, status: "COMPLETED", version: 9,
    });
    expect(res.status).toBe(201);
    expect(res.body.ticketId).toBe(ticketId);
    expect(res.body.performedBy.id).toBe(staffId);
    expect(res.body.status).toBe("PLANNED");
    expect(res.body.version).toBe(1);
  });

  it("defaults the assignee to the creator and accepts another active staff member (API-03, BR-02, BR-05)", async () => {
    const own = await create({ description: "Own work" });
    expect(own.body.assignee.id).toBe(staffId);

    const delegated = await create({ description: "Hand over to Emily", assigneeId: otherStaffId });
    expect(delegated.status).toBe(201);
    expect(delegated.body.assignee).toEqual({ id: otherStaffId, name: "Emily Davis" });
    expect(delegated.body.performedBy.id).toBe(staffId);
  });

  it("rejects an inactive or non-staff assignee and saves nothing (API-04, AC-04)", async () => {
    const before = await getPrisma().actionTaken.count({ where: { ticketId } });
    const inactive = await create({ description: "x", assigneeId: await userId(USERS.inactiveStaff) });
    const requesterAssignee = await create({ description: "x", assigneeId: await userId(USERS.requester) });
    const missing = await create({ description: "x", assigneeId: 999999 });

    for (const res of [inactive, requesterAssignee, missing]) {
      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION");
      expect(res.body.fields.assigneeId).toBeDefined();
    }
    expect(await getPrisma().actionTaken.count({ where: { ticketId } })).toBe(before);
  });

  it("requires a Follow-up Note when follow-up is required (API-05, AC-03)", async () => {
    const res = await create({ description: "Needs follow-up", followUpRequired: true });
    expect(res.status).toBe(400);
    expect(res.body.fields.followUpNote).toMatch(/required/i);

    const ok = await create({ description: "Needs follow-up", followUpRequired: true, followUpNote: "Call back Monday" });
    expect(ok.status).toBe(201);
    expect(ok.body.followUpNote).toBe("Call back Monday");
  });

  it("rejects invalid description, lengths and dates (API-06, BR-06, BR-08)", async () => {
    const ticket = await getPrisma().ticket.findUniqueOrThrow({ where: { id: ticketId } });
    const cases = [
      { description: "   " },
      { description: "x".repeat(2001) },
      { description: "ok", attachmentNotes: "a".repeat(501) },
      { description: "ok", actionAt: new Date(ticket.createdAt.getTime() - 60_000).toISOString() },
      { description: "ok", actionAt: new Date(Date.now() + 60 * 60_000).toISOString() },
    ];
    for (const body of cases) {
      const res = await create(body);
      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION");
    }
  });

  it("lists actions in stable chronological order (API-07, FR-03)", async () => {
    const ticket = await createTicket();
    const fresh = ticket.id;
    expect((await staff.get(`/api/staff/tickets/${fresh}/actions`)).body).toEqual([]);

    const base = new Date(ticket.createdAt).getTime(); // must not be before the ticket existed (BR-08)
    // Created out of order; two share the same timestamp to check the id tie-breaker
    const t2 = new Date(base + 2 * 60_000).toISOString();
    const t1 = new Date(base + 60_000).toISOString();
    await create({ description: "second", actionAt: t2 }, fresh);
    await create({ description: "first", actionAt: t1 }, fresh);
    await create({ description: "third", actionAt: t2 }, fresh);

    const res = await staff.get(`/api/staff/tickets/${fresh}/actions`);
    expect(res.status).toBe(200);
    expect(res.body.map((a: any) => a.description)).toEqual(["first", "second", "third"]);
  });

  it("edits a Planned action and completes it only with a Result (API-08, FR-04)", async () => {
    const action = (await create({ description: "Plan to replace cable" })).body;

    const edit = await staff.patch(`/api/staff/tickets/${ticketId}/actions/${action.id}`)
      .send({ expectedVersion: 1, description: "Replace network cable" });
    expect(edit.status).toBe(200);
    expect(edit.body).toMatchObject({ description: "Replace network cable", version: 2, status: "PLANNED" });

    const noResult = await staff.patch(`/api/staff/tickets/${ticketId}/actions/${action.id}`)
      .send({ expectedVersion: 2, status: "COMPLETED" });
    expect(noResult.status).toBe(400);
    expect(noResult.body.fields.result).toBeDefined();

    const done = await staff.patch(`/api/staff/tickets/${ticketId}/actions/${action.id}`)
      .send({ expectedVersion: 2, status: "COMPLETED", result: "Link is stable" });
    expect(done.status).toBe(200);
    expect(done.body).toMatchObject({ status: "COMPLETED", result: "Link is stable", version: 3 });
  });

  it("cancels an action and keeps Completed/Cancelled actions read-only (API-09, BR-09)", async () => {
    const action = (await create({ description: "Maybe reimage laptop" })).body;
    const cancel = await staff.patch(`/api/staff/tickets/${ticketId}/actions/${action.id}`)
      .send({ expectedVersion: 1, status: "CANCELLED" });
    expect(cancel.status).toBe(200);
    expect(cancel.body.status).toBe("CANCELLED");

    const editAfter = await staff.patch(`/api/staff/tickets/${ticketId}/actions/${action.id}`)
      .send({ expectedVersion: 2, description: "Changed my mind" });
    expect(editAfter.status).toBe(400);
    expect(editAfter.body.code).toBe("VALIDATION");

    const invalidStatus = await staff.patch(`/api/staff/tickets/${ticketId}/actions/${(await create({ description: "y" })).body.id}`)
      .send({ expectedVersion: 1, status: "PLANNED_LATER" });
    expect(invalidStatus.status).toBe(400);
  });

  it("rejects a stale edit with 409 and keeps the newer data (API-10, AC-10)", async () => {
    const action = (await create({ description: "Original" })).body;
    const first = await staff.patch(`/api/staff/tickets/${ticketId}/actions/${action.id}`)
      .send({ expectedVersion: 1, description: "First user's edit" });
    expect(first.status).toBe(200);

    const second = await (await loginAs(USERS.otherStaff))
      .patch(`/api/staff/tickets/${ticketId}/actions/${action.id}`)
      .send({ expectedVersion: 1, description: "Second user's stale edit" });
    expect(second.status).toBe(409);
    expect(second.body).toMatchObject({ code: "STALE_UPDATE", currentVersion: 2 });

    const stored = await getPrisma().actionTaken.findUniqueOrThrow({ where: { id: action.id } });
    expect(stored.description).toBe("First user's edit");

    const missingVersion = await staff.patch(`/api/staff/tickets/${ticketId}/actions/${action.id}`).send({ description: "x" });
    expect(missingVersion.status).toBe(400);
  });

  it("locks Actions Taken on Closed or Cancelled Tickets (API-11, BR-10)", async () => {
    const locked = (await createTicket()).id;
    const action = (await create({ description: "Before cancellation" }, locked)).body;
    await getPrisma().ticket.update({ where: { id: locked }, data: { currentStatus: "CANCELLED" } });

    const add = await create({ description: "After cancellation" }, locked);
    expect(add.status).toBe(400);
    expect(add.body.code).toBe("TICKET_LOCKED");

    const edit = await staff.patch(`/api/staff/tickets/${locked}/actions/${action.id}`).send({ expectedVersion: 1, description: "x" });
    expect(edit.status).toBe(400);
    expect(edit.body.code).toBe("TICKET_LOCKED");
  });

  it("returns 404 for a missing Ticket or an action that belongs to another Ticket (API-12, BR-01)", async () => {
    expect((await create({ description: "x" }, 999999)).status).toBe(404);
    expect((await staff.get("/api/staff/tickets/999999/actions")).status).toBe(404);

    const other = (await createTicket()).id;
    const action = (await create({ description: "On the first ticket" })).body;
    const crossed = await staff.patch(`/api/staff/tickets/${other}/actions/${action.id}`).send({ expectedVersion: 1, description: "x" });
    expect(crossed.status).toBe(404);
  });

  it("refreshes the parent Ticket's updatedAt when an action is recorded (API-13, BR-23)", async () => {
    const fresh = await createTicket();
    const before = await getPrisma().ticket.findUniqueOrThrow({ where: { id: fresh.id } });
    await new Promise((r) => setTimeout(r, 20));
    await create({ description: "Touch the ticket" }, fresh.id);
    const after = await getPrisma().ticket.findUniqueOrThrow({ where: { id: fresh.id } });
    expect(after.updatedAt.getTime()).toBeGreaterThan(before.updatedAt.getTime());
    expect(after.version).toBe(before.version); // action work does not invalidate a pending status change
  });

  it("rejects Requesters on every create/edit endpoint and saves nothing (SEC-01, AC-05)", async () => {
    const action = (await create({ description: "Staff only write" })).body;
    const before = await getPrisma().actionTaken.count({ where: { ticketId } });

    const post = await requester.post(`/api/staff/tickets/${ticketId}/actions`).send({ description: "Requester write" });
    const patch = await requester.patch(`/api/staff/tickets/${ticketId}/actions/${action.id}`)
      .send({ expectedVersion: 1, description: "Requester edit" });
    const list = await requester.get(`/api/staff/tickets/${ticketId}/actions`);
    expect([post.status, patch.status, list.status]).toEqual([403, 403, 403]);

    expect(await getPrisma().actionTaken.count({ where: { ticketId } })).toBe(before);
    const stored = await getPrisma().actionTaken.findUniqueOrThrow({ where: { id: action.id } });
    expect(stored.description).toBe("Staff only write");

    expect((await request(app).post(`/api/staff/tickets/${ticketId}/actions`).send({ description: "anon" })).status).toBe(401);
  });

  it("shows a Requester all actions on their own Ticket only (SEC-02, AC-06, FR-05)", async () => {
    const own = await requester.get(`/api/tickets/${ticketId}/actions`);
    expect(own.status).toBe(200);
    const staffView = await staff.get(`/api/staff/tickets/${ticketId}/actions`);
    expect(own.body.map((a: any) => a.id)).toEqual(staffView.body.map((a: any) => a.id));

    const othersTicket = (await createTicket(USERS.otherRequester)).id;
    expect((await requester.get(`/api/tickets/${othersTicket}/actions`)).status).toBe(403);
    expect((await requester.get("/api/tickets/999999/actions")).status).toBe(404);
    expect((await staff.get(`/api/tickets/${ticketId}/actions`)).status).toBe(403);
  });
});
