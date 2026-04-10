# Feature 4 — Smoke Test & Verification Checklist

## Test Accounts

| Role       | Email                    | Password     |
| ---------- | ------------------------ | ------------ |
| Patient    | kkalra1@asu.edu          | Kaustav123*  |
| Clinician  | autlexia@gmail.com       | Kaustav123*  |
| Admin      | ripkaush@gmail.com       | Kaustav123*  |
| MPOA/Family| testingmpoa@gmail.com    | Kaustav123*  |

---

## 1. Environment Setup

### Local Dev

```bash
# Terminal 1 — Backend
cd Server
npm install
npx prisma generate
npm run dev          # starts on http://localhost:4000

# Terminal 2 — Frontend
cd Client/web
npm install
npm run dev          # starts on http://localhost:5173
```

### Seed Data

```bash
cd Server
npm run seed:demo    # runs all seeds including Feature 4
# or just Feature 4:
npm run seed:feature4
```

After seeding you should see:
- 5 exercise assignments (ACTIVE, PAUSED, COMPLETED mix)
- 4 visit prep tasks on an upcoming visit
- 1 past visit with status IN_PROGRESS (populates "Needs Documentation" worklist)

### Deployed (Render + Vercel)

| Variable            | Where    | Value                                      |
| ------------------- | -------- | ------------------------------------------ |
| `CORS_ORIGINS`      | Server   | Your Vercel URL, comma-separated if needed |
| `VITE_API_URL`      | Client   | Your Render URL (e.g. `https://pc360.onrender.com`) |

---

## 2. Integration Tests

Tests live in `Server/src/__tests__/feature4.*.test.ts`.

```bash
cd Server

# Load test credentials (PowerShell)
Get-Content .env.test | ForEach-Object {
  if ($_ -match '^([^#].+?)=(.+)$') {
    [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2])
  }
}

# Load test credentials (bash)
set -a; source .env.test; set +a

# Run tests (backend dev server must be running)
npm test
```

The `.env.test` file is pre-configured with all required `FEATURE_TEST_*` variables.

Setting `FEATURE_TEST_FAIL_FAST=1` (default in `.env.test`) causes a hard test failure
if any credentials are missing — tests will never silently skip in CI.

### Test Suites

| Suite                               | Covers                                                 |
| ----------------------------------- | ------------------------------------------------------ |
| `feature4.hep.test.ts`             | Create, list, pause, complete HEP; caregiver access; 403s |
| `feature4.prepTasks.test.ts`       | Create, list, toggle done, clinician edit; caregiver access; 403s |
| `feature4.documentationGating.test.ts` | Short notes → 400; empty → 400; whitespace → 400; adequate → 200 |

---

## 3. Manual Smoke Steps

### 3.1 Clinician Assigns HEP

1. Login as **clinician** (autlexia@gmail.com)
2. Navigate to **Tasks** tab → **Assign Exercises (HEP)**
3. Select patient **kkalra1**, fill in exercise name + instructions + frequency
4. Click **Assign Exercise**
5. Expected: "Exercise assigned successfully!" + appears in assignment list

### 3.2 Clinician Adds Prep Tasks

1. **Tasks** → **Visit Prep Tasks**
2. Select an upcoming visit
3. Type a task (e.g. "Have medication bottles ready") and press **+ Add**
4. Expected: Task appears in the list below

### 3.3 Clinician Edits Prep Task

1. Click **Edit** on an existing prep task
2. Change text, click **Save**
3. Expected: Text updates in place

### 3.4 Documentation Gating — Blocked

1. **Tasks** → **Needs Documentation**
2. Click a visit, type fewer than 50 characters
3. Click **Complete Visit** (button should be disabled; if forced, server returns 400)
4. Expected: Button disabled + character counter shows red

### 3.5 Documentation Gating — Success

1. Type >= 50 characters of clinical notes
2. Click **Complete Visit**
3. Expected: "Visit completed successfully!" + visit removed from worklist

### 3.6 Patient Logs HEP Completion

1. Login as **patient** (kkalra1@asu.edu)
2. Navigate to **Exercises & Tasks** → **My Home Exercises**
3. Click **Log Completion** on an active exercise
4. Optionally add a comment, then click **Mark Done**
5. Expected: "Logged successfully!" + adherence bar updates

### 3.7 Patient Marks Prep Task Done

1. **Exercises & Tasks** → **Visit Prep Tasks**
2. Click the circle button on an undone task
3. Expected: Task shows green checkmark + "Done by" label

### 3.8 MPOA/Caregiver Views and Completes HEP

1. Login as **testingmpoa@gmail.com**
2. Navigate to **Exercises & Tasks** → select patient kkalra1
3. Click **Log Completion** on an active exercise
4. Expected: Completion logged on behalf of patient

### 3.9 MPOA/Caregiver Marks Prep Task Done

1. **Exercises & Tasks** → **Visit Prep Tasks**
2. Toggle a task to done
3. Expected: Task marked with green checkmark

### 3.10 Worklist Shows Overdue Visits

1. Login as **clinician**
2. **Tasks** → **Needs Documentation**
3. Expected: Past visits without sufficient notes appear
4. Expected: Safety net section shows any completed visits missing notes

---

## 4. Empty States

| Screen              | Condition         | Expected                                     |
| ------------------- | ----------------- | -------------------------------------------- |
| Worklist            | All documented    | "All visits are documented!" message          |
| HEP (patient)      | No assignments    | "No exercises assigned yet" empty state       |
| Prep tasks (patient)| No upcoming visits| "No upcoming visits found" empty state        |
| HEP (caregiver)    | No linked patients| "No linked patients found" message            |

---

## 5. Error Handling

| Action                                   | Expected Error                                |
| ---------------------------------------- | --------------------------------------------- |
| Clinician assigns HEP to unassigned patient | 403: "Patient not assigned to you"           |
| Patient creates HEP assignment           | 403: "Only clinicians and admins..."          |
| Patient creates prep task                | 403: "Only clinicians and admins..."          |
| Complete visit with < 50 chars notes     | 400: Notes length requirement message         |
| Caregiver accesses unlinked patient      | 403: "Not linked to this patient"             |

---

## 6. Quality Gates

- [ ] `npm run lint --prefix Client/web` → 0 errors
- [ ] `npx vite build` in `Client/web` → exit 0
- [ ] `npm test` in `Server` (with `.env.test` loaded) → all Feature 4 suites pass
- [ ] `npm run seed:feature4` → completes without error
- [ ] All 10 manual smoke steps pass for each role
