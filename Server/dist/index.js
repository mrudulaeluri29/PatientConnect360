"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config"); //loads .env file automatically 
//imports libraries for building server 
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const auth_1 = __importDefault(require("./auth"));
const passwordReset_1 = __importDefault(require("./passwordReset"));
const admin_1 = __importDefault(require("./routes/admin"));
const messages_fixed_1 = __importDefault(require("./routes/messages_fixed"));
const simpleMessages_1 = __importDefault(require("./routes/simpleMessages"));
// Import our Prisma database client
const db_1 = require("./db");
// Import mailer initialization
const mailer_1 = require("./mailer");
const app = (0, express_1.default)(); //Creates an Express "application" this is our server.
app.use((0, cors_1.default)({ origin: ["http://localhost:5173", "http://localhost:5174"], credentials: true })); //allows requests from our React app.
app.use(express_1.default.json()); //tells Express to read JSON bodies
app.use((0, cookie_parser_1.default)()); //to access cookies later
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
        const now = await db_1.prisma.$queryRaw `SELECT NOW() as now`;
        res.json({ db: "ok", now });
    }
    catch (error) {
        console.error("Database connection failed:", error);
        res.status(500).json({ db: "error", message: "Cannot reach database" });
    }
});
app.use("/api/auth", auth_1.default);
app.use("/api/password-reset", passwordReset_1.default);
app.use("/api/admin", admin_1.default);
app.use("/api/messages", messages_fixed_1.default);
app.use("/api/simple-messages", simpleMessages_1.default);
const PORT = Number(process.env.PORT || 4000); //Reads the port from .env (if not set, uses 4000 by default).
// Wait for mailer to be ready before starting server
mailer_1.mailerReady
    .then(() => {
    app.listen(PORT, () => {
        console.log(`API running at http://localhost:${PORT}`);
    });
})
    .catch((err) => {
    console.error("Failed to initialize mailer, but starting server anyway:", err);
    app.listen(PORT, () => {
        console.log(`API running at http://localhost:${PORT} (email may not work)`);
    });
});
