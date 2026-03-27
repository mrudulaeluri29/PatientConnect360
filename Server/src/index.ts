import "dotenv/config";  //loads .env file automatically 

//imports libraries for building server 
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./auth";
import passwordResetRoutes from "./passwordReset";
import adminRoutes from "./routes/admin";
import messagesRoutes from "./routes/messages_fixed";
import simpleMessagesRoutes from "./routes/simpleMessages";
import visitRoutes from "./routes/visits";
import medicationRoutes from "./routes/medications";
import vitalRoutes from "./routes/vitals";
import availabilityRoutes from "./routes/availability";
import caregiverInvitationRoutes from "./routes/caregiverInvitations";
import caregiverLinkRoutes from "./routes/caregiverLinks";
import caregiverOverviewRoutes from "./routes/caregiverOverview";
import caregiverProgressRoutes from "./routes/caregiverProgress";
import caregiverAlertsRoutes from "./routes/caregiverAlerts";
import caregiverAccessRoutes from "./routes/caregiverAccess";

// Import our Prisma database client
import { prisma } from "./db";

// No mailer in use since SendGrid was removed

const app = express(); //Creates an Express "application" this is our server.


app.use(cors({ origin: ["http://localhost:5173", "http://localhost:5174"], credentials: true })); //allows requests from our React app.
app.use(express.json());//tells Express to read JSON bodies
app.use(cookieParser()); //to access cookies later

//lets us know that the server is live
//When someone visits "http://localhost:4000/health", the server replies with { ok: true, time: "..." }
app.get("/health", (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// This sends a simple SQL query "SELECT NOW()" to Postgres
// If it succeeds, we know the server and DB are connected correctly.
app.get("/db/ping", async (_req, res) => {
  try {
    // Send a raw query to PostgreSQL to get the current timestamp
    const now = await prisma.$queryRaw`SELECT NOW() as now`;
    res.json({ db: "ok", now });
  } catch (error) {
    console.error("Database connection failed:", error);
    res.status(500).json({ db: "error", message: "Cannot reach database" });
  }
});
app.use("/api/auth", authRoutes);
app.use("/api/password-reset", passwordResetRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/simple-messages", simpleMessagesRoutes);
app.use("/api/visits", visitRoutes);
app.use("/api/medications", medicationRoutes);
app.use("/api/vitals", vitalRoutes);
app.use("/api/availability", availabilityRoutes);
app.use("/api/caregiver-invitations", caregiverInvitationRoutes);
app.use("/api/caregiver-links", caregiverLinkRoutes);
app.use("/api/caregiver/overview", caregiverOverviewRoutes);
app.use("/api/caregiver/progress", caregiverProgressRoutes);
app.use("/api/caregiver/alerts", caregiverAlertsRoutes);
app.use("/api/caregiver/access", caregiverAccessRoutes);

const PORT = Number(process.env.PORT || 4000); //Reads the port from .env (if not set, uses 4000 by default).

// Start server immediately (no email dependency)
app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`);
});
