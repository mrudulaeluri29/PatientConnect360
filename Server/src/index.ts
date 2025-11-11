import "dotenv/config";  //loads .env file automatically 

//imports libraries for building server 
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./auth";
import passwordResetRoutes from "./passwordReset";

// Import our Prisma database client
import { prisma } from "./db";

// Import mailer initialization
import { mailerReady } from "./mailer";

const app = express(); //Creates an Express "application" this is our server.


app.use(cors({ origin: "http://localhost:5173", credentials: true })); //allows requests from our React app.
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

const PORT = Number(process.env.PORT || 4000); //Reads the port from .env (if not set, uses 4000 by default).

// Wait for mailer to be ready before starting server
mailerReady
  .then(() => {
    app.listen(PORT, () => { //start listening for requests on this port
      console.log(`API running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize mailer, but starting server anyway:", err);
    app.listen(PORT, () => {
      console.log(`API running at http://localhost:${PORT} (email may not work)`);
    });
  });
