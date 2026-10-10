import { Response } from "express";
import { getPrisma } from "../prisma.js";
import { canTransition } from "../validation/statusTransitions.js";
import { checkResolutionGate } from "../validation/resolutionGate.js";

// One code path for every Ticket status change (staff status endpoint and Requester reopen),
// following the processing order in docs/lab-04/api-spec.md: transition → gate → version → write + history.

type ChangeRequest = {
  ticketId: number;
  to: unknown;
  expectedVersion: unknown;
  actor: { id: number; role: string };
  /** Requester callers must own the ticket. */
  requireOwnerId?: number;
};

type Failure = { status: number; body: Record<string, unknown> };
type Outcome = { ok: true; ticket: unknown } | ({ ok: false } & Failure);

const fail = (status: number, body: Record<string, unknown>): Outcome => ({ ok: false, status, body });

export async function getResolutionGate(ticketId: number, ticketOwnerId: number | null) {
  const actions = await getPrisma().actionTaken.findMany({ where: { ticketId }, select: { status: true } });
  return checkResolutionGate({ ticketOwnerId, actions });
}

export async function changeTicketStatus({ ticketId, to, expectedVersion, actor, requireOwnerId }: ChangeRequest): Promise<Outcome> {
  if (!Number.isInteger(expectedVersion)) {
    return fail(400, { error: "expectedVersion is required", code: "VALIDATION", fields: { expectedVersion: "expectedVersion is required" } });
  }

  const prisma = getPrisma();
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return fail(404, { error: "Ticket not found" });
  if (requireOwnerId !== undefined && ticket.requesterId !== requireOwnerId) {
    return fail(403, { error: "You do not have access to this ticket" });
  }

  // BR-12 / BR-13
  if (typeof to !== "string" || !canTransition(ticket.currentStatus, to, actor.role)) {
    return fail(400, { error: `Cannot change status from ${ticket.currentStatus} to ${String(to)}`, code: "INVALID_TRANSITION" });
  }

  // BR-11
  if (to === "RESOLVED") {
    const gate = await getResolutionGate(ticketId, ticket.ticketOwnerId);
    if (!gate.ok) return fail(400, { error: "This ticket cannot be resolved yet.", code: "RESOLUTION_GATE", reasons: gate.reasons });
  }

  // BR-17
  const stale = () => fail(409, {
    error: "This ticket was changed by someone else. Reload to see the latest version.",
    code: "STALE_UPDATE", currentVersion: ticket.version,
  });
  if (expectedVersion !== ticket.version) return stale();

  // BR-16: status, version and history change together; the version condition catches a concurrent writer
  const updated = await prisma.$transaction(async (tx) => {
    const { count } = await tx.ticket.updateMany({
      where: { id: ticketId, version: ticket.version },
      data: {
        currentStatus: to as any,
        version: { increment: 1 },
        ...(to === "REOPENED" ? { problemAppearsResolved: false } : {}), // BR-15
      },
    });
    if (count === 0) return null;
    await tx.ticketStatusHistory.create({
      data: { ticketId, fromStatus: ticket.currentStatus, toStatus: to as any, changedById: actor.id },
    });
    return tx.ticket.findUniqueOrThrow({ where: { id: ticketId } });
  });
  if (!updated) {
    const current = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { version: true } });
    return fail(409, {
      error: "This ticket was changed by someone else. Reload to see the latest version.",
      code: "STALE_UPDATE", currentVersion: current?.version,
    });
  }
  return { ok: true, ticket: updated };
}

export function sendOutcome(res: Response, outcome: Outcome) {
  if (outcome.ok) return res.status(200).json(outcome.ticket);
  return res.status(outcome.status).json(outcome.body);
}

export async function getStatusHistory(ticketId: number) {
  return getPrisma().ticketStatusHistory.findMany({
    where: { ticketId },
    select: { id: true, fromStatus: true, toStatus: true, changedAt: true, changedBy: { select: { id: true, name: true } } },
    orderBy: [{ changedAt: "asc" }, { id: "asc" }],
  });
}
