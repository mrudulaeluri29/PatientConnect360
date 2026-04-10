import request from "supertest";
import {
  authed,
  BASE_URL,
  describeWithRoleCredentials,
  loginAs,
  LoginSession,
} from "./apiTestClient";

describeWithRoleCredentials(
  "Feature 4 prep tasks",
  ["patient", "clinician", "admin"],
  () => {
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
          scheduledAt: new Date(
            Date.now() + 4 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          visitType: "HOME_HEALTH",
          purpose: "[test] Prep task verification visit",
        })
        .expect(201);

      visitId = created.body.visit.id;
    });

    it("clinician creates a prep task", async () => {
      const res = await request(BASE_URL)
        .post(`/api/visits/${visitId}/prep-tasks`)
        .set(authed(clinician))
        .send({ text: "[test] Place medication list on kitchen table" })
        .expect(201);

      taskId = res.body.task.id;
      expect(taskId).toBeTruthy();
      expect(res.body.task.text).toBe(
        "[test] Place medication list on kitchen table",
      );
    });

    it("patient lists prep tasks for the visit", async () => {
      const res = await request(BASE_URL)
        .get(`/api/visits/${visitId}/prep-tasks`)
        .set(authed(patient))
        .expect(200);

      expect(Array.isArray(res.body.tasks)).toBe(true);
      expect(res.body.tasks.length).toBeGreaterThan(0);
    });

    it("patient marks a prep task done", async () => {
      const res = await request(BASE_URL)
        .patch(`/api/visits/prep-tasks/${taskId}`)
        .set(authed(patient))
        .send({ isDone: true })
        .expect(200);

      expect(res.body.task.isDone).toBe(true);
    });

    it("patient can un-mark a prep task", async () => {
      const res = await request(BASE_URL)
        .patch(`/api/visits/prep-tasks/${taskId}`)
        .set(authed(patient))
        .send({ isDone: false })
        .expect(200);

      expect(res.body.task.isDone).toBe(false);
    });

    it("clinician edits the task text", async () => {
      const res = await request(BASE_URL)
        .patch(`/api/visits/prep-tasks/${taskId}`)
        .set(authed(clinician))
        .send({ text: "[test] Updated — bring insurance card too" })
        .expect(200);

      expect(res.body.task.text).toBe(
        "[test] Updated — bring insurance card too",
      );
    });

    it("patient cannot create prep tasks (403)", async () => {
      await request(BASE_URL)
        .post(`/api/visits/${visitId}/prep-tasks`)
        .set(authed(patient))
        .send({ text: "[test] Should be forbidden" })
        .expect(403);
    });
  },
);

// ── Caregiver prep-task access ───────────────────────────────────────────────

describeWithRoleCredentials(
  "Feature 4 prep tasks — caregiver",
  ["patient", "clinician", "admin", "caregiver"],
  () => {
    let patient: LoginSession;
    let clinician: LoginSession;
    let admin: LoginSession;
    let caregiver: LoginSession;
    let visitId = "";
    let taskId = "";

    beforeAll(async () => {
      patient = await loginAs("patient");
      clinician = await loginAs("clinician");
      admin = await loginAs("admin");
      caregiver = await loginAs("caregiver");

      const created = await request(BASE_URL)
        .post("/api/visits")
        .set(authed(admin))
        .send({
          patientId: patient.user.id,
          clinicianId: clinician.user.id,
          scheduledAt: new Date(
            Date.now() + 6 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          visitType: "HOME_HEALTH",
          purpose: "[test-cg] Caregiver prep task visit",
        })
        .expect(201);

      visitId = created.body.visit.id;

      const taskRes = await request(BASE_URL)
        .post(`/api/visits/${visitId}/prep-tasks`)
        .set(authed(clinician))
        .send({ text: "[test-cg] Clear path to bathroom" })
        .expect(201);

      taskId = taskRes.body.task.id;
    });

    it("caregiver lists prep tasks for linked patient's visit", async () => {
      const res = await request(BASE_URL)
        .get(`/api/visits/${visitId}/prep-tasks`)
        .set(authed(caregiver))
        .expect(200);

      expect(Array.isArray(res.body.tasks)).toBe(true);
      expect(res.body.tasks.length).toBeGreaterThan(0);
    });

    it("caregiver marks a prep task done", async () => {
      const res = await request(BASE_URL)
        .patch(`/api/visits/prep-tasks/${taskId}`)
        .set(authed(caregiver))
        .send({ isDone: true })
        .expect(200);

      expect(res.body.task.isDone).toBe(true);
    });

    it("caregiver cannot create prep tasks (403)", async () => {
      await request(BASE_URL)
        .post(`/api/visits/${visitId}/prep-tasks`)
        .set(authed(caregiver))
        .send({ text: "[test-cg] Should be forbidden" })
        .expect(403);
    });
  },
);
