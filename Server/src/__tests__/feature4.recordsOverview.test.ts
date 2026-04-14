import request from "supertest";
import { authed, BASE_URL, describeWithRoleCredentials, loginAs, LoginSession } from "./apiTestClient";

describeWithRoleCredentials("Feature 4 records overview", ["patient", "clinician"], () => {
  let patient: LoginSession;
  let clinician: LoginSession;

  beforeAll(async () => {
    patient = await loginAs("patient");
    clinician = await loginAs("clinician");
  });

  it("patient loads overview for self", async () => {
    const res = await request(BASE_URL)
      .get("/api/records/overview")
      .query({ patientId: patient.user.id })
      .set(authed(patient))
      .expect(200);

    expect(res.body.patientId).toBe(patient.user.id);
    expect(res.body).toHaveProperty("carePlan");
    expect(res.body).toHaveProperty("documents");
    expect(res.body).toHaveProperty("privacy");
    expect(res.body).toHaveProperty("therapyProgress");
    expect(res.body).toHaveProperty("recentVitals");
    expect(Array.isArray(res.body.carePlan.plans)).toBe(true);
    expect(Array.isArray(res.body.documents.items)).toBe(true);
    expect(res.body.privacy.viewerMayEditPrivacy).toBe(true);
    expect(res.body.therapyProgress).toHaveProperty("hep");
  });

  it("clinician loads overview for assigned patient", async () => {
    const res = await request(BASE_URL)
      .get("/api/records/overview")
      .query({ patientId: patient.user.id })
      .set(authed(clinician))
      .expect(200);

    expect(res.body.patientId).toBe(patient.user.id);
    expect(res.body.carePlan.blocked).toBe(false);
    expect(res.body.documents.blocked).toBe(false);
    expect(res.body.privacy.viewerMayEditPrivacy).toBe(false);
  });

  it("patient cannot load another patient overview", async () => {
    await request(BASE_URL)
      .get("/api/records/overview")
      .query({ patientId: "someone-else-id" })
      .set(authed(patient))
      .expect(403);
  });

  it("patient may omit patientId (defaults to self)", async () => {
    const res = await request(BASE_URL)
      .get("/api/records/overview")
      .set(authed(patient))
      .expect(200);
    expect(res.body.patientId).toBe(patient.user.id);
  });

  it("clinician requires patientId", async () => {
    await request(BASE_URL).get("/api/records/overview").set(authed(clinician)).expect(400);
  });
});

describeWithRoleCredentials("Feature 4 records overview — clinician scope", ["patient", "clinician"], () => {
  let patient: LoginSession;
  let clinician: LoginSession;

  beforeAll(async () => {
    patient = await loginAs("patient");
    clinician = await loginAs("clinician");
  });

  it("clinician gets 403 for patient not assigned", async () => {
    await request(BASE_URL)
      .get("/api/records/overview")
      .query({ patientId: "nonexistent-patient-cuid-00000000" })
      .set(authed(clinician))
      .expect(403);
  });
});
