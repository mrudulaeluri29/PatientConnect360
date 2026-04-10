import request from "supertest";
import { authed, BASE_URL, describeWithRoleCredentials, loginAs, LoginSession } from "./apiTestClient";

describeWithRoleCredentials("Feature 4 documentation gating", ["patient", "clinician", "admin"], () => {
  let patient: LoginSession;
  let clinician: LoginSession;
  let admin: LoginSession;
  let visitId = "";

  beforeAll(async () => {
    patient = await loginAs("patient");
    clinician = await loginAs("clinician");
    admin = await loginAs("admin");

    const created = await request(BASE_URL)
      .post("/api/visits")
      .set(authed(admin))
      .send({
        patientId: patient.user.id,
        clinicianId: clinician.user.id,
        scheduledAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        visitType: "HOME_HEALTH",
        purpose: "[test] Documentation gating visit",
      })
      .expect(201);

    visitId = created.body.visit.id;
  });

  it("blocks completion with short notes and allows completion with adequate notes", async () => {
    await request(BASE_URL)
      .patch(`/api/visits/${visitId}`)
      .set(authed(clinician))
      .send({ status: "COMPLETED", clinicianNotes: "Too short" })
      .expect(400);

    const longNotes =
      "Patient tolerated treatment well. Vitals stable, gait training completed, medication questions answered, and follow-up plan reviewed.";

    const completed = await request(BASE_URL)
      .patch(`/api/visits/${visitId}`)
      .set(authed(clinician))
      .send({ status: "COMPLETED", clinicianNotes: longNotes })
      .expect(200);

    expect(completed.body.visit.status).toBe("COMPLETED");
  });
});
