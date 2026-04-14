"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const apiTestClient_1 = require("./apiTestClient");
(0, apiTestClient_1.describeWithRoleCredentials)("Feature 1 documents", ["patient", "clinician"], () => {
    let patient;
    let clinician;
    let documentId = "";
    beforeAll(async () => {
        patient = await (0, apiTestClient_1.loginAs)("patient");
        clinician = await (0, apiTestClient_1.loginAs)("clinician");
    });
    it("lists patient documents", async () => {
        const res = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .get("/api/patient-documents")
            .query({ patientId: patient.user.id })
            .set((0, apiTestClient_1.authed)(patient))
            .expect(200);
        expect(Array.isArray(res.body.documents)).toBe(true);
    });
    it("uploads, updates, and requests download URLs when storage is configured", async () => {
        const upload = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .post("/api/patient-documents")
            .set((0, apiTestClient_1.authed)(clinician))
            .field("patientId", patient.user.id)
            .field("docType", "TEST_NOTE")
            .attach("file", Buffer.from("Feature 1 document integration test"), "feature1-test-note.txt");
        if (upload.status === 503) {
            expect(upload.body.error).toMatch(/storage/i);
            return;
        }
        expect(upload.status).toBe(201);
        documentId = upload.body.document.id;
        await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .patch(`/api/patient-documents/${documentId}`)
            .set((0, apiTestClient_1.authed)(clinician))
            .send({ isHidden: true })
            .expect(200);
        const download = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .post(`/api/patient-documents/${documentId}/download-url`)
            .set((0, apiTestClient_1.authed)(clinician))
            .send({});
        expect([200, 503]).toContain(download.status);
    });
});
