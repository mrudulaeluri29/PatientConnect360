import path from "path";
import dotenv from "dotenv";

// Load from Server/.env first, then repo root — cwd-independent (fixes monorepo / wrong cwd).
const serverRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(__dirname, "../..");

dotenv.config({ path: path.join(serverRoot, ".env") });
dotenv.config({ path: path.join(repoRoot, ".env") });
