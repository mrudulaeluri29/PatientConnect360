import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";

// Attaches { id, role } to req.user for any authenticated request.
// Does NOT enforce a specific role — use requireRole for that.
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = (req as any).cookies?.auth;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev_secret") as any;
    if (!payload?.uid) return res.status(401).json({ error: "Unauthorized" });

    (req as any).user = { id: payload.uid, role: payload.role };
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}
