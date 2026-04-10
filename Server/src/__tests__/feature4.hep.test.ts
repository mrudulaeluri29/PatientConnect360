import request from "supertest";
import { authed, BASE_URL, describeWithRoleCredentials, loginAs, LoginSession } from "./apiTestClient";

describeWithRoleCredentials("Feature 4 HEP", ["patient", "clinician"], () => {
  let patient: LoginSession;
  let clinician: LoginSession;
  let assignmentId = "";

  beforeAll(async () => {
    patient = await loginAs("patient");
    clinician = await loginAs("clinician");
  });

  it("creates, lists, updates, and completes HEP assignments", async () => {
    const created = await request(BASE_URL)
      .post("/api/hep/assignments")
      .set(authed(clinician))
      .send({
        patientId: patient.user.id,
        exerciseName: "[test] Heel raises",
        instructions: "Stand near a counter and rise onto toes 10 times.",
        frequencyPerWeek: 3,
        startDate: new Date().toISOString(),
      })
      .expect(201);

    assignmentId = created.body.assignment.id;

    await request(BASE_URL)
      .get("/api/hep")
      .query({ patientId: patient.user.id })
      .set(authed(clinician))
      .expect(200);

    await request(BASE_URL)
      .patch(`/api/hep/assignments/${assignmentId}`)
      .set(authed(clinician))
      .send({ status: "PAUSED" })
      .expect(200);

    await request(BASE_URL)
      .post(`/api/hep/assignments/${assignmentId}/complete`)
      .set(authed(patient))
      .send({ comment: "[test] Completed once" })
      .expect(201);
  });
});
