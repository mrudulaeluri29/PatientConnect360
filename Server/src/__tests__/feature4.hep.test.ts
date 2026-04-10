import request from "supertest";
import {
  authed,
  BASE_URL,
  describeWithRoleCredentials,
  loginAs,
  LoginSession,
} from "./apiTestClient";

// ── Core HEP workflow (clinician + patient) ──────────────────────────────────

describeWithRoleCredentials("Feature 4 HEP", ["patient", "clinician"], () => {
  let patient: LoginSession;
  let clinician: LoginSession;
  let assignmentId = "";

  beforeAll(async () => {
    patient = await loginAs("patient");
    clinician = await loginAs("clinician");
  });

  it("clinician creates an HEP assignment for an assigned patient", async () => {
    const res = await request(BASE_URL)
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

    assignmentId = res.body.assignment.id;
    expect(assignmentId).toBeTruthy();
    expect(res.body.assignment.exercise.name).toBe("[test] Heel raises");
  });

  it("clinician lists HEP assignments by patient", async () => {
    const res = await request(BASE_URL)
      .get("/api/hep")
      .query({ patientId: patient.user.id })
      .set(authed(clinician))
      .expect(200);

    expect(Array.isArray(res.body.assignments)).toBe(true);
    expect(res.body.assignments.length).toBeGreaterThan(0);
  });

  it("clinician pauses the assignment", async () => {
    const res = await request(BASE_URL)
      .patch(`/api/hep/assignments/${assignmentId}`)
      .set(authed(clinician))
      .send({ status: "PAUSED" })
      .expect(200);

    expect(res.body.assignment.status).toBe("PAUSED");
  });

  it("patient logs a completion", async () => {
    const res = await request(BASE_URL)
      .post(`/api/hep/assignments/${assignmentId}/complete`)
      .set(authed(patient))
      .send({ comment: "[test] Completed once" })
      .expect(201);

    expect(res.body.completion).toBeTruthy();
    expect(res.body.completion.assignmentId).toBe(assignmentId);
  });

  it("patient cannot create assignments (403)", async () => {
    await request(BASE_URL)
      .post("/api/hep/assignments")
      .set(authed(patient))
      .send({
        patientId: patient.user.id,
        exerciseName: "[test] Unauthorized",
        instructions: "Should fail",
        frequencyPerWeek: 1,
        startDate: new Date().toISOString(),
      })
      .expect(403);
  });

  it("patient cannot update assignment status (403)", async () => {
    await request(BASE_URL)
      .patch(`/api/hep/assignments/${assignmentId}`)
      .set(authed(patient))
      .send({ status: "ACTIVE" })
      .expect(403);
  });
});

// ── Caregiver HEP access ─────────────────────────────────────────────────────

describeWithRoleCredentials(
  "Feature 4 HEP — caregiver",
  ["patient", "clinician", "caregiver"],
  () => {
    let patient: LoginSession;
    let clinician: LoginSession;
    let caregiver: LoginSession;
    let assignmentId = "";

    beforeAll(async () => {
      patient = await loginAs("patient");
      clinician = await loginAs("clinician");
      caregiver = await loginAs("caregiver");

      const res = await request(BASE_URL)
        .post("/api/hep/assignments")
        .set(authed(clinician))
        .send({
          patientId: patient.user.id,
          exerciseName: "[test-cg] Ankle circles",
          instructions: "Rotate each ankle 15 times clockwise and counter-clockwise.",
          frequencyPerWeek: 5,
          startDate: new Date().toISOString(),
        })
        .expect(201);

      assignmentId = res.body.assignment.id;
    });

    it("caregiver lists HEP for linked patient", async () => {
      const res = await request(BASE_URL)
        .get("/api/hep")
        .query({ patientId: patient.user.id })
        .set(authed(caregiver))
        .expect(200);

      expect(Array.isArray(res.body.assignments)).toBe(true);
    });

    it("caregiver logs a completion on behalf of patient", async () => {
      const res = await request(BASE_URL)
        .post(`/api/hep/assignments/${assignmentId}/complete`)
        .set(authed(caregiver))
        .send({ comment: "[test-cg] Caregiver logged on patient's behalf" })
        .expect(201);

      expect(res.body.completion).toBeTruthy();
    });

    it("caregiver cannot create assignments (403)", async () => {
      await request(BASE_URL)
        .post("/api/hep/assignments")
        .set(authed(caregiver))
        .send({
          patientId: patient.user.id,
          exerciseName: "[test-cg] Unauthorized",
          instructions: "Should fail",
          frequencyPerWeek: 1,
          startDate: new Date().toISOString(),
        })
        .expect(403);
    });
  },
);
