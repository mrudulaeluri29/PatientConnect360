import request from "supertest";
import { authed, BASE_URL, describeWithRoleCredentials, loginAs, LoginSession } from "./apiTestClient";

describeWithRoleCredentials("Feature 5 — pilot readiness", ["admin"], () => {
  let admin: LoginSession;
  let originalSettings: any;

  beforeAll(async () => {
    admin = await loginAs("admin");
    const settings = await request(BASE_URL)
      .get("/api/admin/settings")
      .set(authed(admin))
      .expect(200);
    originalSettings = settings.body.settings;
  });

  afterAll(async () => {
    if (originalSettings) {
      await request(BASE_URL)
        .put("/api/admin/settings")
        .set(authed(admin))
        .send(originalSettings);
    }
  });

  it("returns checklist, status, and feature flags", async () => {
    const res = await request(BASE_URL)
      .get("/api/admin/pilot-readiness")
      .set(authed(admin))
      .expect(200);

    expect(typeof res.body.status).toBe("string");
    expect(typeof res.body.readinessScore).toBe("number");
    expect(Array.isArray(res.body.checklist)).toBe(true);
    expect(res.body.featureFlags).toBeTruthy();
  });

  it("reflects updated pilot switches in readiness output", async () => {
    await request(BASE_URL)
      .put("/api/admin/settings")
      .set(authed(admin))
      .send({
        ...originalSettings,
        messagingEnabled: false,
        feedbackEnabled: false,
      })
      .expect(200);

    const res = await request(BASE_URL)
      .get("/api/admin/pilot-readiness")
      .set(authed(admin))
      .expect(200);

    expect(res.body.featureFlags.messagingEnabled).toBe(false);
    expect(res.body.featureFlags.feedbackEnabled).toBe(false);
  });
});
