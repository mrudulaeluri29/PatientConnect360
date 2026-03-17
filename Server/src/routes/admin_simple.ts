import { Router, Request, Response } from "express";
import { prisma } from "../db";

const router = Router();

// Simple test route
router.get("/test", (req: Request, res: Response) => {
  res.json({ message: "Admin router is working!" });
});

// Get all users (no auth for testing)
router.get("/users", async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ users });
  } catch (e) {
    console.error("Admin get users failed:", e);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;