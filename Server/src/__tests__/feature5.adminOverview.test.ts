import request from "supertest";
import { authed, BASE_URL, describeWithRoleCredentials, loginAs, LoginSession } from "./apiTestClient";

function getCookie(res: any) {
  const raw = res.headers["set-cookie"];
  const cookies = Array.isArray(raw) ? raw : raw ? [String(raw)] : [];
  return cookies.map((item) => item.split(";")[0]).join("; ");
}

async function createTempUser(role: "PATIENT" | "CLINICIAN", suffix: number) {
  const lowerRole = role.toLowerCase();
  const res = await request(BASE_URL)
    .post("/api/auth/register")
    .send({
      email: `feature5-${lowerRole}-${suffix}@example.com`,
      username: `feature5_${lowerRole}_${suffix}`,
      password: "Password123!",
      role,
    })
    .expect(200);

  return {
    id: res.body.user.id as string,
    cookie: getCookie(res),
  };
}

describeWithRoleCredentials("Feature 5 — admin overview", ["admin"], () => {
  let admin: LoginSession;
  let tempPatientId = "";
  let tempPatientCookie = "";
  let tempClinicianId = "";

  beforeAll(async () => {
    admin = await loginAs("admin");
    const suffix = Date.now();

    const patient = await createTempUser("PATIENT", suffix);
    const clinician = await createTempUser("CLINICIAN", suffix);

    tempPatientId = patient.id;
    tempPatientCookie = patient.cookie;
    tempClinicianId = clinician.id;
  });

  afterAll(async () => {
    if (tempPatientId) {
      await request(BASE_URL)
        .delete(`/api/admin/users/${tempPatientId}`)
        .set(authed(admin));
    }

    if (tempClinicianId) {
      await request(BASE_URL)
        .delete(`/api/admin/users/${tempClinicianId}`)
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
    expect(Array.isArray(res.body.charts.cancellationReasons)).toBe(true);
    expect(res.body.familyFeedbackSummary).toBeTruthy();
  });

  it("groups similar cancellation reasons into canonical analytics buckets", async () => {
    const before = await request(BASE_URL)
      .get("/api/admin/analytics")
      .set(authed(admin))
      .expect(200);

    const getBucketCount = (reason: string, rows: Array<{ reason: string; count: number }>) =>
      rows.find((row) => row.reason === reason)?.count ?? 0;

    const baselineUnable = getBucketCount("Unable to attend", before.body.charts.cancellationReasons);
    const baselineHealth = getBucketCount("Patient not feeling well", before.body.charts.cancellationReasons);

    const visitReasons = [
      "Can't make it",
      "cannot make it",
      "unable to attend",
      "cant make it",
      "Feeling sick today",
    ];

    for (const [index, reason] of visitReasons.entries()) {
      const created = await request(BASE_URL)
        .post("/api/visits")
        .set(authed(admin))
        .send({
          patientId: tempPatientId,
          clinicianId: tempClinicianId,
          scheduledAt: new Date(Date.now() + (index + 7) * 24 * 60 * 60 * 1000).toISOString(),
          visitType: "HOME_HEALTH",
          purpose: `[test] grouped cancellation reason ${index + 1}`,
        })
        .expect(201);

      await request(BASE_URL)
        .patch(`/api/visits/${created.body.visit.id}`)
        .set("Cookie", tempPatientCookie)
        .send({ status: "CANCELLED", cancelReason: reason })
        .expect(200);
    }

    const after = await request(BASE_URL)
      .get("/api/admin/analytics")
      .set(authed(admin))
      .expect(200);

    const reasons = after.body.charts.cancellationReasons as Array<{ reason: string; count: number }>;

    expect(getBucketCount("Unable to attend", reasons)).toBe(baselineUnable + 4);
    expect(getBucketCount("Patient not feeling well", reasons)).toBe(baselineHealth + 1);
    expect(reasons.some((row) => row.reason === "Can't make it")).toBe(false);
    expect(reasons.some((row) => row.reason === "cannot make it")).toBe(false);
    expect(reasons.some((row) => row.reason === "cant make it")).toBe(false);
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
