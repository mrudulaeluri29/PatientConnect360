"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const apiTestClient_1 = require("./apiTestClient");
(0, apiTestClient_1.describeWithRoleCredentials)("Feature 4 records overview", ["patient", "clinician"], () => {
    let patient;
    let clinician;
    beforeAll(async () => {
        patient = await (0, apiTestClient_1.loginAs)("patient");
        clinician = await (0, apiTestClient_1.loginAs)("clinician");
    });
    it("patient loads overview for self", async () => {
        const res = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .get("/api/records/overview")
            .query({ patientId: patient.user.id })
            .set((0, apiTestClient_1.authed)(patient))
            .expect(200);
        expect(res.body.patientId).toBe(patient.user.id);
        expect(res.body).toHaveProperty("carePlan");
        expect(res.body).toHaveProperty("documents");
        expect(res.body).toHaveProperty("privacy");
        expect(res.body).toHaveProperty("therapyProgress");
        expect(res.body).toHaveProperty("recentVitals");
        expect(Array.isArray(res.body.carePlan.plans)).toBe(true);
        expect(Array.isArray(res.body.documents.items)).toBe(true);
        expect(res.body.privacy.viewerMayEditPrivacy).toBe(true);
        expect(res.body.therapyProgress).toHaveProperty("hep");
    });
    it("clinician loads overview for assigned patient", async () => {
        const res = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .get("/api/records/overview")
            .query({ patientId: patient.user.id })
            .set((0, apiTestClient_1.authed)(clinician))
            .expect(200);
        expect(res.body.patientId).toBe(patient.user.id);
        expect(res.body.carePlan.blocked).toBe(false);
        expect(res.body.documents.blocked).toBe(false);
        expect(res.body.privacy.viewerMayEditPrivacy).toBe(false);
    });
    it("patient cannot load another patient overview", async () => {
        await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .get("/api/records/overview")
            .query({ patientId: "someone-else-id" })
            .set((0, apiTestClient_1.authed)(patient))
            .expect(403);
    });
    it("patient may omit patientId (defaults to self)", async () => {
        const res = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .get("/api/records/overview")
            .set((0, apiTestClient_1.authed)(patient))
            .expect(200);
        expect(res.body.patientId).toBe(patient.user.id);
    });
    it("clinician requires patientId", async () => {
        await (0, supertest_1.default)(apiTestClient_1.BASE_URL).get("/api/records/overview").set((0, apiTestClient_1.authed)(clinician)).expect(400);
    });
});
(0, apiTestClient_1.describeWithRoleCredentials)("Feature 4 records overview — clinician scope", ["patient", "clinician"], () => {
    let patient;
    let clinician;
    beforeAll(async () => {
        patient = await (0, apiTestClient_1.loginAs)("patient");
        clinician = await (0, apiTestClient_1.loginAs)("clinician");
    });
    it("clinician gets 403 for patient not assigned", async () => {
        await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .get("/api/records/overview")
            .query({ patientId: "nonexistent-patient-cuid-00000000" })
            .set((0, apiTestClient_1.authed)(clinician))
            .expect(403);
    });
});
