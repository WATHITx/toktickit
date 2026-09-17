import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "dev-only-secret-change-in-production";

export type SessionPayload = { userId: number; role: string };

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: "12h" });
}

export function verifySession(token: string): SessionPayload {
  return jwt.verify(token, SECRET) as SessionPayload;
}
