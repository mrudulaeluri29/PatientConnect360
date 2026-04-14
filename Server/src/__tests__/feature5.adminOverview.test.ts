import request from "supertest";
import { authed, BASE_URL, describeWithRoleCredentials, loginAs, LoginSession } from "./apiTestClient";

function getCookie(res: any) {
  const raw = res.headers["set-cookie"];
  const cookies = Array.isArray(raw) ? raw : raw ? [String(raw)] : [];
  return cookies.map((item) => item.split(";")[0]).join("; ");
}

describeWithRoleCredentials("Feature 5 — admin overview", ["admin"], () => {
  let admin: LoginSession;
  let tempPatientId = "";
  let tempPatientCookie = "";

  beforeAll(async () => {
    admin = await loginAs("admin");
    const suffix = Date.now();
    const res = await request(BASE_URL)
      .post("/api/auth/register")
      .send({
        email: `feature5-overview-${suffix}@example.com`,
        username: `feature5_overview_${suffix}`,
        password: "Password123!",
        role: "PATIENT",
      })
      .expect(200);

    tempPatientId = res.body.user.id;
    tempPatientCookie = getCookie(res);
  });

  afterAll(async () => {
    if (tempPatientId) {
      await request(BASE_URL)
        .delete(`/api/admin/users/${tempPatientId}`)
        .set(authed(admin));
    }
  });

  it("returns stats with summary, queues, engagement, and feedback summary", async () => {
    const res = await request(BASE_URL)
      .get("/api/admin/stats")
      .set(authed(admin))
      .expect(200);

    expect(res.body.summary).toBeTruthy();
    expect(typeof res.body.summary.activePatients).toBe("number");
    expect(res.body.operationalQueues).toBeTruthy();
    expect(res.body.engagement).toBeTruthy();
    expect(res.body.familyFeedbackSummary).toBeTruthy();
  });

  it("returns analytics payload with charts and family feedback summary", async () => {
    const res = await request(BASE_URL)
      .get("/api/admin/analytics")
      .set(authed(admin))
      .expect(200);

    expect(Array.isArray(res.body.charts.visitsByWeek)).toBe(true);
    expect(Array.isArray(res.body.charts.messagesByRole)).toBe(true);
    expect(res.body.familyFeedbackSummary).toBeTruthy();
  });

  it("returns bounded daily analytics rows", async () => {
    const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const to = new Date().toISOString().slice(0, 10);

    const res = await request(BASE_URL)
      .get("/api/admin/daily-analytics")
      .set(authed(admin))
      .query({ from, to })
      .expect(200);

    expect(Array.isArray(res.body.dailyAnalytics)).toBe(true);
    expect(res.body.dailyAnalytics.length).toBeGreaterThan(0);
    expect(res.body.dailyAnalytics.length).toBeLessThanOrEqual(8);
  });

  it("rejects non-admin access", async () => {
    await request(BASE_URL)
      .get("/api/admin/stats")
      .set("Cookie", tempPatientCookie)
      .expect(403);
  });

  it("rejects unauthenticated access", async () => {
    await request(BASE_URL)
      .get("/api/admin/stats")
      .expect(401);
  });
});
