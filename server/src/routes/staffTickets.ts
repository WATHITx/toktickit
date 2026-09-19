import { Router, Response } from "express";
import { getPrisma } from "../prisma.js";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth.js";
import { isValidTransition } from "../validation/statusTransitions.js";

const router = Router();
const STAFF_ROLES = ["IT_STAFF", "ADMINISTRATOR"];
const SORTABLE_FIELDS = ["createdAt", "ticketNumber", "itPriority", "currentStatus"];

router.get("/staff/tickets", requireAuth, requireRole(STAFF_ROLES), async (req: AuthedRequest, res: Response) => {
  const search = (req.query.search as string) || "";
  const status = req.query.status as string | undefined;
  const itPriority = ["LOW", "MEDIUM", "HIGH"].includes(req.query.itPriority as string)
    ? (req.query.itPriority as string) : undefined;
  const ownership = (req.query.ownership as string) || "all"; // mine | unassigned | all
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(50, Number(req.query.pageSize) || 10);
  const sortByRaw = req.query.sortBy as string;
  const sortBy = SORTABLE_FIELDS.includes(sortByRaw) ? sortByRaw : "createdAt";
  const sortDir = req.query.sortDir === "asc" ? "asc" : "desc";

  try {
    const prisma = getPrisma();
    const where: any = {
      ...(status ? { currentStatus: status } : {}),
      ...(itPriority ? { itPriority } : {}),
      ...(ownership === "mine" ? { ticketOwnerId: req.user!.id } : {}),
      ...(ownership === "unassigned" ? { ticketOwnerId: null } : {}),
      ...(search ? {
        OR: [
          { summary: { contains: search, mode: "insensitive" as const } },
          { ticketNumber: { contains: search, mode: "insensitive" as const } },
        ],
      } : {}),
    };

    const [total, tickets] = await Promise.all([
      prisma.ticket.count({ where }),
      prisma.ticket.findMany({
        where,
        orderBy: { [sortBy]: sortDir },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          category: true,
          ticketOwner: { select: { id: true, name: true } },
          requester: { select: { name: true } },
        },
      }),
    ]);

    res.status(200).json({
      data: tickets,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (err) {
    console.error("Failed to fetch staff queue:", err);
    res.status(500).json({ error: "Unable to fetch queue" });
  }
});

// GET /api/staff/users — active IT Staff / Administrator for the Ticket Owner dropdown
router.get("/staff/users", requireAuth, requireRole(STAFF_ROLES), async (_req: AuthedRequest, res: Response) => {
  try {
    const users = await getPrisma().user.findMany({
      where: { role: { in: STAFF_ROLES as any }, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    res.status(200).json(users);
  } catch (err) {
    console.error("Failed to fetch staff users:", err);
    res.status(500).json({ error: "Unable to fetch staff users" });
  }
});

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// GET /api/staff/tickets/:id — staff can view any ticket, not just their own
router.get("/staff/tickets/:id", requireAuth, requireRole(STAFF_ROLES), async (req: AuthedRequest, res: Response) => {
  const ticketId = parseId(req.params.id);
  if (!ticketId) return res.status(404).json({ error: "Ticket not found" });
  try {
    const ticket = await getPrisma().ticket.findUnique({
      where: { id: ticketId },
      include: {
        category: true, relatedSystem: true, attachments: true,
        requester: { select: { id: true, name: true } },
        ticketOwner: { select: { id: true, name: true } },
      },
    });
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    res.status(200).json(ticket);
  } catch (err) {
    console.error("Failed to fetch staff ticket:", err);
    res.status(500).json({ error: "Unable to fetch ticket" });
  }
});

// Claim / reassign / unassign owner
router.patch("/staff/tickets/:id/owner", requireAuth, requireRole(STAFF_ROLES), async (req: AuthedRequest, res: Response) => {
  const ticketId = parseId(req.params.id);
  if (!ticketId) return res.status(404).json({ error: "Ticket not found" });
  const { ownerId } = req.body;

  try {
    const prisma = getPrisma();
    if (ownerId !== null) {
      const owner = Number.isInteger(ownerId) ? await prisma.user.findUnique({ where: { id: ownerId } }) : null;
      if (!owner || !owner.isActive || !STAFF_ROLES.includes(owner.role)) {
        return res.status(400).json({ error: "Ticket owner must be an active IT Staff or Administrator user" });
      }
    }
    const existing = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!existing) return res.status(404).json({ error: "Ticket not found" });

    const ticket = await prisma.ticket.update({
      where: { id: ticketId },
      data: { ticketOwnerId: ownerId },
      include: { ticketOwner: { select: { id: true, name: true } } },
    });
    res.status(200).json(ticket);
  } catch (err) {
    console.error("Failed to update ticket owner:", err);
    res.status(500).json({ error: "Unable to update ticket owner" });
  }
});

// Set IT Priority (Requested Priority is never touched — BR-12)
router.patch("/staff/tickets/:id/priority", requireAuth, requireRole(STAFF_ROLES), async (req: AuthedRequest, res: Response) => {
  const ticketId = parseId(req.params.id);
  if (!ticketId) return res.status(404).json({ error: "Ticket not found" });
  const { itPriority } = req.body;
  if (!["LOW", "MEDIUM", "HIGH"].includes(itPriority)) {
    return res.status(400).json({ error: "Invalid IT Priority value" });
  }
  try {
    const prisma = getPrisma();
    const existing = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!existing) return res.status(404).json({ error: "Ticket not found" });

    const ticket = await prisma.ticket.update({ where: { id: ticketId }, data: { itPriority } });
    res.status(200).json(ticket);
  } catch (err) {
    console.error("Failed to update IT priority:", err);
    res.status(500).json({ error: "Unable to update IT Priority" });
  }
});

// Status transition (BR-13)
router.patch("/staff/tickets/:id/status", requireAuth, requireRole(STAFF_ROLES), async (req: AuthedRequest, res: Response) => {
  const ticketId = parseId(req.params.id);
  if (!ticketId) return res.status(404).json({ error: "Ticket not found" });
  const { status } = req.body;
  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });

    if (typeof status !== "string" || !isValidTransition(ticket.currentStatus, status)) {
      return res.status(400).json({ error: `Cannot transition from ${ticket.currentStatus} to ${status}` });
    }

    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: { currentStatus: status as any },
    });
    res.status(200).json(updated);
  } catch (err) {
    console.error("Failed to update status:", err);
    res.status(500).json({ error: "Unable to update status" });
  }
});

