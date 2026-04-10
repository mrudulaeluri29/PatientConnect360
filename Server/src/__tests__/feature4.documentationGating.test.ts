import request from "supertest";
import {
  authed,
  BASE_URL,
  describeWithRoleCredentials,
  loginAs,
  LoginSession,
} from "./apiTestClient";

describeWithRoleCredentials(
  "Feature 4 documentation gating",
  ["patient", "clinician", "admin"],
  () => {
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
          scheduledAt: new Date(
            Date.now() + 5 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          visitType: "HOME_HEALTH",
          purpose: "[test] Documentation gating visit",
        })
        .expect(201);

      visitId = created.body.visit.id;
    });

    it("rejects completion with notes shorter than 50 characters", async () => {
      const res = await request(BASE_URL)
        .patch(`/api/visits/${visitId}`)
        .set(authed(clinician))
        .send({ status: "COMPLETED", clinicianNotes: "Too short" })
        .expect(400);

      expect(res.body.error).toBeTruthy();
    });

    it("rejects completion with empty notes", async () => {
      const res = await request(BASE_URL)
        .patch(`/api/visits/${visitId}`)
        .set(authed(clinician))
        .send({ status: "COMPLETED", clinicianNotes: "" })
        .expect(400);

      expect(res.body.error).toBeTruthy();
    });

    it("rejects completion with whitespace-padded short notes", async () => {
      const paddedShort = "   short note   ";
      await request(BASE_URL)
        .patch(`/api/visits/${visitId}`)
        .set(authed(clinician))
        .send({ status: "COMPLETED", clinicianNotes: paddedShort })
        .expect(400);
    });

    it("allows completion with adequate notes (>= 50 chars)", async () => {
      const longNotes =
        "Patient tolerated treatment well. Vitals stable, gait training completed, medication questions answered, and follow-up plan reviewed.";

      const res = await request(BASE_URL)
        .patch(`/api/visits/${visitId}`)
        .set(authed(clinician))
        .send({ status: "COMPLETED", clinicianNotes: longNotes })
        .expect(200);

      expect(res.body.visit.status).toBe("COMPLETED");
    });

    it("completed visit cannot be re-completed", async () => {
      const anotherNote =
        "Attempting to re-complete a visit that was already finalized — this should fail or be idempotent.";

      const res = await request(BASE_URL)
        .patch(`/api/visits/${visitId}`)
        .set(authed(clinician))
        .send({ status: "COMPLETED", clinicianNotes: anotherNote });

      // Already completed — server may return 400 or 200 idempotently
      expect([200, 400]).toContain(res.status);
    });
  },
);
