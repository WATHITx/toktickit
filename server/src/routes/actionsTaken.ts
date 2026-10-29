import { Router, Response } from "express";
import { getPrisma } from "../prisma.js";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth.js";
import { parseActionInput } from "../validation/actionTaken.js";

// Lab 4 Actions Taken (docs/lab-04/api-spec.md). Staff routes are read/write, the Requester route is read-only.
const router = Router();
const STAFF_ROLES = ["IT_STAFF", "ADMINISTRATOR"];
const LOCKED_TICKET_STATUSES = ["CLOSED", "CANCELLED"]; // BR-10
const FINAL_ACTION_STATUSES = ["COMPLETED", "CANCELLED"]; // BR-09

const ACTION_INCLUDE = {
  performedBy: { select: { id: true, name: true } },
  assignee: { select: { id: true, name: true } },
} as const;
const ACTION_ORDER = [{ actionAt: "asc" as const }, { id: "asc" as const }];

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

const validationError = (res: Response, fields: Record<string, string>, error = "Please correct the highlighted fields") =>
  res.status(400).json({ error, code: "VALIDATION", fields });

const lockedError = (res: Response) =>
  res.status(400).json({ error: "This ticket is closed. Actions Taken are read-only.", code: "TICKET_LOCKED" });

// BR-05: assignee must be an active IT Staff / Administrator. Returns an error message or null.
async function checkAssignee(assigneeId: unknown): Promise<string | null> {
  if (!Number.isInteger(assigneeId)) return "Assignee must be an active IT Staff or Administrator user";
  const user = await getPrisma().user.findUnique({ where: { id: assigneeId as number } });
  if (!user || !user.isActive || !STAFF_ROLES.includes(user.role)) {
    return "Assignee must be an active IT Staff or Administrator user";
  }
  return null;
}

// GET /api/staff/tickets/:id/actions
router.get("/staff/tickets/:id/actions", requireAuth, requireRole(STAFF_ROLES), async (req: AuthedRequest, res: Response) => {
  const ticketId = parseId(req.params.id);
  if (!ticketId) return res.status(404).json({ error: "Ticket not found" });
  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { id: true } });
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });

    const actions = await prisma.actionTaken.findMany({ where: { ticketId }, include: ACTION_INCLUDE, orderBy: ACTION_ORDER });
    res.status(200).json(actions);
  } catch (err) {
    console.error("Failed to fetch actions taken:", err);
    res.status(500).json({ error: "Unable to fetch Actions Taken" });
  }
});

// POST /api/staff/tickets/:id/actions
router.post("/staff/tickets/:id/actions", requireAuth, requireRole(STAFF_ROLES), async (req: AuthedRequest, res: Response) => {
  const ticketId = parseId(req.params.id);
  if (!ticketId) return res.status(404).json({ error: "Ticket not found" });
  const body = (req.body ?? {}) as Record<string, unknown>;

  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    if (LOCKED_TICKET_STATUSES.includes(ticket.currentStatus)) return lockedError(res);

    const { value, fields } = parseActionInput(body, { ticketCreatedAt: ticket.createdAt, now: new Date() });
    // BR-05: default assignee is the creator
    const assigneeId = body.assigneeId === undefined || body.assigneeId === null ? req.user!.id : body.assigneeId;
    const assigneeError = await checkAssignee(assigneeId);
    if (assigneeError) fields.assigneeId = assigneeError;
    if (Object.keys(fields).length > 0) return validationError(res, fields);

    // performedById comes from the session only (BR-04); status/version use their defaults
    const [action] = await prisma.$transaction([
      prisma.actionTaken.create({
        data: { ...value, ticketId, performedById: req.user!.id, assigneeId: assigneeId as number },
        include: ACTION_INCLUDE,
      }),
      prisma.ticket.update({ where: { id: ticketId }, data: { updatedAt: new Date() } }), // BR-23
    ]);
    res.status(201).json(action);
  } catch (err) {
    console.error("Failed to create action taken:", err);
    res.status(500).json({ error: "Unable to save the Action Taken" });
  }
});

