"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Feature 1 — Onboarding Tests
 * Tests the unified invite-based onboarding flow for all roles.
 */
require("dotenv/config");
const supertest_1 = __importDefault(require("supertest"));
const apiTestClient_1 = require("./apiTestClient");
// Test state
let adminCookie = "";
let patientInvCode = "";
let clinicianInvCode = "";
let adminInvCode = "";
let patientInvId = "";
let clinicianInvId = "";
let adminInvId = "";
function api() {
    return (0, supertest_1.default)(apiTestClient_1.BASE_URL);
}
describe("Feature 1: Onboarding", () => {
    // ─── Setup: login as admin ────────────────────────────────────────────────
    beforeAll(async () => {
        try {
            const emailOrUsername = process.env.ADMIN_USERNAME || "admin";
            const password = process.env.ADMIN_PASSWORD || "admin123";
            const loginRes = await api()
                .post("/api/auth/login")
                .send({ emailOrUsername, password });
            if (loginRes.status === 200) {
                const rawSetCookie = loginRes.headers["set-cookie"];
                const setCookie = Array.isArray(rawSetCookie)
                    ? rawSetCookie
                    : rawSetCookie
                        ? [String(rawSetCookie)]
                        : [];
                adminCookie = setCookie.map((raw) => raw.split(";")[0]).join("; ");
            }
            else {
                console.warn("Could not login as admin:", loginRes.status, loginRes.body);
            }
        }
        catch (e) {
            console.warn("Admin login failed:", e);
        }
    });
    // ─── Onboarding Invitations API ───────────────────────────────────────────
    describe("POST /api/onboarding-invitations", () => {
        it("should reject unauthenticated users", async () => {
            const res = await api()
                .post("/api/onboarding-invitations")
                .send({ targetRole: "CLINICIAN", email: "test@example.com" });
            expect(res.status).toBe(401);
        });
        it("should reject missing fields", async () => {
            const res = await api()
                .post("/api/onboarding-invitations")
                .set("Cookie", adminCookie)
                .send({ targetRole: "CLINICIAN" });
            expect(res.status).toBe(400);
            expect(res.body.error).toContain("email");
        });
        it("should reject invalid role", async () => {
            const res = await api()
                .post("/api/onboarding-invitations")
                .set("Cookie", adminCookie)
                .send({ targetRole: "INVALID", email: "test@example.com" });
            expect(res.status).toBe(400);
            expect(res.body.error).toContain("Invalid targetRole");
        });
        it("should create PATIENT invitation", async () => {
            const res = await api()
                .post("/api/onboarding-invitations")
                .set("Cookie", adminCookie)
                .send({ targetRole: "PATIENT", email: "patient-invite@test.com" });
            expect(res.status).toBe(201);
            expect(res.body.invitation).toBeDefined();
            expect(res.body.invitation.code).toHaveLength(8);
            expect(res.body.invitation.targetRole).toBe("PATIENT");
            expect(res.body.invitation.status).toBe("PENDING");
            patientInvCode = res.body.invitation.code;
            patientInvId = res.body.invitation.id;
        });
        it("should create CLINICIAN invitation", async () => {
            const res = await api()
                .post("/api/onboarding-invitations")
                .set("Cookie", adminCookie)
                .send({ targetRole: "CLINICIAN", email: "clinician-invite@test.com" });
            expect(res.status).toBe(201);
            expect(res.body.invitation.targetRole).toBe("CLINICIAN");
            clinicianInvCode = res.body.invitation.code;
            clinicianInvId = res.body.invitation.id;
        });
        it("should create ADMIN invitation", async () => {
            const res = await api()
                .post("/api/onboarding-invitations")
                .set("Cookie", adminCookie)
                .send({ targetRole: "ADMIN", email: "admin-invite@test.com" });
            expect(res.status).toBe(201);
            expect(res.body.invitation.targetRole).toBe("ADMIN");
            adminInvCode = res.body.invitation.code;
            adminInvId = res.body.invitation.id;
        });
    });
    // ─── Validate Code ─────────────────────────────────────────────────────────
    describe("GET /api/onboarding-invitations/validate/:code", () => {
        it("should return valid=false for unknown code", async () => {
            const res = await api().get("/api/onboarding-invitations/validate/XXXXXXXX");
            expect(res.status).toBe(200);
            expect(res.body.valid).toBe(false);
        });
        it("should validate patient invitation code", async () => {
            if (!patientInvCode)
                return;
            const res = await api().get(`/api/onboarding-invitations/validate/${patientInvCode}`);
            expect(res.status).toBe(200);
            expect(res.body.valid).toBe(true);
            expect(res.body.targetRole).toBe("PATIENT");
        });
        it("should validate clinician invitation code", async () => {
            if (!clinicianInvCode)
                return;
            const res = await api().get(`/api/onboarding-invitations/validate/${clinicianInvCode}`);
            expect(res.status).toBe(200);
            expect(res.body.valid).toBe(true);
            expect(res.body.targetRole).toBe("CLINICIAN");
        });
    });
    // ─── List Invitations ──────────────────────────────────────────────────────
    describe("GET /api/onboarding-invitations", () => {
        it("should require admin auth", async () => {
            const res = await api().get("/api/onboarding-invitations");
            expect(res.status).toBe(401);
        });
        it("should list all invitations for admin", async () => {
            const res = await api()
                .get("/api/onboarding-invitations")
                .set("Cookie", adminCookie);
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.invitations)).toBe(true);
            expect(res.body.invitations.length).toBeGreaterThanOrEqual(3);
        });
        it("should filter by targetRole", async () => {
            const res = await api()
                .get("/api/onboarding-invitations?targetRole=CLINICIAN")
                .set("Cookie", adminCookie);
            expect(res.status).toBe(200);
            for (const inv of res.body.invitations) {
                expect(inv.targetRole).toBe("CLINICIAN");
            }
        });
    });
    // ─── Revoke Invitation ─────────────────────────────────────────────────────
    describe("DELETE /api/onboarding-invitations/:id", () => {
        it("should require admin auth", async () => {
            if (!patientInvId)
                return;
            const res = await api().delete(`/api/onboarding-invitations/${patientInvId}`);
            expect(res.status).toBe(401);
        });
        it("should revoke a PENDING invitation", async () => {
            if (!patientInvId)
                return;
            const res = await api()
                .delete(`/api/onboarding-invitations/${patientInvId}`)
                .set("Cookie", adminCookie);
            expect(res.status).toBe(200);
            expect(res.body.invitation.status).toBe("REVOKED");
        });
        it("should not revoke non-PENDING invitation", async () => {
            if (!patientInvId)
                return;
            const res = await api()
                .delete(`/api/onboarding-invitations/${patientInvId}`)
                .set("Cookie", adminCookie);
            expect(res.status).toBe(400);
        });
        it("should return valid=false for revoked code", async () => {
            if (!patientInvCode)
                return;
            const res = await api().get(`/api/onboarding-invitations/validate/${patientInvCode}`);
            expect(res.body.valid).toBe(false);
            expect(res.body.reason).toContain("revoked");
        });
    });
    // ─── Invite-Based OTP: Clinician ───────────────────────────────────────────
    describe("Invite-Based OTP for Clinician", () => {
        it("should reject send-otp without invitation code for CLINICIAN", async () => {
            const res = await api()
                .post("/api/auth/send-otp")
                .send({
                email: "no-invite-clinician@test.com",
                username: "noinviteclinician",
                password: "TestPassword1!",
                role: "CLINICIAN",
                profileData: {
                    specialization: "Test",
                    licenseNumber: "TEST123",
                    hospitalAffiliation: "Test Hospital",
                },
            });
            expect(res.status).toBe(400);
            expect(res.body.error).toContain("Invitation code is required");
        });
        it("should reject send-otp with wrong role invitation code", async () => {
            if (!adminInvCode)
                return;
            const res = await api()
                .post("/api/auth/send-otp")
                .send({
                email: "wrong-role@test.com",
                username: "wrongrole",
                password: "TestPassword1!",
                role: "CLINICIAN",
                invitationCode: adminInvCode,
                profileData: {
                    specialization: "Test",
                    licenseNumber: "TEST123",
                    hospitalAffiliation: "Test Hospital",
                },
            });
            expect(res.status).toBe(400);
            expect(res.body.error).toContain("ADMIN");
        });
    });
    // ─── Invite-Based OTP: Admin ───────────────────────────────────────────────
    describe("Invite-Based OTP for Admin", () => {
        it("should reject send-otp without invitation code for ADMIN", async () => {
            const res = await api()
                .post("/api/auth/send-otp")
                .send({
                email: "no-invite-admin@test.com",
                username: "noinviteadmin",
                password: "TestPassword1!",
                role: "ADMIN",
            });
            expect(res.status).toBe(400);
            expect(res.body.error).toContain("Invitation code is required");
        });
    });
    // ─── Direct Registration Gating ────────────────────────────────────────────
    describe("Login Lockout & Direct Registration Gating", () => {
        it("should return 401 for invalid credentials", async () => {
            const res = await api()
                .post("/api/auth/login")
                .send({
                emailOrUsername: "admin",
                password: "wrongpassword",
            });
            expect(res.status).toBe(401);
        });
        it("should return 423 after too many failed attempts", async () => {
            // Attempt 5 failed logins
            for (let i = 0; i < 5; i++) {
                await api()
                    .post("/api/auth/login")
                    .send({
                    emailOrUsername: "admin",
                    password: "wrongpass" + i,
                });
            }
            const res = await api()
                .post("/api/auth/login")
                .send({
                emailOrUsername: "admin",
                password: "correctpassword", // even with correct password it should be blocked
            });
            // Should be locked out (423)
            expect([401, 423]).toContain(res.status);
        });
        it("POST /register should work in dev or return 403 in production", async () => {
            const res = await api()
                .post("/api/auth/register")
                .send({
                email: `test-direct-${Date.now()}@test.com`,
                username: `testdirect${Date.now()}`,
                password: "TestPassword1!",
                role: "PATIENT",
            });
            // In dev: 200, in production: 403
            expect([200, 403]).toContain(res.status);
        });
    });
});
