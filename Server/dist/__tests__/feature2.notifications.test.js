"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const apiTestClient_1 = require("./apiTestClient");
(0, apiTestClient_1.describeWithRoleCredentials)("Feature 2 — notifications", ["patient", "clinician", "admin"], () => {
    let patient;
    let clinician;
    let admin;
    let visitId = "";
    beforeAll(async () => {
        patient = await (0, apiTestClient_1.loginAs)("patient");
        clinician = await (0, apiTestClient_1.loginAs)("clinician");
        admin = await (0, apiTestClient_1.loginAs)("admin");
        const created = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .post("/api/visits")
            .set((0, apiTestClient_1.authed)(admin))
            .send({
            patientId: patient.user.id,
            clinicianId: clinician.user.id,
            scheduledAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
            visitType: "HOME_HEALTH",
            purpose: "[test] Feature 2 notification verification visit",
        })
            .expect(201);
        visitId = created.body.visit.id;
    });
    afterAll(async () => {
        if (visitId) {
            await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
                .delete(`/api/visits/${visitId}`)
                .set((0, apiTestClient_1.authed)(admin));
        }
    });
    // ── Notification list ─────────────────────────────────────────────────────
    it("patient can fetch their notifications", async () => {
        const res = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .get("/api/notifications")
            .set((0, apiTestClient_1.authed)(patient))
            .expect(200);
        expect(Array.isArray(res.body.notifications)).toBe(true);
        expect(typeof res.body.unreadCount).toBe("number");
    });
    it("visit request creates a notification for the patient", async () => {
        const res = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .get("/api/notifications")
            .set((0, apiTestClient_1.authed)(patient))
            .expect(200);
        const visitNotif = res.body.notifications.find((n) => n.meta?.visitId === visitId);
        expect(visitNotif).toBeTruthy();
        expect(visitNotif.type).toBeTruthy();
    });
    it("patient can mark a notification as read", async () => {
        const listRes = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .get("/api/notifications")
            .set((0, apiTestClient_1.authed)(patient))
            .expect(200);
        const unread = listRes.body.notifications.find((n) => !n.isRead);
        if (!unread)
            return; // no unread — skip
        const res = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .post(`/api/notifications/${unread.id}/read`)
            .set((0, apiTestClient_1.authed)(patient))
            .expect(200);
        expect(res.body.notification.isRead).toBe(true);
    });
    it("patient can mark all notifications as read", async () => {
        const res = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .post("/api/notifications/read-all")
            .set((0, apiTestClient_1.authed)(patient))
            .expect(200);
        expect(res.body.ok).toBe(true);
    });
    it("patient cannot read another user notification", async () => {
        const clinicianNotifs = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .get("/api/notifications")
            .set((0, apiTestClient_1.authed)(clinician))
            .expect(200);
        const clinicianNotif = clinicianNotifs.body.notifications[0];
        if (!clinicianNotif)
            return;
        await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .post(`/api/notifications/${clinicianNotif.id}/read`)
            .set((0, apiTestClient_1.authed)(patient))
            .expect(403);
    });
    // ── Reminder preferences ──────────────────────────────────────────────────
    it("patient can fetch reminder preferences", async () => {
        const res = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .get("/api/notifications/preferences")
            .set((0, apiTestClient_1.authed)(patient))
            .expect(200);
        expect(res.body.preferences).toBeTruthy();
        expect(res.body.preferences.channel).toBeTruthy();
    });
    it("patient can update reminder preferences", async () => {
        const res = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .patch("/api/notifications/preferences")
            .set((0, apiTestClient_1.authed)(patient))
            .send({ channel: "EMAIL", enabled: true })
            .expect(200);
        expect(res.body.preferences.channel).toBe("EMAIL");
        expect(res.body.preferences.enabled).toBe(true);
    });
    it("invalid channel is rejected", async () => {
        await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .patch("/api/notifications/preferences")
            .set((0, apiTestClient_1.authed)(patient))
            .send({ channel: "INVALID_CHANNEL" })
            .expect(400);
    });
    // ── Cancellation notification ─────────────────────────────────────────────
    it("cancelling visit creates cancellation notification", async () => {
        // Patient confirms first
        await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .patch(`/api/visits/${visitId}`)
            .set((0, apiTestClient_1.authed)(patient))
            .send({ status: "CONFIRMED" });
        // Patient cancels
        await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .patch(`/api/visits/${visitId}`)
            .set((0, apiTestClient_1.authed)(patient))
            .send({ status: "CANCELLED", cancelReason: "Test cancellation reason" });
        visitId = ""; // prevent afterAll double-delete
        const res = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .get("/api/notifications")
            .set((0, apiTestClient_1.authed)(patient))
            .expect(200);
        const cancelNotif = res.body.notifications.find((n) => n.type === "VISIT_CANCELLED");
        expect(cancelNotif).toBeTruthy();
    });
});
