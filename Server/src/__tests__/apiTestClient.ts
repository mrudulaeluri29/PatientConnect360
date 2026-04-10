import request from "supertest";

export const BASE_URL = process.env.FEATURE_TEST_BASE_URL || "http://localhost:4000";

export type TestRole = "patient" | "clinician" | "admin" | "caregiver";

export type LoginSession = {
  cookie: string;
  user: {
    id: string;
    email: string;
    username: string;
    role: string;
  };
};

export function hasRoleCredentials(roles: TestRole[]): boolean {
  return roles.every((role) => {
    const key = role.toUpperCase();
    return Boolean(process.env[`FEATURE_TEST_${key}_LOGIN`] && process.env[`FEATURE_TEST_${key}_PASSWORD`]);
  });
}

export function describeWithRoleCredentials(
  name: string,
  roles: TestRole[],
  fn: () => void
): void {
  const runner = hasRoleCredentials(roles) ? describe : describe.skip;
  runner(name, fn);
}

export async function loginAs(role: TestRole): Promise<LoginSession> {
  const key = role.toUpperCase();
  const emailOrUsername = process.env[`FEATURE_TEST_${key}_LOGIN`];
  const password = process.env[`FEATURE_TEST_${key}_PASSWORD`];

  if (!emailOrUsername || !password) {
    throw new Error(`Missing FEATURE_TEST_${key}_LOGIN or FEATURE_TEST_${key}_PASSWORD`);
  }

  const res = await request(BASE_URL)
    .post("/api/auth/login")
    .send({ emailOrUsername, password })
    .expect(200);

  const rawSetCookie = res.headers["set-cookie"];
  const setCookie = Array.isArray(rawSetCookie)
    ? rawSetCookie
    : rawSetCookie
      ? [String(rawSetCookie)]
      : [];
  const cookie = setCookie.map((raw) => raw.split(";")[0]).join("; ");
  if (!cookie) throw new Error(`No auth cookie returned for ${role}`);

  return { cookie, user: res.body.user };
}

export function authed(session: LoginSession) {
  return { Cookie: session.cookie };
}
