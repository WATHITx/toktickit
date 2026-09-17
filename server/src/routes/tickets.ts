import { Router, Response } from "express";
import { getPrisma } from "../prisma.js";
import { formatTicketNumber } from "../utils/ticketNumber.js";
import { validateTicketInput } from "../validation/ticketValidation.js";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth.js";

const router = Router();

const SORTABLE_FIELDS = ["createdAt", "ticketNumber", "currentStatus"];

router.get("/tickets", requireAuth, requireRole(["REQUESTER"]), async (req: AuthedRequest, res: Response) => {
  const requesterId = req.user!.id;

  const search = (req.query.search as string) || "";
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(50, Number(req.query.pageSize) || 10);
  const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
  const requestedPriority = ["LOW", "MEDIUM", "HIGH"].includes(req.query.requestedPriority as string)
    ? (req.query.requestedPriority as string) : undefined;
  const sortByRaw = req.query.sortBy as string;
  const sortBy = SORTABLE_FIELDS.includes(sortByRaw) ? sortByRaw : "createdAt";
  const sortDir = req.query.sortDir === "asc" ? "asc" : "desc";

  try {
    const prisma = getPrisma();
    const where: any = {
      requesterId,
      ...(categoryId ? { categoryId } : {}),
      ...(requestedPriority ? { requestedPriority: requestedPriority as any } : {}),
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
        orderBy: { [sortBy]: sortDir } as any,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { category: true },
      }),
    ]);

    res.status(200).json({
      data: tickets,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (err) {
    console.error("Failed to fetch tickets:", err);
    res.status(500).json({ error: "Unable to fetch tickets" });
  }
});

router.get("/tickets/:id", requireAuth, requireRole(["REQUESTER"]), async (req: AuthedRequest, res: Response) => {
  const ticketId = Number(req.params.id);
  if (!Number.isInteger(ticketId) || ticketId <= 0) {
    return res.status(400).json({ error: "Invalid ticket id" });
  }

  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { category: true, relatedSystem: true, attachments: true },
    });

    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    if (ticket.requesterId !== req.user!.id) {
      return res.status(403).json({ error: "You do not have access to this ticket" });
    }

    res.status(200).json(ticket);
  } catch (err) {
    console.error("Failed to fetch ticket:", err);
    res.status(500).json({ error: "Unable to fetch ticket" });
  }
});

router.post("/tickets", requireAuth, requireRole(["REQUESTER"]), async (req: AuthedRequest, res: Response) => {
  const errors = validateTicketInput(req.body);
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }

  const { categoryId, relatedSystemId, summary, description, requestedPriority } = req.body;
  const requesterId = req.user!.id;

  try {
    const prisma = getPrisma();

    const requester = await prisma.user.findUnique({ where: { id: requesterId } });
    if (!requester || !requester.isActive) {
      return res.status(400).json({ error: "Invalid or inactive requester" });
    }

    const ticket = await prisma.$transaction(async (tx) => {
      const seqResult = await tx.$queryRaw<{ nextval: bigint }[]>`SELECT nextval('ticket_number_seq')`;
      const ticketNumber = formatTicketNumber(Number(seqResult[0].nextval));

      return tx.ticket.create({
        data: {
          ticketNumber,
          requesterId,
          categoryId,
          relatedSystemId,
          summary: summary.trim(),
          description: description.trim(),
          requestedPriority,
          currentStatus: "NEW",
        },
      });
    });

    res.status(201).json(ticket);
  } catch (err) {
    console.error("Failed to create ticket:", err);
    res.status(500).json({ error: "Unable to create ticket" });
  }
});

// Public comments
router.post("/tickets/:id/comments", requireAuth, async (req: AuthedRequest, res: Response) => {
  const ticketId = Number(req.params.id);
  if (!Number.isInteger(ticketId) || ticketId <= 0) {
    return res.status(400).json({ error: "Invalid ticket id" });
  }
  const { content } = req.body;

  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: "Comment cannot be empty" });
  }
  if (content.trim().length > 2000) {
    return res.status(400).json({ error: "Comment must be 2000 characters or fewer" });
  }

  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });

    const isOwner = ticket.requesterId === req.user!.id;
    const isStaff = ["IT_STAFF", "ADMINISTRATOR"].includes(req.user!.role);
    if (!isOwner && !isStaff) {
      return res.status(403).json({ error: "Access denied" });
    }

    const comment = await prisma.publicComment.create({
      data: { ticketId, authorId: req.user!.id, content: content.trim() },
      include: { author: { select: { name: true, role: true } } },
    });

    res.status(201).json(comment);
  } catch (err) {
    console.error("Failed to add comment:", err);
    res.status(500).json({ error: "Unable to add comment" });
  }
});

router.get("/tickets/:id/comments", requireAuth, async (req: AuthedRequest, res: Response) => {
  const ticketId = Number(req.params.id);
  if (!Number.isInteger(ticketId) || ticketId <= 0) {
    return res.status(400).json({ error: "Invalid ticket id" });
  }

  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });

    const isOwner = ticket.requesterId === req.user!.id;
    const isStaff = ["IT_STAFF", "ADMINISTRATOR"].includes(req.user!.role);
    if (!isOwner && !isStaff) {
      return res.status(403).json({ error: "Access denied" });
    }

    const comments = await prisma.publicComment.findMany({
      where: { ticketId },
      include: { author: { select: { name: true, role: true } } },
      orderBy: { createdAt: "asc" },
    });

    res.status(200).json(comments);
  } catch (err) {
    console.error("Failed to fetch comments:", err);
    res.status(500).json({ error: "Unable to fetch comments" });
  }
});

router.patch("/tickets/:id/mark-resolved", requireAuth, requireRole(["REQUESTER"]), async (req: AuthedRequest, res: Response) => {
  const ticketId = Number(req.params.id);
  if (!Number.isInteger(ticketId) || ticketId <= 0) {
    return res.status(400).json({ error: "Invalid ticket id" });
  }

  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    if (ticket.requesterId !== req.user!.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: { problemAppearsResolved: true },
    });

    res.status(200).json(updated);
  } catch (err) {
    console.error("Failed to update ticket:", err);
    res.status(500).json({ error: "Unable to update ticket" });
  }
});

export default router;