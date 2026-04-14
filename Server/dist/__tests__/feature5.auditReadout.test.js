"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const apiTestClient_1 = require("./apiTestClient");
(0, apiTestClient_1.describeWithRoleCredentials)("Feature 5 — audit readout", ["admin"], () => {
    let admin;
    beforeAll(async () => {
        admin = await (0, apiTestClient_1.loginAs)("admin");
    });
    it("filters audit log by action type and returns admin-friendly labels", async () => {
        const res = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .get("/api/admin/audit-logs")
            .set((0, apiTestClient_1.authed)(admin))
            .query({ actionType: "LOGIN", limit: 10 })
            .expect(200);
        expect(Array.isArray(res.body.logs)).toBe(true);
        res.body.logs.forEach((log) => {
            expect(log.actionType).toBe("LOGIN");
            expect(typeof log.actionLabel).toBe("string");
        });
    });
    it("filters audit log by actor role and paginates correctly", async () => {
        const res = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .get("/api/admin/audit-logs")
            .set((0, apiTestClient_1.authed)(admin))
            .query({ actorRole: "ADMIN", limit: 5, offset: 0 })
            .expect(200);
        expect(res.body.limit).toBe(5);
        expect(res.body.offset).toBe(0);
        expect(typeof res.body.total).toBe("number");
    });
    it("supports date range filtering", async () => {
        const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const to = new Date().toISOString().slice(0, 10);
        const res = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .get("/api/admin/audit-logs")
            .set((0, apiTestClient_1.authed)(admin))
            .query({ from, to, limit: 10 })
            .expect(200);
        expect(Array.isArray(res.body.logs)).toBe(true);
    });
    it("exports audit CSV with matching filters", async () => {
        const res = await (0, supertest_1.default)(apiTestClient_1.BASE_URL)
            .get("/api/admin/audit-logs/export")
            .set((0, apiTestClient_1.authed)(admin))
            .query({ actionType: "LOGIN" })
            .expect(200);
        expect(String(res.headers["content-type"] || "")).toContain("text/csv");
        expect(res.text).toContain("When");
        expect(res.text).toContain("Action");
    });
});
