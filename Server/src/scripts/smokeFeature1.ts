/* eslint-disable no-console */
type LoginResult = { cookie: string; userId: string };

const BASE_URL = process.env.FEATURE1_SMOKE_BASE_URL || "http://localhost:4000";
const LOGIN = process.env.FEATURE1_SMOKE_LOGIN;
const PASSWORD = process.env.FEATURE1_SMOKE_PASSWORD;

async function requestJson(path: string, init?: RequestInit & { cookie?: string }) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  };
  if (init?.cookie) headers.Cookie = init.cookie;
  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body, headers: res.headers };
}

async function login(): Promise<LoginResult> {
  if (!LOGIN || !PASSWORD) {
    throw new Error("Set FEATURE1_SMOKE_LOGIN and FEATURE1_SMOKE_PASSWORD env vars.");
  }
  const res = await requestJson("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ emailOrUsername: LOGIN, password: PASSWORD }),
  });
  if (res.status !== 200 || !res.body?.user?.id) {
    throw new Error(`Login failed (${res.status}): ${JSON.stringify(res.body)}`);
  }
  const setCookie = res.headers.get("set-cookie") || "";
  const cookie = setCookie.split(";")[0];
  if (!cookie) throw new Error("No auth cookie set by login.");
  return { cookie, userId: res.body.user.id as string };
}

async function main() {
  console.log(`Feature 1 smoke against ${BASE_URL}`);
  const { cookie, userId } = await login();
  console.log(`Logged in as patient ${userId}`);

  const cp = await requestJson(`/api/care-plans?patientId=${encodeURIComponent(userId)}`, { method: "GET", cookie });
  if (cp.status !== 200 || !Array.isArray(cp.body?.carePlans)) {
    throw new Error(`GET care-plans failed (${cp.status}): ${JSON.stringify(cp.body)}`);
  }
  console.log(`GET care-plans: ok (${cp.body.carePlans.length} plan(s))`);

  if (cp.body.carePlans.length > 0) {
    const planId = cp.body.carePlans[0].id as string;
    const checkIn = await requestJson(`/api/care-plans/${planId}/checkins`, {
      method: "POST",
      cookie,
      body: JSON.stringify({ status: "OK", note: "[smoke] check-in ok" }),
    });
    if (checkIn.status !== 201 && checkIn.status !== 200) {
      throw new Error(`POST check-in failed (${checkIn.status}): ${JSON.stringify(checkIn.body)}`);
    }
    console.log("POST care-plan check-in: ok");
  } else {
    console.log("POST care-plan check-in: skipped (no plans)");
  }

  const docs = await requestJson(`/api/patient-documents?patientId=${encodeURIComponent(userId)}`, { method: "GET", cookie });
  if (docs.status !== 200 || !Array.isArray(docs.body?.documents)) {
    throw new Error(`GET patient-documents failed (${docs.status}): ${JSON.stringify(docs.body)}`);
  }
  console.log(`GET patient-documents: ok (${docs.body.documents.length} doc(s))`);

  if (docs.body.documents.length > 0) {
    const docId = docs.body.documents[0].id as string;
    const dl = await requestJson(`/api/patient-documents/${docId}/download-url`, {
      method: "POST",
      cookie,
      body: JSON.stringify({}),
    });
    if (dl.status !== 200 && dl.status !== 503) {
      throw new Error(`POST download-url failed (${dl.status}): ${JSON.stringify(dl.body)}`);
    }
    console.log(`POST download-url: ok (${dl.status === 503 ? "Azure not configured" : "SAS generated"})`);
  } else {
    console.log("POST download-url: skipped (no documents)");
  }

  console.log("Feature 1 smoke passed.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
