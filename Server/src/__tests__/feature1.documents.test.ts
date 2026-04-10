import request from "supertest";
import { authed, BASE_URL, describeWithRoleCredentials, loginAs, LoginSession } from "./apiTestClient";

describeWithRoleCredentials("Feature 1 documents", ["patient", "clinician"], () => {
  let patient: LoginSession;
  let clinician: LoginSession;
  let documentId = "";

  beforeAll(async () => {
    patient = await loginAs("patient");
    clinician = await loginAs("clinician");
  });

  it("lists patient documents", async () => {
    const res = await request(BASE_URL)
      .get("/api/patient-documents")
      .query({ patientId: patient.user.id })
      .set(authed(patient))
      .expect(200);

    expect(Array.isArray(res.body.documents)).toBe(true);
  });

  it("uploads, updates, and requests download URLs when storage is configured", async () => {
    const upload = await request(BASE_URL)
      .post("/api/patient-documents")
      .set(authed(clinician))
      .field("patientId", patient.user.id)
      .field("docType", "TEST_NOTE")
      .attach("file", Buffer.from("Feature 1 document integration test"), "feature1-test-note.txt");

    if (upload.status === 503) {
      expect(upload.body.error).toMatch(/storage/i);
      return;
    }

    expect(upload.status).toBe(201);
    documentId = upload.body.document.id;

    await request(BASE_URL)
      .patch(`/api/patient-documents/${documentId}`)
      .set(authed(clinician))
      .send({ isHidden: true })
      .expect(200);

    const download = await request(BASE_URL)
      .post(`/api/patient-documents/${documentId}/download-url`)
      .set(authed(clinician))
      .send({});

    expect([200, 503]).toContain(download.status);
  });
});
