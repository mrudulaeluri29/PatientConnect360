"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const apiTestClient_1 = require("./apiTestClient");
(0, apiTestClient_1.describeWithRoleCredentials)("Feature 1 privacy", ["patient", "clinician"], () => {
    let patient;
    let clinician;
    beforeAll(async () => {
        patient = await (0, apiTestClient_1.loginAs)("patient");
        clinician = await (0, apiTestClient_1.loginAs)("clinician");
    });
    it("gets and patches patient privacy consent settings", async () => {
        const current = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .get("/api/patients/me/privacy")
            .set((0, apiTestClient_1.authed)(patient))
            .expect(200);
        expect(typeof current.body.settings.shareDocumentsWithCaregivers).toBe("boolean");
        const updated = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .patch("/api/patients/me/privacy")
            .set((0, apiTestClient_1.authed)(patient))
            .send({
            shareDocumentsWithCaregivers: current.body.settings.shareDocumentsWithCaregivers,
            carePlanVisibleToCaregivers: current.body.settings.carePlanVisibleToCaregivers,
            recordConsent: true,
            consentVersion: "feature1-privacy-v1",
        })
            .expect(200);
        expect(updated.body.settings.consentVersion).toBe("feature1-privacy-v1");
        expect(updated.body.settings.consentRecordedAt).toBeTruthy();
    });
    it("rejects non-patient privacy access", async () => {
        await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .get("/api/patients/me/privacy")
            .set((0, apiTestClient_1.authed)(clinician))
            .expect(403);
    });
});
