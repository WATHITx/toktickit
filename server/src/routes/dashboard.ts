import { Router, Response } from "express";
import { getPrisma } from "../prisma.js";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth.js";
import { ACTIVE_STATUSES, statusWhere } from "../validation/dashboardRules.js";
import { TICKET_STATUSES } from "../validation/statusTransitions.js";

// Lab 4 dashboards (docs/lab-04/api-spec.md "Dashboards"). Every number is computed here from the database at
// request time (BR-20); lists hold at most 5 items (BR-24); no match means 0 or [] (BR-22).
const router = Router();
const LIST_LIMIT = 5;
const ACTIVE = { currentStatus: { in: [...ACTIVE_STATUSES] } };
const PRIORITIES = ["HIGH", "MEDIUM", "LOW"] as const;
const ROLES = ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"] as const;

const TICKET_ROW = { id: true, ticketNumber: true, summary: true, currentStatus: true, updatedAt: true } as const;

// GET /api/dashboard/requester — scoped to the caller's own tickets (BR-21)
router.get("/dashboard/requester", requireAuth, requireRole(["REQUESTER"]), async (req: AuthedRequest, res: Response) => {
  const own = { requesterId: req.user!.id };
  const now = new Date();
  try {
    const prisma = getPrisma();
    const [openTickets, waitingForMe, recentlyResolved, recentlyUpdated] = await Promise.all([
      prisma.ticket.count({ where: { ...own, ...ACTIVE } }),
      prisma.ticket.count({ where: { ...own, currentStatus: "WAITING_FOR_REQUESTER" } }),
      prisma.ticket.count({ where: { ...own, ...statusWhere("RECENTLY_RESOLVED", now) } }),
      prisma.ticket.findMany({ where: own, select: TICKET_ROW, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: LIST_LIMIT }),
    ]);
    res.status(200).json({
      metrics: { openTickets, waitingForMe, recentlyResolved },
      recentlyUpdated,
      generatedAt: now.toISOString(),
    });
  } catch (err) {
    console.error("Failed to build requester dashboard:", err);
    res.status(500).json({ error: "Unable to load the dashboard" });
  }
});

// GET /api/dashboard/staff — IT Staff and Administrators; Administrators also get user counts
router.get("/dashboard/staff", requireAuth, requireRole(["IT_STAFF", "ADMINISTRATOR"]), async (req: AuthedRequest, res: Response) => {
  const me = req.user!.id;
  const now = new Date();
  try {
    const prisma = getPrisma();
    const myPlanned = { assigneeId: me, status: "PLANNED" as const };
    const [unassigned, assignedToMe, myOpenActions, statusGroups, priorityGroups, urgent, recentlyUpdated, myActions] = await Promise.all([
      prisma.ticket.count({ where: { ...ACTIVE, ticketOwnerId: null } }),
      prisma.ticket.count({ where: { ...ACTIVE, ticketOwnerId: me } }),
      prisma.actionTaken.count({ where: myPlanned }),
      prisma.ticket.groupBy({ by: ["currentStatus"], _count: { _all: true } }),
      prisma.ticket.groupBy({ by: ["itPriority"], where: ACTIVE, _count: { _all: true } }),
      prisma.ticket.findMany({
        where: { ...ACTIVE, itPriority: "HIGH" },
        select: { id: true, ticketNumber: true, summary: true, currentStatus: true, itPriority: true, createdAt: true, ticketOwner: { select: { id: true, name: true } } },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: LIST_LIMIT,
      }),
      prisma.ticket.findMany({ select: TICKET_ROW, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], take: LIST_LIMIT }),
      prisma.actionTaken.findMany({
        where: myPlanned,
        select: { id: true, ticketId: true, description: true, actionAt: true, ticket: { select: { ticketNumber: true } } },
        orderBy: [{ actionAt: "asc" }, { id: "asc" }],
        take: LIST_LIMIT,
      }),
    ]);

    // Every status / priority is present, 0 when none (BR-22)
    const byStatus = Object.fromEntries(TICKET_STATUSES.map((s) => [s, 0])) as Record<string, number>;
    for (const g of statusGroups) byStatus[g.currentStatus] = g._count._all;
    const byItPriority = Object.fromEntries(PRIORITIES.map((p) => [p, 0])) as Record<string, number>;
    for (const g of priorityGroups) byItPriority[g.itPriority] = g._count._all;

    let userCounts: Record<string, { active: number; inactive: number }> | undefined;
    if (req.user!.role === "ADMINISTRATOR") {
      userCounts = Object.fromEntries(ROLES.map((r) => [r, { active: 0, inactive: 0 }]));
      for (const g of await prisma.user.groupBy({ by: ["role", "isActive"], _count: { _all: true } })) {
        userCounts[g.role][g.isActive ? "active" : "inactive"] = g._count._all;
      }
    }

    res.status(200).json({
      metrics: { unassigned, assignedToMe, myOpenActions },
      byStatus,
      byItPriority,
      urgent,
      recentlyUpdated,
      myOpenActionsList: myActions.map(({ ticket, ...a }) => ({ ...a, ticketNumber: ticket.ticketNumber })),
      ...(userCounts ? { userCounts } : {}),
      generatedAt: now.toISOString(),
    });
  } catch (err) {
    console.error("Failed to build staff dashboard:", err);
    res.status(500).json({ error: "Unable to load the dashboard" });
  }
});

export default router;
