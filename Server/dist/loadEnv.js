"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load from Server/.env first, then repo root — cwd-independent (fixes monorepo / wrong cwd).
const serverRoot = path_1.default.resolve(__dirname, "..");
const repoRoot = path_1.default.resolve(__dirname, "../..");
dotenv_1.default.config({ path: path_1.default.join(serverRoot, ".env") });
dotenv_1.default.config({ path: path_1.default.join(repoRoot, ".env") });
