import request from "supertest";

export const BASE_URL = process.env.FEATURE_TEST_BASE_URL || "http://localhost:4000";

/**
 * When FEATURE_TEST_FAIL_FAST is truthy, suites fail instead of silently
 * skipping when credentials are missing.  CI should always set this.
 */
const FAIL_FAST = Boolean(process.env.FEATURE_TEST_FAIL_FAST);

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

export function missingCredentialNames(roles: TestRole[]): string[] {
  const missing: string[] = [];
  for (const role of roles) {
    const key = role.toUpperCase();
    if (!process.env[`FEATURE_TEST_${key}_LOGIN`]) missing.push(`FEATURE_TEST_${key}_LOGIN`);
    if (!process.env[`FEATURE_TEST_${key}_PASSWORD`]) missing.push(`FEATURE_TEST_${key}_PASSWORD`);
  }
  return missing;
}

/**
 * Wraps `describe` with credential checks.
 *
 * - Default: skips the suite when creds are absent (preserves legacy behavior).
 * - When `FEATURE_TEST_FAIL_FAST=1`: throws so CI never silently skips.
 */
export function describeWithRoleCredentials(
  name: string,
  roles: TestRole[],
  fn: () => void
): void {
  if (hasRoleCredentials(roles)) {
    describe(name, fn);
    return;
  }

  const missing = missingCredentialNames(roles);

  if (FAIL_FAST) {
    describe(name, () => {
      it("should have required credentials", () => {
        throw new Error(
          `FEATURE_TEST_FAIL_FAST is set but credentials are missing: ${missing.join(", ")}. ` +
          `Provide them or unset FEATURE_TEST_FAIL_FAST to allow skipping.`
        );
      });
    });
    return;
  }

  describe.skip(`${name} [SKIPPED — missing: ${missing.join(", ")}]`, fn);
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
