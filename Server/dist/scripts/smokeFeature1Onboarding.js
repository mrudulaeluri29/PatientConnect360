"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const axios_1 = __importDefault(require("axios"));
const envUrl = process.env.VITE_API_URL?.trim() || "http://localhost:4000";
const BASE_URL = envUrl.replace("https://localhost", "http://localhost");
async function run() {
    console.log(`Starting Feature 1 Onboarding Smoke Test against ${BASE_URL}...`);
    // 1. Try to fetch direct registration url (mock data if not gating)
    console.log("1. Checking direct registration gating...");
    try {
        const res = await axios_1.default.post(`${BASE_URL}/api/auth/register`, {
            email: `smoke-${Date.now()}@test.com`,
            username: `smoke${Date.now()}`,
            password: "SmokeTestPassword1!",
            role: "PATIENT",
        });
        console.log(`   Result: Server allowed direct registration (dev mode). status: ${res.status}`);
    }
    catch (err) {
        if (err.response?.status === 403) {
            console.log(`   Result: Server successfully blocked direct registration. (403 Forbidden)`);
        }
        else {
            console.log(`   Result: Registration failed with status ${err.response?.status || "Unknown"}`);
        }
    }
    // 2. Validate a bogus invitation code
    console.log("2. Checking invitation code validation...");
    try {
        const res = await axios_1.default.get(`${BASE_URL}/api/onboarding-invitations/validate/SMOKE123`);
        if (res.data.valid === false) {
            console.log("   Result: Correctly rejected invalid invitation code.");
        }
        else {
            console.error("   Result: ERROR - accepted invalid invitation code!");
        }
    }
    catch (err) {
        console.log(`   Result: Validation endpoint error: ${err.message}`);
    }
    // 3. Check login lockout (will send a dummy locked login)
    console.log("3. Checking simple login rejection for nonexistent user...");
    try {
        await axios_1.default.post(`${BASE_URL}/api/auth/login`, {
            emailOrUsername: "smoke_dummy",
            password: "badpassword",
        });
    }
    catch (err) {
        console.log(`   Result: Successfully rejected login. Status: ${err.response?.status}`);
    }
    console.log("Smoke test complete.");
    process.exit(0);
}
run().catch((err) => {
    console.error("Smoke test failed:", err);
    process.exit(1);
});
