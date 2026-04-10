import request from "supertest";
import { authed, BASE_URL, describeWithRoleCredentials, loginAs, LoginSession } from "./apiTestClient";

describeWithRoleCredentials("Feature 1 care plans", ["patient", "clinician"], () => {
  let patient: LoginSession;
  let clinician: LoginSession;
  let planId = "";
  let itemId = "";

  beforeAll(async () => {
    patient = await loginAs("patient");
    clinician = await loginAs("clinician");
  });

  it("allows a patient to read scoped care plans", async () => {
    const res = await request(BASE_URL)
      .get("/api/care-plans")
      .query({ patientId: patient.user.id })
      .set(authed(patient))
      .expect(200);

    expect(Array.isArray(res.body.carePlans)).toBe(true);
  });

  it("allows an assigned clinician to create and update a care plan", async () => {
    const created = await request(BASE_URL)
      .post("/api/care-plans")
      .set(authed(clinician))
      .send({ patientId: patient.user.id, status: "ACTIVE" })
      .expect(201);

    planId = created.body.carePlan.id;

    const item = await request(BASE_URL)
      .post(`/api/care-plans/${planId}/items`)
      .set(authed(clinician))
      .send({
        type: "GOAL",
        title: "[test] Walk safely to the kitchen",
        details: "Integration test care-plan item",
        sortOrder: 1,
      })
      .expect(201);

    itemId = item.body.item.id;

    await request(BASE_URL)
      .patch(`/api/care-plans/items/${itemId}`)
      .set(authed(clinician))
      .send({ details: "Updated by integration test", sortOrder: 2 })
      .expect(200);

    await request(BASE_URL)
      .patch(`/api/care-plans/${planId}`)
      .set(authed(clinician))
      .send({ status: "ON_HOLD" })
      .expect(200);
  });

  it("allows a patient to submit progress and check-ins", async () => {
    expect(planId).toBeTruthy();
    expect(itemId).toBeTruthy();

    await request(BASE_URL)
      .post(`/api/care-plans/items/${itemId}/progress`)
      .set(authed(patient))
      .send({ status: "IN_PROGRESS", note: "[test] Progress note" })
      .expect(200);

    await request(BASE_URL)
      .post(`/api/care-plans/${planId}/checkins`)
      .set(authed(patient))
      .send({ status: "OK", note: "[test] Check-in note" })
      .expect(201);
  });
});