// PATCH /api/staff/tickets/:id/actions/:actionId — edit, complete or cancel a Planned action
router.patch("/staff/tickets/:id/actions/:actionId", requireAuth, requireRole(STAFF_ROLES), async (req: AuthedRequest, res: Response) => {
  const ticketId = parseId(req.params.id);
  const actionId = parseId(req.params.actionId);
  if (!ticketId || !actionId) return res.status(404).json({ error: "Action Taken not found" });
  const body = (req.body ?? {}) as Record<string, unknown>;

  try {
    const prisma = getPrisma();
    const action = await prisma.actionTaken.findFirst({ where: { id: actionId, ticketId }, include: { ticket: true } });
    if (!action) return res.status(404).json({ error: "Action Taken not found" }); // includes BR-01 mismatch
    if (LOCKED_TICKET_STATUSES.includes(action.ticket.currentStatus)) return lockedError(res);

    if (!Number.isInteger(body.expectedVersion)) {
      return validationError(res, { expectedVersion: "expectedVersion is required" });
    }
    if (body.expectedVersion !== action.version) {
      return res.status(409).json({
        error: "This action was changed by someone else. Reload to see the latest version.",
        code: "STALE_UPDATE", currentVersion: action.version,
      });
    }
    if (FINAL_ACTION_STATUSES.includes(action.status)) {
      return validationError(res, {}, "Completed or cancelled actions are read-only");
    }
    if (body.status !== undefined && !FINAL_ACTION_STATUSES.includes(body.status as string)) {
      return validationError(res, { status: "Status can only be changed to COMPLETED or CANCELLED" });
    }

    const { value, fields } = parseActionInput(body, { ticketCreatedAt: action.ticket.createdAt, now: new Date() }, action);
    if (body.status === "COMPLETED" && !value.result) fields.result = "Result is required to complete an action";
    if (body.assigneeId !== undefined) {
      const assigneeError = await checkAssignee(body.assigneeId);
      if (assigneeError) fields.assigneeId = assigneeError;
    }
    if (Object.keys(fields).length > 0) return validationError(res, fields);

    // Conditional on the version we checked, so a concurrent edit between the read and the write still gets a 409
    const updated = await prisma.$transaction(async (tx) => {
      const { count } = await tx.actionTaken.updateMany({
        where: { id: actionId, version: action.version },
        data: {
          ...value,
          ...(body.assigneeId !== undefined ? { assigneeId: body.assigneeId as number } : {}),
          ...(body.status !== undefined ? { status: body.status as "COMPLETED" | "CANCELLED" } : {}),
          version: { increment: 1 },
        },
      });
      if (count === 0) return null;
      await tx.ticket.update({ where: { id: ticketId }, data: { updatedAt: new Date() } }); // BR-23
      return tx.actionTaken.findUniqueOrThrow({ where: { id: actionId }, include: ACTION_INCLUDE });
    });
    if (!updated) {
      const current = await prisma.actionTaken.findUnique({ where: { id: actionId }, select: { version: true } });
      return res.status(409).json({
        error: "This action was changed by someone else. Reload to see the latest version.",
        code: "STALE_UPDATE", currentVersion: current?.version,
      });
    }
    res.status(200).json(updated);
  } catch (err) {
    console.error("Failed to update action taken:", err);
    res.status(500).json({ error: "Unable to save the Action Taken" });
  }
});

// GET /api/tickets/:id/actions — Requester read-only view of their own Ticket (BR-03, FR-05)
router.get("/tickets/:id/actions", requireAuth, requireRole(["REQUESTER"]), async (req: AuthedRequest, res: Response) => {
  const ticketId = parseId(req.params.id);
  if (!ticketId) return res.status(404).json({ error: "Ticket not found" });
  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { requesterId: true } });
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    if (ticket.requesterId !== req.user!.id) return res.status(403).json({ error: "You do not have access to this ticket" });

    const actions = await prisma.actionTaken.findMany({ where: { ticketId }, include: ACTION_INCLUDE, orderBy: ACTION_ORDER });
    res.status(200).json(actions);
  } catch (err) {
    console.error("Failed to fetch actions taken:", err);
    res.status(500).json({ error: "Unable to fetch Actions Taken" });
  }
});

export default router;
