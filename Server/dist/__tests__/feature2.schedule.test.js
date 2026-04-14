"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const apiTestClient_1 = require("./apiTestClient");
(0, apiTestClient_1.describeWithRoleCredentials)("Feature 2 — schedule aggregation", ["patient", "clinician", "admin", "caregiver"], () => {
    let patient;
    let clinician;
    let admin;
    let caregiver;
    let visitId = "";
    const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const to = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString();
    beforeAll(async () => {
        patient = await (0, apiTestClient_1.loginAs)("patient");
        clinician = await (0, apiTestClient_1.loginAs)("clinician");
        admin = await (0, apiTestClient_1.loginAs)("admin");
        caregiver = await (0, apiTestClient_1.loginAs)("caregiver");
        // Create a test visit so the schedule has at least one event
        const created = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .post("/api/visits")
            .set((0, apiTestClient_1.authed)(admin))
            .send({
            patientId: patient.user.id,
            clinicianId: clinician.user.id,
            scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            visitType: "HOME_HEALTH",
            purpose: "[test] Feature 2 schedule verification visit",
        })
            .expect(201);
        visitId = created.body.visit.id;
    });
    afterAll(async () => {
        // Clean up test visit
        if (visitId) {
            await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
                .delete(`/api/visits/${visitId}`)
                .set((0, apiTestClient_1.authed)(admin));
        }
    });
    // ── Patient schedule ──────────────────────────────────────────────────────
    it("patient can fetch their own schedule", async () => {
        const res = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .get("/api/schedule")
            .set((0, apiTestClient_1.authed)(patient))
            .query({ from, to })
            .expect(200);
        expect(Array.isArray(res.body.events)).toBe(true);
        const visitEvents = res.body.events.filter((e) => e.kind === "VISIT");
        expect(visitEvents.length).toBeGreaterThanOrEqual(1);
    });
    it("patient schedule events have required fields", async () => {
        const res = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .get("/api/schedule")
            .set((0, apiTestClient_1.authed)(patient))
            .query({ from, to })
            .expect(200);
        const event = res.body.events.find((e) => e.id === visitId);
        expect(event).toBeTruthy();
        expect(event.kind).toBe("VISIT");
        expect(event.title).toBeTruthy();
        expect(event.startAt).toBeTruthy();
        expect(event.endAt).toBeTruthy();
        expect(event.status).toBeTruthy();
        expect(event.patient).toBeTruthy();
        expect(event.clinician).toBeTruthy();
    });
    it("patient cannot see other patients visits", async () => {
        const res = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .get("/api/schedule")
            .set((0, apiTestClient_1.authed)(patient))
            .query({ from, to })
            .expect(200);
        const events = res.body.events;
        events.forEach((e) => {
            if (e.patient) {
                expect(e.patient.id).toBe(patient.user.id);
            }
        });
    });
    // ── Clinician schedule ────────────────────────────────────────────────────
    it("clinician can fetch their own schedule", async () => {
        const res = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .get("/api/schedule")
            .set((0, apiTestClient_1.authed)(clinician))
            .query({ from, to })
            .expect(200);
        expect(Array.isArray(res.body.events)).toBe(true);
    });
    it("clinician schedule includes availability blocks when requested", async () => {
        const res = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .get("/api/schedule")
            .set((0, apiTestClient_1.authed)(clinician))
            .query({ from, to, includeAvailability: "true" })
            .expect(200);
        expect(Array.isArray(res.body.events)).toBe(true);
        // availability blocks may or may not exist but response must be valid
        const kinds = res.body.events.map((e) => e.kind);
        kinds.forEach((k) => {
            expect(["VISIT", "PREP_TASK", "AVAILABILITY_BLOCK"]).toContain(k);
        });
    });
    it("clinician schedule events show canCheckIn for confirmed visits", async () => {
        // Confirm the visit first
        await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .patch(`/api/visits/${visitId}`)
            .set((0, apiTestClient_1.authed)(patient))
            .send({ status: "CONFIRMED" });
        const res = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .get("/api/schedule")
            .set((0, apiTestClient_1.authed)(clinician))
            .query({ from, to })
            .expect(200);
        const event = res.body.events.find((e) => e.id === visitId);
        if (event) {
            expect(event.canCheckIn).toBe(true);
        }
    });
    // ── Admin schedule ────────────────────────────────────────────────────────
    it("admin can fetch schedule with no role restriction", async () => {
        const res = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .get("/api/schedule")
            .set((0, apiTestClient_1.authed)(admin))
            .query({ from, to })
            .expect(200);
        expect(Array.isArray(res.body.events)).toBe(true);
    });
    it("admin can filter schedule by patientId", async () => {
        const res = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .get("/api/schedule")
            .set((0, apiTestClient_1.authed)(admin))
            .query({ from, to, patientId: patient.user.id })
            .expect(200);
        const events = res.body.events;
        events.forEach((e) => {
            if (e.patient) {
                expect(e.patient.id).toBe(patient.user.id);
            }
        });
    });
    it("admin schedule includes availability when requested", async () => {
        const res = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .get("/api/schedule")
            .set((0, apiTestClient_1.authed)(admin))
            .query({ from, to, includeAvailability: "true" })
            .expect(200);
        expect(Array.isArray(res.body.events)).toBe(true);
    });
    // ── Range filtering ───────────────────────────────────────────────────────
    it("schedule respects from/to date range", async () => {
        const narrowFrom = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString();
        const narrowTo = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
        const res = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .get("/api/schedule")
            .set((0, apiTestClient_1.authed)(admin))
            .query({ from: narrowFrom, to: narrowTo })
            .expect(200);
        // Our test visit is 3 days out — should not appear in 1-2 day window
        const found = res.body.events.find((e) => e.id === visitId);
        expect(found).toBeUndefined();
    });
    // ── Auth guard ────────────────────────────────────────────────────────────
    it("unauthenticated request to /api/schedule returns 401", async () => {
        await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .get("/api/schedule")
            .query({ from, to })
            .expect(401);
    });
});
