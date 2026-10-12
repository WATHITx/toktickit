import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import { getPrisma } from "../prisma.js";
import { signSession, verifySession } from "../utils/jwt.js";
import { validatePassword } from "../validation/passwordValidation.js";
import { requireAuth, AuthedRequest } from "../middleware/auth.js";

const router = Router();
const GENERIC_ERROR = { error: "Invalid email or password" };
// dummy hash used to keep bcrypt.compare timing consistent when email is not found
const DUMMY_HASH = ".p7Aa";

router.post("/auth/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json(GENERIC_ERROR);

  try {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { email } });

    const hashToCompare = user ? user.passwordHash : DUMMY_HASH;
    const passwordMatches = await bcrypt.compare(password, hashToCompare);

    if (!user || !user.isActive || !passwordMatches) {
      return res.status(401).json(GENERIC_ERROR);
    }

    const token = signSession({ userId: user.id, role: user.role });
    res.cookie("toktickit_session", token, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 12 * 60 * 60 * 1000,
    });

    res.status(200).json({
      user: { id: user.id, name: user.name, role: user.role },
      mustChangePassword: user.mustChangePassword,
    });
  } catch {
    res.status(500).json({ error: "Unable to process login" });
  }
});

router.post("/auth/logout", (_req: Request, res: Response) => {
  res.clearCookie("toktickit_session");
  res.status(200).json({ success: true });
});

router.get("/auth/me", requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(401).json({ error: "Not authenticated" });
    res.status(200).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    });
  } catch {
    res.status(500).json({ error: "Unable to fetch current user" });
  }
});

// GET /api/auth/session — the app's start-up check. Same user shape as /auth/me, but answers 200 { user: null }
// when signed out, so opening the Login page does not log a 401 in the browser console (Lab 4 hardening).
// /auth/me keeps its Lab 3 contract (401 without a session).
router.get("/auth/session", async (req: Request, res: Response) => {
  const token = req.cookies?.toktickit_session;
  let userId: number | null = null;
  if (token) {
    try {
      userId = verifySession(token).userId;
    } catch {
      userId = null; // expired or tampered token = signed out
    }
  }
  if (userId === null) return res.status(200).json({ user: null });

  try {
    const user = await getPrisma().user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) return res.status(200).json({ user: null });
    res.status(200).json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, mustChangePassword: user.mustChangePassword },
    });
  } catch {
    res.status(500).json({ error: "Unable to check the session" });
  }
});

router.post("/auth/change-password", requireAuth, async (req: AuthedRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;

  const validationError = validatePassword(newPassword);
  if (validationError) return res.status(400).json({ error: validationError });

  try {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(401).json({ error: "Not authenticated" });

    const currentMatches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!currentMatches) return res.status(400).json({ error: "Current password is incorrect" });

    const newHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash, mustChangePassword: false },
    });

    res.status(200).json({ success: true });
  } catch {
    res.status(500).json({ error: "Unable to change password" });
  }
});

export default router;
