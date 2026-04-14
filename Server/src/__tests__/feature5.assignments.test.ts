import request from "supertest";
import { authed, BASE_URL, describeWithRoleCredentials, loginAs, LoginSession } from "./apiTestClient";

describeWithRoleCredentials("Feature 5 — assignments", ["admin"], () => {
  let admin: LoginSession;
  let patientId = "";
  let clinicianId = "";
  let assignmentId = "";

  beforeAll(async () => {
    admin = await loginAs("admin");
    const suffix = Date.now();

    const patientRes = await request(BASE_URL)
      .post("/api/auth/register")
      .send({
        email: `feature5-assignment-patient-${suffix}@example.com`,
        username: `feature5_assignment_patient_${suffix}`,
        password: "Password123!",
        role: "PATIENT",
      })
      .expect(200);

    const clinicianRes = await request(BASE_URL)
      .post("/api/auth/register")
      .send({
        email: `feature5-assignment-clinician-${suffix}@example.com`,
        username: `feature5_assignment_clinician_${suffix}`,
        password: "Password123!",
        role: "CLINICIAN",
      })
      .expect(200);

    patientId = patientRes.body.user.id;
    clinicianId = clinicianRes.body.user.id;
  });

  afterAll(async () => {
    if (assignmentId) {
      await request(BASE_URL)
        .delete(`/api/admin/assignments/${assignmentId}`)
        .set(authed(admin));
    }

    if (patientId) {
      await request(BASE_URL)
        .delete(`/api/admin/users/${patientId}`)
        .set(authed(admin));
    }

    if (clinicianId) {
      await request(BASE_URL)
        .delete(`/api/admin/users/${clinicianId}`)
        .set(authed(admin));
    }
  });

  it("creates an assignment", async () => {
    const res = await request(BASE_URL)
      .post("/api/admin/assignments")
      .set(authed(admin))
      .send({ patientId, clinicianId })
      .expect(200);

    assignmentId = res.body.assignment.id;
    expect(res.body.assignment.isActive).toBe(true);
  });

  it("toggles assignment active/inactive", async () => {
    const inactive = await request(BASE_URL)
      .patch(`/api/admin/assignments/${assignmentId}`)
      .set(authed(admin))
      .send({ isActive: false })
      .expect(200);

    expect(inactive.body.assignment.isActive).toBe(false);

    const active = await request(BASE_URL)
      .patch(`/api/admin/assignments/${assignmentId}`)
      .set(authed(admin))
      .send({ isActive: true })
      .expect(200);

    expect(active.body.assignment.isActive).toBe(true);
  });

  it("records assignment audit logs", async () => {
    const res = await request(BASE_URL)
      .get("/api/admin/audit-logs")
      .set(authed(admin))
      .query({ actionType: "ASSIGNMENT_UPDATED", search: assignmentId, limit: 20 })
      .expect(200);

    expect(Array.isArray(res.body.logs)).toBe(true);
    expect(res.body.logs.some((log: any) => log.targetId === assignmentId)).toBe(true);
  });

  it("removes the assignment", async () => {
    await request(BASE_URL)
      .delete(`/api/admin/assignments/${assignmentId}`)
      .set(authed(admin))
      .expect(200);

    const list = await request(BASE_URL)
      .get("/api/admin/assignments")
      .set(authed(admin))
      .expect(200);

    expect(list.body.assignments.some((assignment: any) => assignment.id === assignmentId)).toBe(false);
    assignmentId = "";
  });
});
