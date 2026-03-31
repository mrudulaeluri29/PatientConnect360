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
const visits_1 = __importDefault(require("./routes/visits"));
const medications_1 = __importDefault(require("./routes/medications"));
const vitals_1 = __importDefault(require("./routes/vitals"));
const availability_1 = __importDefault(require("./routes/availability"));
const caregiverInvitations_1 = __importDefault(require("./routes/caregiverInvitations"));
const caregiverLinks_1 = __importDefault(require("./routes/caregiverLinks"));
const caregiverOverview_1 = __importDefault(require("./routes/caregiverOverview"));
const caregiverProgress_1 = __importDefault(require("./routes/caregiverProgress"));
const caregiverAlerts_1 = __importDefault(require("./routes/caregiverAlerts"));
const caregiverAccess_1 = __importDefault(require("./routes/caregiverAccess"));
const caregiverSafety_1 = __importDefault(require("./routes/caregiverSafety"));
// Import our Prisma database client
const db_1 = require("./db");
// No mailer in use since SendGrid was removed
const app = (0, express_1.default)(); //Creates an Express "application" this is our server.
// Behind managed proxies (Render/Railway/etc.) so secure cookies can work correctly.
app.set("trust proxy", 1);
function parseAllowedOrigins(raw) {
    if (!raw)
        return [];
    return raw
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean);
}
const localDevOrigins = ["http://localhost:5173", "http://localhost:5174"];
const allowedOrigins = [
    ...localDevOrigins,
    ...parseAllowedOrigins(process.env.CORS_ORIGINS),
];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // allow non-browser requests (curl/postman) with no origin
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin))
            return callback(null, true);
        return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
})); // allows requests from the web app and sends cookies
app.use((0, cookie_parser_1.default)()); // before route handlers so req.cookies is always available
app.use(express_1.default.json()); // tells Express to read JSON bodies
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
app.use("/api/visits", visits_1.default);
app.use("/api/medications", medications_1.default);
app.use("/api/vitals", vitals_1.default);
app.use("/api/availability", availability_1.default);
app.use("/api/caregiver-invitations", caregiverInvitations_1.default);
app.use("/api/caregiver-links", caregiverLinks_1.default);
app.use("/api/caregiver/overview", caregiverOverview_1.default);
app.use("/api/caregiver/progress", caregiverProgress_1.default);
app.use("/api/caregiver/alerts", caregiverAlerts_1.default);
app.use("/api/caregiver/access", caregiverAccess_1.default);
app.use("/api/caregiver/safety", caregiverSafety_1.default);
const PORT = Number(process.env.PORT || 4000); //Reads the port from .env (if not set, uses 4000 by default).
// Start server immediately (no email dependency)
app.listen(PORT, () => {
    console.log(`API running at http://localhost:${PORT}`);
});
