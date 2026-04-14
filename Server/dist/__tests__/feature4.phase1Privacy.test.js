"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const apiTestClient_1 = require("./apiTestClient");
/**
 * Phase 1: privacy settings are persisted via Prisma (`PatientPrivacySettings`).
 * Extends Feature 1 privacy test with explicit DTO shape checks.
 */
(0, apiTestClient_1.describeWithRoleCredentials)("Feature 4 Phase 1 privacy (Prisma-backed)", ["patient"], () => {
    let patient;
    beforeAll(async () => {
        patient = await (0, apiTestClient_1.loginAs)("patient");
    });
    it("GET /api/patients/me/privacy returns boolean toggles and optional consent fields", async () => {
        const res = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .get("/api/patients/me/privacy")
            .set((0, apiTestClient_1.authed)(patient))
            .expect(200);
        const s = res.body.settings;
        expect(typeof s.shareDocumentsWithCaregivers).toBe("boolean");
        expect(typeof s.carePlanVisibleToCaregivers).toBe("boolean");
        expect(s.consentRecordedAt === null || typeof s.consentRecordedAt === "string").toBe(true);
        expect(s.consentVersion === null || typeof s.consentVersion === "string").toBe(true);
    });
    it("PATCH persists toggles and returns updated settings", async () => {
        const current = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .get("/api/patients/me/privacy")
            .set((0, apiTestClient_1.authed)(patient))
            .expect(200);
        const a = current.body.settings.shareDocumentsWithCaregivers;
        const b = current.body.settings.carePlanVisibleToCaregivers;
        const updated = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .patch("/api/patients/me/privacy")
            .set((0, apiTestClient_1.authed)(patient))
            .send({
            shareDocumentsWithCaregivers: a,
            carePlanVisibleToCaregivers: b,
            recordConsent: true,
            consentVersion: "feature4-phase1-privacy",
        })
            .expect(200);
        expect(updated.body.settings.consentVersion).toBe("feature4-phase1-privacy");
        expect(updated.body.settings.consentRecordedAt).toBeTruthy();
    });
});
