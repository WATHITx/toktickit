import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import { getPrisma } from "../prisma.js";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_SIZE = 5 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (_req, file, cb) => cb(null, crypto.randomUUID() + path.extname(file.originalname)),
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_TYPES.includes(file.mimetype)) return cb(new Error("UNSUPPORTED_TYPE"));
    cb(null, true);
  },
});

const router = Router();

router.post("/tickets/:id/attachments", (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      if (err.message === "UNSUPPORTED_TYPE") {
        return res.status(400).json({ error: "Only JPG, PNG, WEBP, and PDF files are allowed" });
      }
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "File exceeds the 5MB size limit" });
      }
      return next(err);
    }
    next();
  });
}, async (req: Request, res: Response) => {
  const ticketId = Number(req.params.id);
  const requesterId = Number(req.body.requesterId);

  try {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    if (ticket.requesterId !== requesterId) return res.status(403).json({ error: "Access denied" });

    const activeCount = await prisma.attachment.count({ where: { ticketId, isRemoved: false } });
    if (activeCount >= 5) {
      return res.status(400).json({ error: "Maximum of five active attachments per ticket" });
    }
    if (!req.file) return res.status(400).json({ error: "No file provided" });

    const attachment = await prisma.attachment.create({
      data: {
        ticketId,
        fileName: req.file.originalname,
        storedName: req.file.filename,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
      },
    });

    res.status(201).json(attachment);
  } catch (err) {
    res.status(500).json({ error: "Unable to upload attachment" });
  }
});

router.get("/attachments/:id/download", async (req: Request, res: Response) => {
  const prisma = getPrisma();
  const attachment = await prisma.attachment.findUnique({ where: { id: Number(req.params.id) } });
  if (!attachment || attachment.isRemoved) {
    return res.status(404).json({ error: "Attachment not available" });
  }
  res.download(path.join("uploads", attachment.storedName), attachment.fileName);
});

router.delete("/attachments/:id", async (req: Request, res: Response) => {
  const { requesterId, reason } = req.body;
  if (!reason || reason.trim().length === 0) {
    return res.status(400).json({ error: "A removal reason is required" });
  }

  try {
    const prisma = getPrisma();
    const attachment = await prisma.attachment.findUnique({
      where: { id: Number(req.params.id) },
      include: { ticket: true },
    });
    if (!attachment) return res.status(404).json({ error: "Attachment not found" });
    if (attachment.ticket.requesterId !== requesterId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const updated = await prisma.attachment.update({
      where: { id: attachment.id },
      data: { isRemoved: true, removedReason: reason, removedAt: new Date() },
    });
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ error: "Unable to remove attachment" });
  }
});

export default router;