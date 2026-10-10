import { describe, it, expect, beforeAll } from "vitest";
import { getPrisma } from "../../src/prisma";
import { loginAs, userId, createTicket, USERS } from "./helpers";

describe("Ticket workflow API", () => {
  let staff: any;
  let requester: any;
  let otherRequester: any;
  let staffId: number;
  let requesterId: number;

  beforeAll(async () => {
    staff = await loginAs(USERS.staff);
    requester = await loginAs(USERS.requester);
    otherRequester = await loginAs(USERS.otherRequester);
    staffId = await userId(USERS.staff);
    requesterId = await userId(USERS.requester);
  });

  const version = async (id: number) => (await staff.get(`/api/staff/tickets/${id}`)).body.version as number;
  const setStatus = async (id: number, status: string, expectedVersion?: number) =>
    staff.patch(`/api/staff/tickets/${id}/status`).send({ status, expectedVersion: expectedVersion ?? await version(id) });
  const statusOf = async (id: number) => (await getPrisma().ticket.findUniqueOrThrow({ where: { id } })).currentStatus;

  async function addAction(id: number, complete: boolean) {
    const res = await staff.post(`/api/staff/tickets/${id}/actions`).send({ description: "Diagnosed the issue" });
    expect(res.status).toBe(201);
    if (complete) {
      const done = await staff.patch(`/api/staff/tickets/${id}/actions/${res.body.id}`)
        .send({ expectedVersion: 1, status: "COMPLETED", result: "Fixed" });
      expect(done.status).toBe(200);
    }
    return res.body.id as number;
  }

  /** A Requester-owned ticket taken all the way to Resolved through the real API. */
  async function resolvedTicket(owner = USERS.requester) {
    const { id } = await createTicket(owner);
    await staff.patch(`/api/staff/tickets/${id}/owner`).send({ ownerId: staffId });
    expect((await setStatus(id, "IN_PROGRESS")).status).toBe(200);
    await addAction(id, true);
    expect((await setStatus(id, "RESOLVED")).status).toBe(200);
    return id;
  }

  it("blocks Resolved until the gate passes and lists what is missing (WF-01, AC-07, BR-11)", async () => {
    const { id } = await createTicket();
    expect((await setStatus(id, "IN_PROGRESS")).status).toBe(200);

    const noWork = await setStatus(id, "RESOLVED");
    expect(noWork.status).toBe(400);
    expect(noWork.body.code).toBe("RESOLUTION_GATE");
    expect(noWork.body.reasons).toEqual(["Assign a Ticket Owner", "Complete at least one Action Taken"]);
    expect(await statusOf(id)).toBe("IN_PROGRESS");

    await staff.patch(`/api/staff/tickets/${id}/owner`).send({ ownerId: staffId });
    await addAction(id, true);
    await addAction(id, false); // still planned
    const planned = await setStatus(id, "RESOLVED");
    expect(planned.status).toBe(400);
    expect(planned.body.reasons).toEqual(["Finish or cancel 1 planned Action Taken"]);
    expect(await statusOf(id)).toBe("IN_PROGRESS");

    const detail = await staff.get(`/api/staff/tickets/${id}`);
    expect(detail.body.resolutionGate).toEqual({ ok: false, reasons: ["Finish or cancel 1 planned Action Taken"] });
  });

  it("resolves a ticket that passes the gate and records one history entry (WF-02, AC-08, BR-16)", async () => {
    const { id } = await createTicket();
    await staff.patch(`/api/staff/tickets/${id}/owner`).send({ ownerId: staffId });
    await setStatus(id, "IN_PROGRESS");
    await addAction(id, true);
    expect((await staff.get(`/api/staff/tickets/${id}`)).body.resolutionGate).toEqual({ ok: true, reasons: [] });

    const before = await version(id);
    const historyBefore = await getPrisma().ticketStatusHistory.count({ where: { ticketId: id } });
    const res = await setStatus(id, "RESOLVED", before);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ currentStatus: "RESOLVED", version: before + 1 });

    const history = await getPrisma().ticketStatusHistory.findMany({ where: { ticketId: id }, orderBy: { id: "desc" } });
    expect(history).toHaveLength(historyBefore + 1);
    expect(history[0]).toMatchObject({ fromStatus: "IN_PROGRESS", toStatus: "RESOLVED", changedById: staffId });
  });

  it("rejects transitions outside the matrix and leaves the status unchanged (WF-03, AC-09, BR-12, BR-14)", async () => {
    const { id } = await createTicket();
    const skip = await setStatus(id, "CLOSED");
    expect(skip.status).toBe(400);
    expect(skip.body.code).toBe("INVALID_TRANSITION");
    expect((await setStatus(id, "DONE")).body.code).toBe("INVALID_TRANSITION");
    expect(await statusOf(id)).toBe("NEW");

    expect((await setStatus(id, "CANCELLED")).status).toBe(200);
    const fromCancelled = await setStatus(id, "OPEN");
    expect(fromCancelled.status).toBe(400);
    expect(fromCancelled.body.code).toBe("INVALID_TRANSITION");
    expect(await statusOf(id)).toBe("CANCELLED");
  });

  it("rejects a stale status change with 409 and keeps the newer status (WF-04, AC-10, BR-17)", async () => {
    const { id } = await createTicket();
    const seen = await version(id);
    expect((await setStatus(id, "OPEN", seen)).status).toBe(200);

    const stale = await setStatus(id, "IN_PROGRESS", seen);
    expect(stale.status).toBe(409);
    expect(stale.body).toMatchObject({ code: "STALE_UPDATE", currentVersion: seen + 1 });
    expect(await statusOf(id)).toBe("OPEN");

    const missing = await staff.patch(`/api/staff/tickets/${id}/status`).send({ status: "IN_PROGRESS" });
    expect(missing.status).toBe(400);
    expect(missing.body.code).toBe("VALIDATION");
  });

  it("lets a Requester reopen only their own Resolved or Closed ticket (WF-05, AC-15, BR-13)", async () => {
    const id = await resolvedTicket();
    const v = (await requester.get(`/api/tickets/${id}`)).body.version;

    expect((await otherRequester.patch(`/api/tickets/${id}/reopen`).send({ expectedVersion: v })).status).toBe(403);
    expect((await requester.patch(`/api/tickets/${id}/reopen`).send({ expectedVersion: v - 1 })).status).toBe(409);

    const reopened = await requester.patch(`/api/tickets/${id}/reopen`).send({ expectedVersion: v });
    expect(reopened.status).toBe(200);
    expect(reopened.body).toMatchObject({ currentStatus: "REOPENED", version: v + 1 });
    const last = await getPrisma().ticketStatusHistory.findFirstOrThrow({ where: { ticketId: id }, orderBy: { id: "desc" } });
    expect(last).toMatchObject({ fromStatus: "RESOLVED", toStatus: "REOPENED", changedById: requesterId });

    // Not from an active status
    const again = await requester.patch(`/api/tickets/${id}/reopen`).send({ expectedVersion: v + 1 });
    expect(again.status).toBe(400);
    expect(again.body.code).toBe("INVALID_TRANSITION");

    // Closed tickets can be reopened too
    const closed = await resolvedTicket();
    expect((await setStatus(closed, "CLOSED")).status).toBe(200);
    const cv = (await requester.get(`/api/tickets/${closed}`)).body.version;
    expect((await requester.patch(`/api/tickets/${closed}/reopen`).send({ expectedVersion: cv })).status).toBe(200);

    expect((await requester.patch("/api/tickets/999999/reopen").send({ expectedVersion: 1 })).status).toBe(404);
    expect((await staff.patch(`/api/tickets/${closed}/reopen`).send({ expectedVersion: 1 })).status).toBe(403);
  });

  it("keeps 'problem appears resolved' advisory and clears it on reopen (WF-06, AC-11, BR-15)", async () => {
    const { id } = await createTicket();
    await staff.patch(`/api/staff/tickets/${id}/owner`).send({ ownerId: staffId });
    await setStatus(id, "IN_PROGRESS");

    const flag = await requester.patch(`/api/tickets/${id}/mark-resolved`);
    expect(flag.status).toBe(200);
    let ticket = await getPrisma().ticket.findUniqueOrThrow({ where: { id } });
    expect(ticket.problemAppearsResolved).toBe(true);
    expect(ticket.currentStatus).toBe("IN_PROGRESS");

    await addAction(id, true);
    await setStatus(id, "RESOLVED");
    await requester.patch(`/api/tickets/${id}/reopen`).send({ expectedVersion: await version(id) });
    ticket = await getPrisma().ticket.findUniqueOrThrow({ where: { id } });
    expect(ticket.currentStatus).toBe("REOPENED");
    expect(ticket.problemAppearsResolved).toBe(false);
  });

  it("returns append-only history in stable order to staff and the owning Requester (WF-07, AC-12, BR-16)", async () => {
    const { id } = await createTicket();
    await setStatus(id, "OPEN");
    await setStatus(id, "IN_PROGRESS");
    await setStatus(id, "WAITING_FOR_REQUESTER");

    const res = await staff.get(`/api/staff/tickets/${id}/history`);
    expect(res.status).toBe(200);
    expect(res.body.map((h: any) => [h.fromStatus, h.toStatus])).toEqual([
      ["NEW", "OPEN"], ["OPEN", "IN_PROGRESS"], ["IN_PROGRESS", "WAITING_FOR_REQUESTER"],
    ]);
    expect(res.body[0].changedBy).toEqual({ id: staffId, name: "Kevin Patel" });

    const own = await requester.get(`/api/tickets/${id}/history`);
    expect(own.status).toBe(200);
    expect(own.body).toEqual(res.body);
    expect((await otherRequester.get(`/api/tickets/${id}/history`)).status).toBe(403);
    expect((await requester.get(`/api/staff/tickets/${id}/history`)).status).toBe(403);
    expect((await staff.get("/api/staff/tickets/999999/history")).status).toBe(404);

    // No route edits or deletes history
    const entry = res.body[0].id;
    expect((await staff.patch(`/api/staff/tickets/${id}/history/${entry}`).send({ toStatus: "CLOSED" })).status).toBe(404);
    expect((await staff.delete(`/api/staff/tickets/${id}/history/${entry}`)).status).toBe(404);
    expect(await getPrisma().ticketStatusHistory.count({ where: { ticketId: id } })).toBe(3);
  });

  it("rejects a Requester on the staff status endpoint (SEC-03, BR-13)", async () => {
    const id = await resolvedTicket();
    const res = await requester.patch(`/api/staff/tickets/${id}/status`).send({ status: "CLOSED", expectedVersion: await version(id) });
    expect(res.status).toBe(403);
    expect(await statusOf(id)).toBe("RESOLVED");
  });
});
