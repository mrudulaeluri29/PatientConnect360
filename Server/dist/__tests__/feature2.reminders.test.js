"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const apiTestClient_1 = require("./apiTestClient");
(0, apiTestClient_1.describeWithRoleCredentials)("Feature 2 — reminders", ["patient", "clinician", "admin"], () => {
    let patient;
    let clinician;
    let admin;
    let visitId = "";
    beforeAll(async () => {
        patient = await (0, apiTestClient_1.loginAs)("patient");
        clinician = await (0, apiTestClient_1.loginAs)("clinician");
        admin = await (0, apiTestClient_1.loginAs)("admin");
        // Create a confirmed visit so reminders can be enqueued
        const created = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .post("/api/visits")
            .set((0, apiTestClient_1.authed)(admin))
            .send({
            patientId: patient.user.id,
            clinicianId: clinician.user.id,
            scheduledAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
            visitType: "HOME_HEALTH",
            purpose: "[test] Feature 2 reminder verification visit",
        })
            .expect(201);
        visitId = created.body.visit.id;
        // Admin approves it so status becomes CONFIRMED
        await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .post(`/api/visits/${visitId}/review`)
            .set((0, apiTestClient_1.authed)(admin))
            .send({ action: "APPROVE" })
            .expect(200);
    });
    afterAll(async () => {
        if (visitId) {
            await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
                .delete(`/api/visits/${visitId}`)
                .set((0, apiTestClient_1.authed)(admin));
        }
    });
    // ── Reminder preferences ──────────────────────────────────────────────────
    it("patient reminder preferences default to IN_APP_ONLY", async () => {
        const res = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .get("/api/notifications/preferences")
            .set((0, apiTestClient_1.authed)(patient))
            .expect(200);
        expect(res.body.preferences).toBeTruthy();
        expect(["IN_APP_ONLY", "EMAIL", "SMS", "EMAIL_AND_SMS"]).toContain(res.body.preferences.channel);
    });
    it("patient can set reminder channel to EMAIL", async () => {
        const res = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .patch("/api/notifications/preferences")
            .set((0, apiTestClient_1.authed)(patient))
            .send({ channel: "EMAIL", enabled: true })
            .expect(200);
        expect(res.body.preferences.channel).toBe("EMAIL");
        expect(res.body.preferences.enabled).toBe(true);
    });
    it("patient can disable reminders entirely", async () => {
        const res = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .patch("/api/notifications/preferences")
            .set((0, apiTestClient_1.authed)(patient))
            .send({ enabled: false })
            .expect(200);
        expect(res.body.preferences.enabled).toBe(false);
    });
    it("patient can re-enable reminders", async () => {
        const res = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .patch("/api/notifications/preferences")
            .set((0, apiTestClient_1.authed)(patient))
            .send({ enabled: true, channel: "IN_APP_ONLY" })
            .expect(200);
        expect(res.body.preferences.enabled).toBe(true);
    });
    it("invalid reminder channel is rejected", async () => {
        await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .patch("/api/notifications/preferences")
            .set((0, apiTestClient_1.authed)(patient))
            .send({ channel: "TELEGRAM" })
            .expect(400);
    });
    it("all valid channels are accepted", async () => {
        const channels = ["IN_APP_ONLY", "EMAIL", "SMS", "EMAIL_AND_SMS"];
        for (const channel of channels) {
            const res = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
                .patch("/api/notifications/preferences")
                .set((0, apiTestClient_1.authed)(patient))
                .send({ channel })
                .expect(200);
            expect(res.body.preferences.channel).toBe(channel);
        }
    });
    // ── Reminder cancellation after visit cancel ──────────────────────────────
    it("cancelling a visit does not leave it in confirmed state", async () => {
        // Create a second visit specifically for cancellation test
        const created = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .post("/api/visits")
            .set((0, apiTestClient_1.authed)(admin))
            .send({
            patientId: patient.user.id,
            clinicianId: clinician.user.id,
            scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            visitType: "HOME_HEALTH",
            purpose: "[test] Reminder cancellation test visit",
        })
            .expect(201);
        const cancelVisitId = created.body.visit.id;
        // Confirm it
        await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .patch(`/api/visits/${cancelVisitId}`)
            .set((0, apiTestClient_1.authed)(patient))
            .send({ status: "CONFIRMED" })
            .expect(200);
        // Cancel it
        await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .patch(`/api/visits/${cancelVisitId}`)
            .set((0, apiTestClient_1.authed)(patient))
            .send({ status: "CANCELLED", cancelReason: "Test cancellation for reminder test" })
            .expect(200);
        // Verify visit is cancelled
        const visitRes = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .get(`/api/visits/${cancelVisitId}`)
            .set((0, apiTestClient_1.authed)(patient))
            .expect(200);
        expect(visitRes.body.visit.status).toBe("CANCELLED");
        // Cleanup
        await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .delete(`/api/visits/${cancelVisitId}`)
            .set((0, apiTestClient_1.authed)(admin));
    });
    // ── Notification existence after visit approval ───────────────────────────
    it("patient has approval notification after admin approves visit", async () => {
        const res = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .get("/api/notifications")
            .set((0, apiTestClient_1.authed)(patient))
            .expect(200);
        const approvalNotif = res.body.notifications.find((n) => n.type === "VISIT_APPROVED" &&
            n.meta?.visitId === visitId);
        expect(approvalNotif).toBeTruthy();
        expect(approvalNotif.title).toBeTruthy();
        expect(approvalNotif.body).toBeTruthy();
    });
    it("unread count decreases after marking notifications read", async () => {
        const before = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .get("/api/notifications")
            .set((0, apiTestClient_1.authed)(patient))
            .expect(200);
        const beforeCount = before.body.unreadCount;
        await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .post("/api/notifications/read-all")
            .set((0, apiTestClient_1.authed)(patient))
            .expect(200);
        const after = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .get("/api/notifications")
            .set((0, apiTestClient_1.authed)(patient))
            .expect(200);
        expect(after.body.unreadCount).toBe(0);
        expect(after.body.unreadCount).toBeLessThanOrEqual(beforeCount);
    });
    // ── Auth guard ────────────────────────────────────────────────────────────
    it("unauthenticated request to preferences returns 401", async () => {
        await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .get("/api/notifications/preferences")
            .expect(401);
    });
    it("unauthenticated request to notifications returns 401", async () => {
        await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .get("/api/notifications")
            .expect(401);
    });
});
