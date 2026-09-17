import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";

const router = Router();

router.get("/related-systems", async (_req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const systems = await prisma.relatedSystem.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    res.status(200).json(systems);
  } catch (err) {
    res.status(500).json({ error: "Unable to fetch related systems" });
  }
});

export default router;