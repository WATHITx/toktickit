import { Router, Response } from "express";
import bcrypt from "bcrypt";
import { getPrisma } from "../prisma.js";
import { requireAuth, requireRole, AuthedRequest } from "../middleware/auth.js";
import { validatePassword } from "../validation/passwordValidation.js";

const router = Router();
// Applies to every route in this file (SEC-04). Scoped to /admin so it never intercepts other routers mounted on /api.
router.use("/admin", requireAuth, requireRole(["ADMINISTRATOR"]));

type RoleValue = "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
const VALID_ROLES: RoleValue[] = ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"];
const USER_SELECT = { id: true, name: true, email: true, role: true, isActive: true } as const;

const isRole = (v: unknown): v is RoleValue => typeof v === "string" && VALID_ROLES.includes(v as RoleValue);
const cleanString = (v: unknown) => (typeof v === "string" ? v.trim() : "");

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// GET /api/admin/users — list + search + optional role filter (FR-14)
router.get("/admin/users", async (req: AuthedRequest, res: Response) => {
  const search = typeof req.query.search === "string" ? req.query.search : "";
  const role = req.query.role;

  try {
    const users = await getPrisma().user.findMany({
      where: {
        ...(isRole(role) ? { role } : {}),
        ...(search ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        } : {}),
      },
      select: USER_SELECT,
      orderBy: { name: "asc" },
    });
    res.status(200).json(users);
  } catch (err) {
    console.error("Failed to fetch users:", err);
    res.status(500).json({ error: "Unable to fetch users" });
  }
});

// POST /api/admin/users — create (FR-15)
router.post("/admin/users", async (req: AuthedRequest, res: Response) => {
  const name = cleanString(req.body.name);
  const email = cleanString(req.body.email);
  const { role, isActive, initialPassword } = req.body;

  if (!name || !email) return res.status(400).json({ error: "Name and email are required" });
  if (!isRole(role)) return res.status(400).json({ error: "Invalid role" });

  const passwordError = validatePassword(initialPassword);
  if (passwordError) return res.status(400).json({ error: passwordError });

  try {
    const prisma = getPrisma();
    // BR-10: email must be unique (case-insensitive so "A@x.com" and "a@x.com" can't coexist)
    const existing = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
    if (existing) return res.status(400).json({ error: "A user with this email already exists" });

    const passwordHash = await bcrypt.hash(initialPassword, 10);
    const user = await prisma.user.create({
      data: { name, email, role, isActive: isActive ?? true, passwordHash, mustChangePassword: true },
      select: USER_SELECT,
    });
    res.status(201).json(user);
  } catch (err) {
    console.error("Failed to create user:", err);
    res.status(500).json({ error: "Unable to create user" });
  }
});

// PATCH /api/admin/users/:id — edit (FR-16)
router.patch("/admin/users/:id", async (req: AuthedRequest, res: Response) => {
  const targetId = parseId(req.params.id);
  if (!targetId) return res.status(404).json({ error: "User not found" });

  const { role, isActive } = req.body;
  const name = req.body.name !== undefined ? cleanString(req.body.name) : undefined;
  const email = req.body.email !== undefined ? cleanString(req.body.email) : undefined;

  if (role !== undefined && !isRole(role)) return res.status(400).json({ error: "Invalid role" });
  if (isActive !== undefined && typeof isActive !== "boolean") return res.status(400).json({ error: "Invalid active state" });
  if (name === "" || email === "") return res.status(400).json({ error: "Name and email cannot be empty" });

  try {
    const prisma = getPrisma();
    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target) return res.status(404).json({ error: "User not found" });

    // BR-17: an admin cannot deactivate their own account
    if (targetId === req.user!.id && isActive === false) {
      return res.status(400).json({ error: "Cannot deactivate your own account" });
    }

    // BR-18: never leave zero active Administrators (covers both deactivating and demoting)
    const losesAdminStatus =
      target.role === "ADMINISTRATOR" && target.isActive &&
      (isActive === false || (role !== undefined && role !== "ADMINISTRATOR"));

    if (losesAdminStatus) {
      const activeAdminCount = await prisma.user.count({ where: { role: "ADMINISTRATOR", isActive: true } });
      if (activeAdminCount <= 1) {
        return res.status(400).json({ error: "Cannot remove the last active Administrator" });
      }
    }

    // BR-10: no duplicate email (excluding the user being edited)
    if (email !== undefined && email !== target.email) {
      const dup = await prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" }, NOT: { id: targetId } },
      });
      if (dup) return res.status(400).json({ error: "A user with this email already exists" });
    }

    const user = await prisma.user.update({
      where: { id: targetId },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(role !== undefined && { role }),
        ...(isActive !== undefined && { isActive }),
      },
      select: USER_SELECT,
    });
    res.status(200).json(user);
  } catch (err) {
    console.error("Failed to update user:", err);
    res.status(500).json({ error: "Unable to update user" });
  }
});

// PATCH /api/admin/users/:id/reset-password (FR-17)
router.patch("/admin/users/:id/reset-password", async (req: AuthedRequest, res: Response) => {
  const targetId = parseId(req.params.id);
  if (!targetId) return res.status(404).json({ error: "User not found" });

  const { newInitialPassword } = req.body;
  const passwordError = validatePassword(newInitialPassword);
  if (passwordError) return res.status(400).json({ error: passwordError });

  try {
    const prisma = getPrisma();
    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target) return res.status(404).json({ error: "User not found" });

    const passwordHash = await bcrypt.hash(newInitialPassword, 10);
    await prisma.user.update({
      where: { id: target.id },
      data: { passwordHash, mustChangePassword: true },
    });
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Failed to reset password:", err);
    res.status(500).json({ error: "Unable to reset password" });
  }
});

export default router;
