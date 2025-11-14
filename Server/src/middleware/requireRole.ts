// Require Role Middleware
// Ensures that the authenticated user has the required role
// Used to protect admin routes and other role-based routes

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export function requireRole(role: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = (req as any).cookies?.auth;
      if (!token) return res.status(401).json({ error: "Unauthorized" });
      const payload = jwt.verify(token, process.env.JWT_SECRET || "dev_secret") as any;
      if (!payload?.role) return res.status(401).json({ error: "Unauthorized" });
      if (role && payload.role !== role) return res.status(403).json({ error: "Forbidden" });
      (req as any).user = { id: payload.uid, role: payload.role };
      next();
    } catch (e) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  };
}

// Convenience middleware for admin-only routes
export const requireAdmin = requireRole("ADMIN");

