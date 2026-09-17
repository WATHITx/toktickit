import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";
import { formatTicketNumber } from "../utils/ticketNumber.js";
import { validateTicketInput } from "../validation/ticketValidation.js";

const router = Router();

const SORTABLE_FIELDS = ["createdAt", "ticketNumber", "currentStatus"];

router.get("/tickets", async (req: Request, res: Response) => {
  const requesterId = Number(req.query.requesterId);
  if (!requesterId) return res.status(400).json({ error: "requesterId is required" });

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

router.get("/tickets/:id", async (req: Request, res: Response) => {
  const ticketId = Number(req.params.id);
  const requesterId = Number(req.query.requesterId);

  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { category: true, relatedSystem: true, attachments: true },
    });

    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    if (ticket.requesterId !== requesterId) {
      return res.status(403).json({ error: "You do not have access to this ticket" });
    }

    res.status(200).json(ticket);
  } catch (err) {
    console.error("Failed to fetch ticket:", err);
    res.status(500).json({ error: "Unable to fetch ticket" });
  }
});

router.post("/tickets", async (req: Request, res: Response) => {
  const errors = validateTicketInput(req.body);
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }

  const { requesterId, categoryId, relatedSystemId, summary, description, requestedPriority } = req.body;

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

export default router;