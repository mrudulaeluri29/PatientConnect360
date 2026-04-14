import request from "supertest";
import { authed, BASE_URL, describeWithRoleCredentials, loginAs, LoginSession } from "./apiTestClient";

describeWithRoleCredentials("Feature 5 — audit readout", ["admin"], () => {
  let admin: LoginSession;

  beforeAll(async () => {
    admin = await loginAs("admin");
  });

  it("filters audit log by action type and returns admin-friendly labels", async () => {
    const res = await request(BASE_URL)
      .get("/api/admin/audit-logs")
      .set(authed(admin))
      .query({ actionType: "LOGIN", limit: 10 })
      .expect(200);

    expect(Array.isArray(res.body.logs)).toBe(true);
    res.body.logs.forEach((log: any) => {
      expect(log.actionType).toBe("LOGIN");
      expect(typeof log.actionLabel).toBe("string");
    });
  });

  it("filters audit log by actor role and paginates correctly", async () => {
    const res = await request(BASE_URL)
      .get("/api/admin/audit-logs")
      .set(authed(admin))
      .query({ actorRole: "ADMIN", limit: 5, offset: 0 })
      .expect(200);

    expect(res.body.limit).toBe(5);
    expect(res.body.offset).toBe(0);
    expect(typeof res.body.total).toBe("number");
  });

  it("supports date range filtering", async () => {
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const to = new Date().toISOString().slice(0, 10);

    const res = await request(BASE_URL)
      .get("/api/admin/audit-logs")
      .set(authed(admin))
      .query({ from, to, limit: 10 })
      .expect(200);

    expect(Array.isArray(res.body.logs)).toBe(true);
  });

  it("exports audit CSV with matching filters", async () => {
    const res = await request(BASE_URL)
      .get("/api/admin/audit-logs/export")
      .set(authed(admin))
      .query({ actionType: "LOGIN" })
      .expect(200);

    expect(String(res.headers["content-type"] || "")).toContain("text/csv");
    expect(res.text).toContain("When");
    expect(res.text).toContain("Action");
  });
});
