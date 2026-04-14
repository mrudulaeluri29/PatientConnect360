"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const apiTestClient_1 = require("./apiTestClient");
// ── Core HEP workflow (clinician + patient) ──────────────────────────────────
(0, apiTestClient_1.describeWithRoleCredentials)("Feature 4 HEP", ["patient", "clinician"], () => {
    let patient;
    let clinician;
    let assignmentId = "";
    beforeAll(async () => {
        patient = await (0, apiTestClient_1.loginAs)("patient");
        clinician = await (0, apiTestClient_1.loginAs)("clinician");
    });
    it("clinician creates an HEP assignment for an assigned patient", async () => {
        const res = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .post("/api/hep/assignments")
            .set((0, apiTestClient_1.authed)(clinician))
            .send({
            patientId: patient.user.id,
            exerciseName: "[test] Heel raises",
            instructions: "Stand near a counter and rise onto toes 10 times.",
            frequencyPerWeek: 3,
            startDate: new Date().toISOString(),
        })
            .expect(201);
        assignmentId = res.body.assignment.id;
        expect(assignmentId).toBeTruthy();
        expect(res.body.assignment.exercise.name).toBe("[test] Heel raises");
    });
    it("clinician lists HEP assignments by patient", async () => {
        const res = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .get("/api/hep")
            .query({ patientId: patient.user.id })
            .set((0, apiTestClient_1.authed)(clinician))
            .expect(200);
        expect(Array.isArray(res.body.assignments)).toBe(true);
        expect(res.body.assignments.length).toBeGreaterThan(0);
    });
    it("clinician pauses the assignment", async () => {
        const res = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .patch(`/api/hep/assignments/${assignmentId}`)
            .set((0, apiTestClient_1.authed)(clinician))
            .send({ status: "PAUSED" })
            .expect(200);
        expect(res.body.assignment.status).toBe("PAUSED");
    });
    it("patient logs a completion", async () => {
        const res = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .post(`/api/hep/assignments/${assignmentId}/complete`)
            .set((0, apiTestClient_1.authed)(patient))
            .send({ comment: "[test] Completed once" })
            .expect(201);
        expect(res.body.completion).toBeTruthy();
        expect(res.body.completion.assignmentId).toBe(assignmentId);
    });
    it("patient cannot create assignments (403)", async () => {
        await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .post("/api/hep/assignments")
            .set((0, apiTestClient_1.authed)(patient))
            .send({
            patientId: patient.user.id,
            exerciseName: "[test] Unauthorized",
            instructions: "Should fail",
            frequencyPerWeek: 1,
            startDate: new Date().toISOString(),
        })
            .expect(403);
    });
    it("patient cannot update assignment status (403)", async () => {
        await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .patch(`/api/hep/assignments/${assignmentId}`)
            .set((0, apiTestClient_1.authed)(patient))
            .send({ status: "ACTIVE" })
            .expect(403);
    });
});
// ── Caregiver HEP access ─────────────────────────────────────────────────────
(0, apiTestClient_1.describeWithRoleCredentials)("Feature 4 HEP — caregiver", ["patient", "clinician", "caregiver"], () => {
    let patient;
    let clinician;
    let caregiver;
    let assignmentId = "";
    beforeAll(async () => {
        patient = await (0, apiTestClient_1.loginAs)("patient");
        clinician = await (0, apiTestClient_1.loginAs)("clinician");
        caregiver = await (0, apiTestClient_1.loginAs)("caregiver");
        const res = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .post("/api/hep/assignments")
            .set((0, apiTestClient_1.authed)(clinician))
            .send({
            patientId: patient.user.id,
            exerciseName: "[test-cg] Ankle circles",
            instructions: "Rotate each ankle 15 times clockwise and counter-clockwise.",
            frequencyPerWeek: 5,
            startDate: new Date().toISOString(),
        })
            .expect(201);
        assignmentId = res.body.assignment.id;
    });
    it("caregiver lists HEP for linked patient", async () => {
        const res = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .get("/api/hep")
            .query({ patientId: patient.user.id })
            .set((0, apiTestClient_1.authed)(caregiver))
            .expect(200);
        expect(Array.isArray(res.body.assignments)).toBe(true);
    });
    it("caregiver logs a completion on behalf of patient", async () => {
        const res = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .post(`/api/hep/assignments/${assignmentId}/complete`)
            .set((0, apiTestClient_1.authed)(caregiver))
            .send({ comment: "[test-cg] Caregiver logged on patient's behalf" })
            .expect(201);
        expect(res.body.completion).toBeTruthy();
    });
    it("caregiver cannot create assignments (403)", async () => {
        await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .post("/api/hep/assignments")
            .set((0, apiTestClient_1.authed)(caregiver))
            .send({
            patientId: patient.user.id,
            exerciseName: "[test-cg] Unauthorized",
            instructions: "Should fail",
            frequencyPerWeek: 1,
            startDate: new Date().toISOString(),
        })
            .expect(403);
    });
});
