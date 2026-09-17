import { Request, Response, NextFunction } from "express";
import { verifySession } from "../utils/jwt.js";

export interface AuthedRequest extends Request {
  user?: { id: number; role: string };
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.toktickit_session;
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  try {
    const payload = verifySession(token);
    req.user = { id: payload.userId, role: payload.role };
    next();
  } catch {
    return res.status(401).json({ error: "Not authenticated" });
  }
}

export function requireRole(roles: string[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}
