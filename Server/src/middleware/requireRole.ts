// Require Role Middleware
// Ensures that the authenticated user has the required role
// Used to protect admin routes and other role-based routes

import { Request, Response, NextFunction } from "express";
// import jwt from "jsonwebtoken";
// import { prisma } from "../db";

export function requireRole(role: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // TODO: Implement role checking logic
    // 1. Get JWT token from cookies
    // 2. Verify token
    // 3. Get user from database
    // 4. Check if user.role matches required role
    // 5. If not, return 403 Forbidden
    // 6. If yes, attach user to request and call next()
    
    // Placeholder - always allow for now
    next();
  };
}

// Convenience middleware for admin-only routes
export const requireAdmin = requireRole("ADMIN");

