"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const apiTestClient_1 = require("./apiTestClient");
(0, apiTestClient_1.describeWithRoleCredentials)("Feature 4 prep tasks", ["patient", "clinician", "admin"], () => {
    let patient;
    let clinician;
    let admin;
    let visitId = "";
    let taskId = "";
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
            scheduledAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
            visitType: "HOME_HEALTH",
            purpose: "[test] Prep task verification visit",
        })
            .expect(201);
        visitId = created.body.visit.id;
    });
    it("clinician creates a prep task", async () => {
        const res = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .post(`/api/visits/${visitId}/prep-tasks`)
            .set((0, apiTestClient_1.authed)(clinician))
            .send({ text: "[test] Place medication list on kitchen table" })
            .expect(201);
        taskId = res.body.task.id;
        expect(taskId).toBeTruthy();
        expect(res.body.task.text).toBe("[test] Place medication list on kitchen table");
    });
    it("patient lists prep tasks for the visit", async () => {
        const res = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .get(`/api/visits/${visitId}/prep-tasks`)
            .set((0, apiTestClient_1.authed)(patient))
            .expect(200);
        expect(Array.isArray(res.body.tasks)).toBe(true);
        expect(res.body.tasks.length).toBeGreaterThan(0);
    });
    it("patient marks a prep task done", async () => {
        const res = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .patch(`/api/visits/prep-tasks/${taskId}`)
            .set((0, apiTestClient_1.authed)(patient))
            .send({ isDone: true })
            .expect(200);
        expect(res.body.task.isDone).toBe(true);
    });
    it("patient can un-mark a prep task", async () => {
        const res = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .patch(`/api/visits/prep-tasks/${taskId}`)
            .set((0, apiTestClient_1.authed)(patient))
            .send({ isDone: false })
            .expect(200);
        expect(res.body.task.isDone).toBe(false);
    });
    it("clinician edits the task text", async () => {
        const res = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .patch(`/api/visits/prep-tasks/${taskId}`)
            .set((0, apiTestClient_1.authed)(clinician))
            .send({ text: "[test] Updated — bring insurance card too" })
            .expect(200);
        expect(res.body.task.text).toBe("[test] Updated — bring insurance card too");
    });
    it("patient cannot create prep tasks (403)", async () => {
        await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .post(`/api/visits/${visitId}/prep-tasks`)
            .set((0, apiTestClient_1.authed)(patient))
            .send({ text: "[test] Should be forbidden" })
            .expect(403);
    });
});
// ── Caregiver prep-task access ───────────────────────────────────────────────
(0, apiTestClient_1.describeWithRoleCredentials)("Feature 4 prep tasks — caregiver", ["patient", "clinician", "admin", "caregiver"], () => {
    let patient;
    let clinician;
    let admin;
    let caregiver;
    let visitId = "";
    let taskId = "";
    beforeAll(async () => {
        patient = await (0, apiTestClient_1.loginAs)("patient");
        clinician = await (0, apiTestClient_1.loginAs)("clinician");
        admin = await (0, apiTestClient_1.loginAs)("admin");
        caregiver = await (0, apiTestClient_1.loginAs)("caregiver");
        const created = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .post("/api/visits")
            .set((0, apiTestClient_1.authed)(admin))
            .send({
            patientId: patient.user.id,
            clinicianId: clinician.user.id,
            scheduledAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
            visitType: "HOME_HEALTH",
            purpose: "[test-cg] Caregiver prep task visit",
        })
            .expect(201);
        visitId = created.body.visit.id;
        const taskRes = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .post(`/api/visits/${visitId}/prep-tasks`)
            .set((0, apiTestClient_1.authed)(clinician))
            .send({ text: "[test-cg] Clear path to bathroom" })
            .expect(201);
        taskId = taskRes.body.task.id;
    });
    it("caregiver lists prep tasks for linked patient's visit", async () => {
        const res = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .get(`/api/visits/${visitId}/prep-tasks`)
            .set((0, apiTestClient_1.authed)(caregiver))
            .expect(200);
        expect(Array.isArray(res.body.tasks)).toBe(true);
        expect(res.body.tasks.length).toBeGreaterThan(0);
    });
    it("caregiver marks a prep task done", async () => {
        const res = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .patch(`/api/visits/prep-tasks/${taskId}`)
            .set((0, apiTestClient_1.authed)(caregiver))
            .send({ isDone: true })
            .expect(200);
        expect(res.body.task.isDone).toBe(true);
    });
    it("caregiver cannot create prep tasks (403)", async () => {
        await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .post(`/api/visits/${visitId}/prep-tasks`)
            .set((0, apiTestClient_1.authed)(caregiver))
            .send({ text: "[test-cg] Should be forbidden" })
            .expect(403);
    });
});
