import request from "supertest";
import { authed, BASE_URL, describeWithRoleCredentials, loginAs, LoginSession } from "./apiTestClient";

describeWithRoleCredentials("Feature 4 prep tasks", ["patient", "clinician", "admin"], () => {
  let patient: LoginSession;
  let clinician: LoginSession;
  let admin: LoginSession;
  let visitId = "";
  let taskId = "";

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
        scheduledAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
        visitType: "HOME_HEALTH",
        purpose: "[test] Prep task verification visit",
      })
      .expect(201);

    visitId = created.body.visit.id;
  });

  it("creates, lists, and marks prep tasks done", async () => {
    const created = await request(BASE_URL)
      .post(`/api/visits/${visitId}/prep-tasks`)
      .set(authed(clinician))
      .send({ text: "[test] Place medication list on kitchen table" })
      .expect(201);

    taskId = created.body.task.id;

    const list = await request(BASE_URL)
      .get(`/api/visits/${visitId}/prep-tasks`)
      .set(authed(patient))
      .expect(200);

    expect(Array.isArray(list.body.tasks)).toBe(true);

    await request(BASE_URL)
      .patch(`/api/visits/prep-tasks/${taskId}`)
      .set(authed(patient))
      .send({ isDone: true })
      .expect(200);
  });
});
