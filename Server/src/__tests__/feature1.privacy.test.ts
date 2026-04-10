import request from "supertest";
import { authed, BASE_URL, describeWithRoleCredentials, loginAs, LoginSession } from "./apiTestClient";

describeWithRoleCredentials("Feature 1 privacy", ["patient", "clinician"], () => {
  let patient: LoginSession;
  let clinician: LoginSession;

  beforeAll(async () => {
    patient = await loginAs("patient");
    clinician = await loginAs("clinician");
  });

  it("gets and patches patient privacy consent settings", async () => {
    const current = await request(BASE_URL)
      .get("/api/patients/me/privacy")
      .set(authed(patient))
      .expect(200);

    expect(typeof current.body.settings.shareDocumentsWithCaregivers).toBe("boolean");

    const updated = await request(BASE_URL)
      .patch("/api/patients/me/privacy")
      .set(authed(patient))
      .send({
        shareDocumentsWithCaregivers: current.body.settings.shareDocumentsWithCaregivers,
        carePlanVisibleToCaregivers: current.body.settings.carePlanVisibleToCaregivers,
        recordConsent: true,
        consentVersion: "feature1-privacy-v1",
      })
      .expect(200);

    expect(updated.body.settings.consentVersion).toBe("feature1-privacy-v1");
    expect(updated.body.settings.consentRecordedAt).toBeTruthy();
  });

  it("rejects non-patient privacy access", async () => {
    await request(BASE_URL)
      .get("/api/patients/me/privacy")
      .set(authed(clinician))
      .expect(403);
  });
});
