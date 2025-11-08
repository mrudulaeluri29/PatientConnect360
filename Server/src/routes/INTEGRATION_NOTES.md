# Admin Routes Integration Notes (Server)

## Current Status

Admin routes structure has been created but not yet integrated into the main server index.ts.

## Integration (When Ready)

To integrate admin routes into the server, update `Server/src/index.ts`:

```typescript
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./auth";
import adminRoutes from "./routes/admin"; // Import admin routes

const app = express();

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Health check routes
app.get("/health", (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// Regular auth routes
app.use("/api/auth", authRoutes);

// Admin routes - protected by requireRole('ADMIN') middleware
app.use("/api/admin", adminRoutes);

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`);
});
```

## Route Structure

- Regular API: `/api/auth/*`, `/api/dashboard/*`
- Admin API: `/api/admin/*` (all routes require ADMIN role)

## Security

All admin routes should be protected with `requireRole('ADMIN')` middleware:

```typescript
import { requireAdmin } from "../middleware/requireRole";

router.get("/users", requireAdmin, async (req, res) => {
  // Admin-only endpoint
});
```

## Next Steps

1. Implement requireRole middleware
2. Integrate admin routes into index.ts
3. Protect all admin routes with requireAdmin middleware
4. Test admin API access

