"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BASE_URL = void 0;
exports.hasRoleCredentials = hasRoleCredentials;
exports.missingCredentialNames = missingCredentialNames;
exports.describeWithRoleCredentials = describeWithRoleCredentials;
exports.loginAs = loginAs;
exports.authed = authed;
const supertest_1 = __importDefault(require("supertest"));
exports.BASE_URL = process.env.FEATURE_TEST_BASE_URL || "http://localhost:4000";
/**
 * When FEATURE_TEST_FAIL_FAST is truthy, suites fail instead of silently
 * skipping when credentials are missing.  CI should always set this.
 */
const FAIL_FAST = Boolean(process.env.FEATURE_TEST_FAIL_FAST);
function hasRoleCredentials(roles) {
    return roles.every((role) => {
        const key = role.toUpperCase();
        return Boolean(process.env[`FEATURE_TEST_${key}_LOGIN`] && process.env[`FEATURE_TEST_${key}_PASSWORD`]);
    });
}
function missingCredentialNames(roles) {
    const missing = [];
    for (const role of roles) {
        const key = role.toUpperCase();
        if (!process.env[`FEATURE_TEST_${key}_LOGIN`])
            missing.push(`FEATURE_TEST_${key}_LOGIN`);
        if (!process.env[`FEATURE_TEST_${key}_PASSWORD`])
            missing.push(`FEATURE_TEST_${key}_PASSWORD`);
    }
    return missing;
}
/**
 * Wraps `describe` with credential checks.
 *
 * - Default: skips the suite when creds are absent (preserves legacy behavior).
 * - When `FEATURE_TEST_FAIL_FAST=1`: throws so CI never silently skips.
 */
function describeWithRoleCredentials(name, roles, fn) {
    if (hasRoleCredentials(roles)) {
        describe(name, fn);
        return;
    }
    const missing = missingCredentialNames(roles);
    if (FAIL_FAST) {
        describe(name, () => {
            it("should have required credentials", () => {
                throw new Error(`FEATURE_TEST_FAIL_FAST is set but credentials are missing: ${missing.join(", ")}. ` +
                    `Provide them or unset FEATURE_TEST_FAIL_FAST to allow skipping.`);
            });
        });
        return;
    }
    describe.skip(`${name} [SKIPPED — missing: ${missing.join(", ")}]`, fn);
}
async function loginAs(role) {
    const key = role.toUpperCase();
    const emailOrUsername = process.env[`FEATURE_TEST_${key}_LOGIN`];
    const password = process.env[`FEATURE_TEST_${key}_PASSWORD`];
    if (!emailOrUsername || !password) {
        throw new Error(`Missing FEATURE_TEST_${key}_LOGIN or FEATURE_TEST_${key}_PASSWORD`);
    }
    const res = await (0, supertest_1.default)(exports.BASE_URL)
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
    if (!cookie)
        throw new Error(`No auth cookie returned for ${role}`);
    return { cookie, user: res.body.user };
}
function authed(session) {
    return { Cookie: session.cookie };
}
