"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const apiTestClient_1 = require("./apiTestClient");
(0, apiTestClient_1.describeWithRoleCredentials)("Feature 1 care plans", ["patient", "clinician"], () => {
    let patient;
    let clinician;
    let planId = "";
    let itemId = "";
    beforeAll(async () => {
        patient = await (0, apiTestClient_1.loginAs)("patient");
        clinician = await (0, apiTestClient_1.loginAs)("clinician");
    });
    it("allows a patient to read scoped care plans", async () => {
        const res = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .get("/api/care-plans")
            .query({ patientId: patient.user.id })
            .set((0, apiTestClient_1.authed)(patient))
            .expect(200);
        expect(Array.isArray(res.body.carePlans)).toBe(true);
    });
    it("allows an assigned clinician to create and update a care plan", async () => {
        const created = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .post("/api/care-plans")
            .set((0, apiTestClient_1.authed)(clinician))
            .send({ patientId: patient.user.id, status: "ACTIVE" })
            .expect(201);
        planId = created.body.carePlan.id;
        const item = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .post(`/api/care-plans/${planId}/items`)
            .set((0, apiTestClient_1.authed)(clinician))
            .send({
            type: "GOAL",
            title: "[test] Walk safely to the kitchen",
            details: "Integration test care-plan item",
            sortOrder: 1,
        })
            .expect(201);
        itemId = item.body.item.id;
        await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .patch(`/api/care-plans/items/${itemId}`)
            .set((0, apiTestClient_1.authed)(clinician))
            .send({ details: "Updated by integration test", sortOrder: 2 })
            .expect(200);
        await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .patch(`/api/care-plans/${planId}`)
            .set((0, apiTestClient_1.authed)(clinician))
            .send({ status: "ON_HOLD" })
            .expect(200);
    });
    it("allows a patient to submit progress and check-ins", async () => {
        expect(planId).toBeTruthy();
        expect(itemId).toBeTruthy();
        await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .post(`/api/care-plans/items/${itemId}/progress`)
            .set((0, apiTestClient_1.authed)(patient))
            .send({ status: "IN_PROGRESS", note: "[test] Progress note" })
            .expect(200);
        await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .post(`/api/care-plans/${planId}/checkins`)
            .set((0, apiTestClient_1.authed)(patient))
            .send({ status: "OK", note: "[test] Check-in note" })
            .expect(201);
    });
});
