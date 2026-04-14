"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const supertest_1 = __importDefault(require("supertest"));
const BASE_URL = process.env.FEATURE_TEST_BASE_URL || "http://localhost:4000";
function required(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required env var: ${name}`);
    }
    return value;
}
function cookieFrom(res) {
    const raw = res.headers["set-cookie"];
    const cookies = Array.isArray(raw) ? raw : raw ? [String(raw)] : [];
    const cookie = cookies.map((item) => item.split(";")[0]).join("; ");
    if (!cookie)
        throw new Error("No auth cookie returned.");
    return cookie;
}
async function loginAsAdmin() {
    const res = await (0, supertest_1.default)(BASE_URL)
        .post("/api/auth/login")
        .send({
        emailOrUsername: required("FEATURE_TEST_ADMIN_LOGIN"),
        password: required("FEATURE_TEST_ADMIN_PASSWORD"),
    })
        .expect(200);
    return {
        cookie: cookieFrom(res),
        user: res.body.user,
    };
}
async function createTempUser(role) {
    const suffix = `${role.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const res = await (0, supertest_1.default)(BASE_URL)
        .post("/api/auth/register")
        .send({
        email: `smoke-feature5-${suffix}@example.com`,
        username: `smoke_feature5_${suffix}`,
        password: "Password123!",
        role,
    })
        .expect(200);
    return res.body.user;
}
async function main() {
    console.log("🔥 Feature 5 Admin Smoke Test\n");
    const admin = await loginAsAdmin();
    const headers = { Cookie: admin.cookie };
    const stats = await (0, supertest_1.default)(BASE_URL).get("/api/admin/stats").set(headers).expect(200);
    console.log(`✅ Stats loaded: ${stats.body.summary.activePatients} active patients`);
    const analytics = await (0, supertest_1.default)(BASE_URL).get("/api/admin/analytics").set(headers).expect(200);
    console.log(`✅ Analytics loaded: ${analytics.body.charts.visitsByWeek.length} weekly buckets`);
    const daily = await (0, supertest_1.default)(BASE_URL).get("/api/admin/daily-analytics").set(headers).expect(200);
    console.log(`✅ Daily analytics loaded: ${daily.body.dailyAnalytics.length} rows`);
    const audit = await (0, supertest_1.default)(BASE_URL)
        .get("/api/admin/audit-logs")
        .set(headers)
        .query({ actionType: "LOGIN", limit: 5 })
        .expect(200);
    console.log(`✅ Audit log loaded: ${audit.body.logs.length} filtered rows`);
    const exportRes = await (0, supertest_1.default)(BASE_URL)
        .get("/api/admin/audit-logs/export")
        .set(headers)
        .query({ actionType: "LOGIN" })
        .expect(200);
    console.log(`✅ Audit CSV export loaded: ${exportRes.text.split("\n").length - 1} row(s)`);
    const settingsRes = await (0, supertest_1.default)(BASE_URL).get("/api/admin/settings").set(headers).expect(200);
    const originalSettings = settingsRes.body.settings;
    await (0, supertest_1.default)(BASE_URL)
        .put("/api/admin/settings")
        .set(headers)
        .send({
        ...originalSettings,
        pilotLaunchNotes: `${originalSettings.pilotLaunchNotes || ""}\nSmoke check: ${new Date().toISOString()}`.trim(),
    })
        .expect(200);
    console.log("✅ Agency settings updated");
    const patient = await createTempUser("PATIENT");
    const clinician = await createTempUser("CLINICIAN");
    const assignment = await (0, supertest_1.default)(BASE_URL)
        .post("/api/admin/assignments")
        .set(headers)
        .send({ patientId: patient.id, clinicianId: clinician.id })
        .expect(200);
    console.log(`✅ Assignment created: ${assignment.body.assignment.id}`);
    await (0, supertest_1.default)(BASE_URL)
        .patch(`/api/admin/assignments/${assignment.body.assignment.id}`)
        .set(headers)
        .send({ isActive: false })
        .expect(200);
    console.log("✅ Assignment toggled inactive");
    await (0, supertest_1.default)(BASE_URL)
        .delete(`/api/admin/assignments/${assignment.body.assignment.id}`)
        .set(headers)
        .expect(200);
    console.log("✅ Assignment removed");
    const feedback = await (0, supertest_1.default)(BASE_URL).get("/api/admin/family-feedback").set(headers).expect(200);
    console.log(`✅ Family feedback loaded: ${feedback.body.aggregates.total} response(s)`);
    const readiness = await (0, supertest_1.default)(BASE_URL).get("/api/admin/pilot-readiness").set(headers).expect(200);
    console.log(`✅ Pilot readiness loaded: ${readiness.body.status} (${readiness.body.readinessScore}%)`);
    await (0, supertest_1.default)(BASE_URL).delete(`/api/admin/users/${patient.id}`).set(headers).expect(200);
    await (0, supertest_1.default)(BASE_URL).delete(`/api/admin/users/${clinician.id}`).set(headers).expect(200);
    await (0, supertest_1.default)(BASE_URL).put("/api/admin/settings").set(headers).send(originalSettings).expect(200);
    console.log("\n✅ Feature 5 smoke test complete.");
}
main().catch((error) => {
    console.error("❌ Feature 5 smoke test failed:", error);
    process.exit(1);
});
