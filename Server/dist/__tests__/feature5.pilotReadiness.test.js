"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const apiTestClient_1 = require("./apiTestClient");
(0, apiTestClient_1.describeWithRoleCredentials)("Feature 5 — pilot readiness", ["admin"], () => {
    let admin;
    let originalSettings;
    beforeAll(async () => {
        admin = await (0, apiTestClient_1.loginAs)("admin");
        const settings = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .get("/api/admin/settings")
            .set((0, apiTestClient_1.authed)(admin))
            .expect(200);
        originalSettings = settings.body.settings;
    });
    afterAll(async () => {
        if (originalSettings) {
            await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
                .put("/api/admin/settings")
                .set((0, apiTestClient_1.authed)(admin))
                .send(originalSettings);
        }
    });
    it("returns checklist, status, and feature flags", async () => {
        const res = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .get("/api/admin/pilot-readiness")
            .set((0, apiTestClient_1.authed)(admin))
            .expect(200);
        expect(typeof res.body.status).toBe("string");
        expect(typeof res.body.readinessScore).toBe("number");
        expect(Array.isArray(res.body.checklist)).toBe(true);
        expect(res.body.featureFlags).toBeTruthy();
    });
    it("reflects updated pilot switches in readiness output", async () => {
        await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .put("/api/admin/settings")
            .set((0, apiTestClient_1.authed)(admin))
            .send({
            ...originalSettings,
            messagingEnabled: false,
            feedbackEnabled: false,
        })
            .expect(200);
        const res = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .get("/api/admin/pilot-readiness")
            .set((0, apiTestClient_1.authed)(admin))
            .expect(200);
        expect(res.body.featureFlags.messagingEnabled).toBe(false);
        expect(res.body.featureFlags.feedbackEnabled).toBe(false);
    });
});
