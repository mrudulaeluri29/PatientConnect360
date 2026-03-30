"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const router = (0, express_1.Router)();
// Simple test route
router.get("/test", (req, res) => {
    res.json({ message: "Admin router is working!" });
});
// Get all users (no auth for testing)
router.get("/users", async (req, res) => {
    try {
        const users = await db_1.prisma.user.findMany({
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
    }
    catch (e) {
        console.error("Admin get users failed:", e);
        res.status(500).json({ error: "Server error" });
    }
});
exports.default = router;
