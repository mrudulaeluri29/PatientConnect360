import request from "supertest";
import {
  authed,
  BASE_URL,
  describeWithRoleCredentials,
  loginAs,
  LoginSession,
} from "./apiTestClient";

describeWithRoleCredentials(
  "Feature 2 — notifications",
  ["patient", "clinician", "admin"],
  () => {
    let patient: LoginSession;
    let clinician: LoginSession;
    let admin: LoginSession;
    let visitId = "";

    beforeAll(async () => {
      patient   = await loginAs("patient");
      clinician = await loginAs("clinician");
      admin     = await loginAs("admin");

      const created = await request(BASE_URL)
        .post("/api/visits")
        .set(authed(admin))
        .send({
          patientId:   patient.user.id,
          clinicianId: clinician.user.id,
          scheduledAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          visitType:   "HOME_HEALTH",
          purpose:     "[test] Feature 2 notification verification visit",
        })
        .expect(201);
      visitId = created.body.visit.id;
    });

    afterAll(async () => {
      if (visitId) {
        await request(BASE_URL)
          .delete(`/api/visits/${visitId}`)
          .set(authed(admin));
      }
    });

    // ── Notification list ─────────────────────────────────────────────────────

    it("patient can fetch their notifications", async () => {
      const res = await request(BASE_URL)
        .get("/api/notifications")
        .set(authed(patient))
        .expect(200);

      expect(Array.isArray(res.body.notifications)).toBe(true);
      expect(typeof res.body.unreadCount).toBe("number");
    });

    it("visit request creates a notification for the patient", async () => {
      const res = await request(BASE_URL)
        .get("/api/notifications")
        .set(authed(patient))
        .expect(200);

      const visitNotif = res.body.notifications.find(
        (n: any) => n.meta?.visitId === visitId
      );
      expect(visitNotif).toBeTruthy();
      expect(visitNotif.type).toBeTruthy();
    });

    it("patient can mark a notification as read", async () => {
      const listRes = await request(BASE_URL)
        .get("/api/notifications")
        .set(authed(patient))
        .expect(200);

      const unread = listRes.body.notifications.find((n: any) => !n.isRead);
      if (!unread) return; // no unread — skip

      const res = await request(BASE_URL)
        .post(`/api/notifications/${unread.id}/read`)
        .set(authed(patient))
        .expect(200);

      expect(res.body.notification.isRead).toBe(true);
    });

    it("patient can mark all notifications as read", async () => {
      const res = await request(BASE_URL)
        .post("/api/notifications/read-all")
        .set(authed(patient))
        .expect(200);

      expect(res.body.ok).toBe(true);
    });

    it("patient cannot read another user notification", async () => {
      const clinicianNotifs = await request(BASE_URL)
        .get("/api/notifications")
        .set(authed(clinician))
        .expect(200);

      const clinicianNotif = clinicianNotifs.body.notifications[0];
      if (!clinicianNotif) return;

      await request(BASE_URL)
        .post(`/api/notifications/${clinicianNotif.id}/read`)
        .set(authed(patient))
        .expect(403);
    });

    // ── Reminder preferences ──────────────────────────────────────────────────

    it("patient can fetch reminder preferences", async () => {
      const res = await request(BASE_URL)
        .get("/api/notifications/preferences")
        .set(authed(patient))
        .expect(200);

      expect(res.body.preferences).toBeTruthy();
      expect(res.body.preferences.channel).toBeTruthy();
    });

    it("patient can update reminder preferences", async () => {
      const res = await request(BASE_URL)
        .patch("/api/notifications/preferences")
        .set(authed(patient))
        .send({ channel: "EMAIL", enabled: true })
        .expect(200);

      expect(res.body.preferences.channel).toBe("EMAIL");
      expect(res.body.preferences.enabled).toBe(true);
    });

    it("invalid channel is rejected", async () => {
      await request(BASE_URL)
        .patch("/api/notifications/preferences")
        .set(authed(patient))
        .send({ channel: "INVALID_CHANNEL" })
        .expect(400);
    });

    // ── Cancellation notification ─────────────────────────────────────────────

    it("cancelling visit creates cancellation notification", async () => {
      // Patient confirms first
      await request(BASE_URL)
        .patch(`/api/visits/${visitId}`)
        .set(authed(patient))
        .send({ status: "CONFIRMED" });

      // Patient cancels
      await request(BASE_URL)
        .patch(`/api/visits/${visitId}`)
        .set(authed(patient))
        .send({ status: "CANCELLED", cancelReason: "Test cancellation reason" });

      visitId = ""; // prevent afterAll double-delete

      const res = await request(BASE_URL)
        .get("/api/notifications")
        .set(authed(patient))
        .expect(200);

      const cancelNotif = res.body.notifications.find(
        (n: any) => n.type === "VISIT_CANCELLED"
      );
      expect(cancelNotif).toBeTruthy();
    });
  }
);