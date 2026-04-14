"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const apiTestClient_1 = require("./apiTestClient");
(0, apiTestClient_1.describeWithRoleCredentials)("Feature 5 — assignments", ["admin"], () => {
    let admin;
    let patientId = "";
    let clinicianId = "";
    let assignmentId = "";
    beforeAll(async () => {
        admin = await (0, apiTestClient_1.loginAs)("admin");
        const suffix = Date.now();
        const patientRes = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .post("/api/auth/register")
            .send({
            email: `feature5-assignment-patient-${suffix}@example.com`,
            username: `feature5_assignment_patient_${suffix}`,
            password: "Password123!",
            role: "PATIENT",
        })
            .expect(200);
        const clinicianRes = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .post("/api/auth/register")
            .send({
            email: `feature5-assignment-clinician-${suffix}@example.com`,
            username: `feature5_assignment_clinician_${suffix}`,
            password: "Password123!",
            role: "CLINICIAN",
        })
            .expect(200);
        patientId = patientRes.body.user.id;
        clinicianId = clinicianRes.body.user.id;
    });
    afterAll(async () => {
        if (assignmentId) {
            await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
                .delete(`/api/admin/assignments/${assignmentId}`)
                .set((0, apiTestClient_1.authed)(admin));
        }
        if (patientId) {
            await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
                .delete(`/api/admin/users/${patientId}`)
                .set((0, apiTestClient_1.authed)(admin));
        }
        if (clinicianId) {
            await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
                .delete(`/api/admin/users/${clinicianId}`)
                .set((0, apiTestClient_1.authed)(admin));
        }
    });
    it("creates an assignment", async () => {
        const res = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .post("/api/admin/assignments")
            .set((0, apiTestClient_1.authed)(admin))
            .send({ patientId, clinicianId })
            .expect(200);
        assignmentId = res.body.assignment.id;
        expect(res.body.assignment.isActive).toBe(true);
    });
    it("toggles assignment active/inactive", async () => {
        const inactive = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .patch(`/api/admin/assignments/${assignmentId}`)
            .set((0, apiTestClient_1.authed)(admin))
            .send({ isActive: false })
            .expect(200);
        expect(inactive.body.assignment.isActive).toBe(false);
        const active = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .patch(`/api/admin/assignments/${assignmentId}`)
            .set((0, apiTestClient_1.authed)(admin))
            .send({ isActive: true })
            .expect(200);
        expect(active.body.assignment.isActive).toBe(true);
    });
    it("records assignment audit logs", async () => {
        const res = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .get("/api/admin/audit-logs")
            .set((0, apiTestClient_1.authed)(admin))
            .query({ actionType: "ASSIGNMENT_UPDATED", search: assignmentId, limit: 20 })
            .expect(200);
        expect(Array.isArray(res.body.logs)).toBe(true);
        expect(res.body.logs.some((log) => log.targetId === assignmentId)).toBe(true);
    });
    it("removes the assignment", async () => {
        await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .delete(`/api/admin/assignments/${assignmentId}`)
            .set((0, apiTestClient_1.authed)(admin))
            .expect(200);
        const list = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .get("/api/admin/assignments")
            .set((0, apiTestClient_1.authed)(admin))
            .expect(200);
        expect(list.body.assignments.some((assignment) => assignment.id === assignmentId)).toBe(false);
        assignmentId = "";
    });
});