// Internal Notes — create (staff only, enforced by requireRole)
router.post("/staff/tickets/:id/notes", requireAuth, requireRole(STAFF_ROLES), async (req: AuthedRequest, res: Response) => {
  const ticketId = parseId(req.params.id);
  if (!ticketId) return res.status(404).json({ error: "Ticket not found" });
  const content = typeof req.body.content === "string" ? req.body.content.trim() : "";
  if (content.length === 0) {
    return res.status(400).json({ error: "Note cannot be empty" });
  }
  if (content.length > 2000) {
    return res.status(400).json({ error: "Note must be 2000 characters or fewer" });
  }

  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });

    const note = await prisma.internalNote.create({
      data: { ticketId: ticket.id, authorId: req.user!.id, content },
      include: { author: { select: { name: true } } },
    });
    res.status(201).json(note);
  } catch (err) {
    console.error("Failed to add note:", err);
    res.status(500).json({ error: "Unable to add note" });
  }
});

// Internal Notes — read (staff only, enforced by requireRole)
router.get("/staff/tickets/:id/notes", requireAuth, requireRole(STAFF_ROLES), async (req: AuthedRequest, res: Response) => {
  const ticketId = parseId(req.params.id);
  if (!ticketId) return res.status(404).json({ error: "Ticket not found" });
  try {
    const notes = await getPrisma().internalNote.findMany({
      where: { ticketId },
      include: { author: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    });
    res.status(200).json(notes);
  } catch (err) {
    console.error("Failed to fetch notes:", err);
    res.status(500).json({ error: "Unable to fetch notes" });
  }
});

export default router;
