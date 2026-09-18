import { Router, Response } from "express";
import { getPrisma } from "../prisma.js";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth.js";

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

export default router;