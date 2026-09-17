import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";

const router = Router();

router.get("/requesters", async (_req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const requesters = await prisma.user.findMany({
      where: { isActive: true, role: "REQUESTER" },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
    res.status(200).json(requesters);
  } catch (err) {
    console.error("Failed to fetch requesters:", err);
    res.status(500).json({ error: "Unable to fetch requesters" });
  }
});

export default router;