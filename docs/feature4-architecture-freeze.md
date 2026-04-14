# Feature 4 — Phase 0: Architecture freeze

**Status:** FROZEN (Phase 0 complete)  
**Scope:** Server + Client/web only (no mobile)  
**Source:** `Feature4_ImplementationPlan.md` Sections 2–5, 3.1–3.17, 4

This document is the **canonical architecture note** for Feature 4. Later phases must align with the decisions and contracts below unless the team explicitly revises this freeze.

---

## 1. Audit summary (verified against the repo)

### 1.1 Data model (`Server/prisma/schema.prisma`)

- **Present in Prisma:** `CarePlan`, `CarePlanItem`, `CarePlanItemProgress`, `CarePlanCheckIn`, `PatientDocument`, `VitalSign`, `Exercise`, `ExerciseAssignment`, `ExerciseCompletion`, `VisitPrepTask`, caregiver links, assignments, etc.
- **`PatientPrivacySettings`:** Defined in **`Server/prisma/schema.prisma`** (Phase 1). Table DDL originates from `20260406160000_f6_privacy_consent`; `privacySettings.ts` uses **`prisma.patientPrivacySettings`** (no runtime `CREATE TABLE`). Defaults when no row exists: `shareDocumentsWithCaregivers: true`, `carePlanVisibleToCaregivers: true`.

### 1.2 Access control (`Server/src/lib/patientAccess.ts`)

- Levels: `NONE` | `SELF` | `CAREGIVER` | `CLINICIAN` | `ADMIN`.
- **Read care plan:** any level except `NONE` (when route allows).
- **Edit care plan definition:** `CLINICIAN` | `ADMIN` only.
- **Update care plan progress:** `SELF` | `CAREGIVER` (API allows; product will move primary records UI to read-first in later phases).
- **Manage documents:** `CLINICIAN` | `ADMIN`.

### 1.3 Privacy enforcement (`privacySettings.ts` + routes)

- **Care plans (`carePlans.ts`):** For caregivers, `getPatientPrivacySettings` → if `!carePlanVisibleToCaregivers`, caregiver is blocked from care-plan reads for that patient.
- **Documents (`patientDocuments.ts`):** For caregivers, `!shareDocumentsWithCaregivers` blocks listing/visibility. **`isHidden`:** patient and caregiver are excluded unless viewer is `CLINICIAN` or `ADMIN` (staff still see hidden docs in list logic as implemented).

### 1.4 Therapy / progress split (current problem)

- **`Server/src/routes/caregiverProgress.ts`:** Returns **synthetic** `goals` and `weeklyUpdate` derived from visits, vitals, medications — **not** from care-plan item status or HEP adherence formulas. Includes static `education` placeholders.
- **Patient dashboard (`PatientDashboard.tsx`):** Computes **active care plan %** locally from care-plan API data (separate from caregiver progress).
- **HEP (`hep.ts`):** Assignments/completions are authoritative for exercises; no single shared “therapy progress summary” contract yet.

**Conclusion:** Patient/caregiver “progress” stories are **not unified**; Feature 4 must introduce a **single canonical calculation path** consumed by overview UI and, over time, by `caregiverProgress` (see decisions).

### 1.5 Web surfaces

| Surface | Role | Notes |
|--------|------|--------|
| `PatientCareRecordsPanel.tsx` | Patient + caregiver | Loads care plans + documents; **mutations** (progress selects, check-ins, downloads) mixed with reading. |
| `StaffPatientRecordsEditor.tsx` | Clinician + admin | Authoring: plans, items, documents, vitals, visit summary. **Keep** as authoring hub; narrow UX fixes only. |
| `PatientDashboard.tsx` | Patient | Records tab + privacy gating; Health/overview duplicates care-plan %; Exercises = `PatientHEPTab`. |
| `CaregiverDashboard.tsx` | Caregiver | Records → `PatientCareRecordsPanel`; Progress → `CaregiverProgress` (API `/api/caregiver/progress`); Exercises → `CaregiverHEPTab`. Three related but inconsistent stories. |

### 1.6 Server tests / scripts (existing)

- Feature 1 tests: care plans, documents, privacy.
- Feature 4 tests: HEP, documentation gating.
- Seeds/smoke: `seedFeature1`, `seedFeature4`, `smokeFeature1`, etc.  
Feature 4 will **extend** these patterns (`feature4.recordsOverview`, smoke `smokeFeature4Records`, per plan).

---

## 2. Locked decisions (Phase 0)

| # | Topic | Decision |
|---|--------|----------|
| D1 | **Privacy storage** | **Done (Phase 1):** Prisma model `PatientPrivacySettings` + no-op migration `20260412120000_feature4_prisma_privacy_settings`; `privacySettings.ts` refactored to Prisma upsert/read. |
| D2 | **Patient/family primary “Records” surface** | **Read-first:** main records experience is **read-only** for care plan presentation, documents list, privacy explanation, and therapy progress summary. **Care-plan progress edits and check-ins** remain **supported by API** but move to a **separate engagement area** (e.g. `CarePlanEngagementPanel` or a dedicated subsection), not the primary read renderer. |
| D3 | **Canonical therapy progress** | **Transparent composite** (no unexplained single score): (A) care-plan item aggregate from active items (`NOT_STARTED` / `IN_PROGRESS` / `COMPLETED` weighting per plan); (B) HEP weekly adherence = actual completions in last 7 days vs expected from active assignments’ `frequencyPerWeek`; (C) optional supporting line from recent vitals and/or check-ins. **Same formulas** for patient and caregiver views. |
| D4 | **`GET /api/caregiver/progress`** | **Refactor to use shared library** used by `GET /api/records/overview` (e.g. `recordsOverview.ts` + extracted `therapyProgress` helpers). **Do not** maintain two different business-logic implementations for “recovery progress” long term. Short-term: overview endpoint is source of truth; caregiver route delegates or returns aligned payload sections. |
| D5 | **Patient/caregiver document upload** | **Out of scope for Feature 4 MVP.** Upload remains **clinician/admin** only unless product explicitly reopens this; UI must not imply self-upload. |
| D6 | **Domain routes** | **Keep** `carePlans`, `patientDocuments`, `patientPrivacy`, `hep`, `vitals`, `blob` — **do not** duplicate pipelines. New **`GET /api/records/overview?patientId=`** aggregates read model **on top of** existing data access patterns. |
| D7 | **Caregiver expansion of privacy API** | **No.** Patients remain the only editors of privacy; caregivers only **read** explained state (Phase 9). |

---

## 3. Frozen read-model contract (draft for Phase 2 implementation)

**Endpoint:** `GET /api/records/overview?patientId=<uuid>`

**Authorization:** Resolve `patientAccess` + caregiver privacy flags consistently; return **403** when `NONE` or when caregiver is blocked for a subsection (or return structured `blocked` sections — implementation detail in Phase 2, but behavior must be predictable and tested).

**Response sections (logical):**

| Section | Content |
|---------|---------|
| `carePlan` | Active plan summary, grouped items in patient-friendly groupings, `lastUpdated`, `reviewBy` if present |
| `documents` | Visible documents only (respect `isHidden` + caregiver sharing) |
| `privacy` | Fields needed for display: sharing toggles, consent metadata (viewer-appropriate) |
| `therapyProgress` | Canonical composite: care-plan summary stats, HEP adherence, supporting trend text/flags |
| `recentVitals` | Optional latest-per-type snapshot |
| `lastUpdated` | Overall freshness indicator |

**Rules:** Read-only; **reuse** existing queries/helpers; **no second set** of business rules that diverge from care-plan/HEP semantics.

---

## 4. Surface disposition

| Surface | Disposition |
|---------|-------------|
| `Server/src/lib/privacySettings.ts` | **Refactor** → Prisma-backed model in Phase 1 (thin wrapper or replace raw SQL). |
| `Server/src/routes/carePlans.ts`, `patientDocuments.ts`, `patientPrivacy.ts` | **Keep**; **align** semantics/labels in Phases 1, 4. |
| `Server/src/routes/hep.ts`, `vitals.ts` | **Keep**; overview **consumes** them. |
| `Server/src/routes/caregiverProgress.ts` | **Refactor** to shared progress/read logic (Phase 3 / aligned with Phase 2). |
| `PatientCareRecordsPanel.tsx` | **Refactor or replace** with read-first composition (`PatientRecordsExperience` + subcomponents per plan). |
| `StaffPatientRecordsEditor.tsx` | **Keep**; **minor** alignment (labels, doc types, preview hints). |
| `PatientDashboard.tsx` / `CaregiverDashboard.tsx` | **Integrate** new experience; **dedupe** progress math (Phases 6–7). |
| `Client/web/src/api/*.ts` | **Add** `recordsOverview.ts`; extend existing modules as needed. |

**Deprecate:** Nothing removed in Phase 0; avoid **new** parallel “records” APIs outside the planned overview + existing domain routes.

---

## 5. Phase sequence (reminder)

0 ✅ Audit + freeze (this document)  
1 Privacy + visibility hardening  
2 ✅ **`GET /api/records/overview`** — `Server/src/lib/recordsOverview.ts`, `Server/src/routes/recordsOverview.ts`, mounted at `/api/records/overview`; client helper `Client/web/src/api/recordsOverview.ts`; tests `feature4.recordsOverview.test.ts`.  
3 ✅ Canonical therapy progress — `Server/src/lib/therapyProgress.ts`; `recordsOverview` + `caregiverProgress`; tests `feature4.therapyProgress.test.ts`.  
4 Document UX normalization  
5 Read-first client components  
6 Patient dashboard  
7 Caregiver dashboard  
8 Staff authoring alignment  
9 Privacy UX clarity  
Testing/smoke/browser matrix per `Feature4_ImplementationPlan.md` Section 8–9.

---

## 6. How to manually verify Phase 0

Phase 0 **does not change runtime behavior**. Verification is **documentation and decision review**.

1. **Read this file** end-to-end and confirm the **locked decisions (Section 2)** match product intent (especially read-first Records, no patient upload, Prisma privacy in Phase 1, single progress model).
2. **Spot-check the audit references** (optional, ~10 minutes):
   - Open `Server/src/lib/privacySettings.ts` — confirm table is created via raw SQL, not Prisma models.
   - Open `Server/src/routes/caregiverProgress.ts` — confirm `goals` are derived from visits/vitals/meds, not HEP/care-plan formulas.
   - Open `Client/web/src/components/healthRecords/PatientCareRecordsPanel.tsx` — confirm progress `select` + check-in flows exist alongside reading.
3. **Optional — grep sanity:**
   - From repo root: `rg "model PatientPrivacySettings" Server/prisma/schema.prisma` → expect **one** model definition.
   - `rg "carePlanVisibleToCaregivers" Server/src/routes` → see usage in `carePlans.ts`.
4. **Sign-off:** Proceed to **Phase 1** when stakeholders agree Section 2 decisions are final.

---

## 7. Appendix: files audited for Phase 0

- `Server/prisma/schema.prisma` (partial + grep)
- `Server/src/lib/patientAccess.ts`
- `Server/src/lib/privacySettings.ts`
- `Server/src/routes/carePlans.ts` (privacy gating)
- `Server/src/routes/patientDocuments.ts` (privacy + `isHidden`)
- `Server/src/routes/caregiverProgress.ts` (full)
- `Client/web/src/components/healthRecords/PatientCareRecordsPanel.tsx` (header + patterns)
- `Client/web/src/pages/patient/PatientDashboard.tsx` (records / progress grep)
- `Client/web/src/pages/caregiver/CaregiverDashboard.tsx` (records / progress grep)

Additional files from the implementation plan (HEP route, vitals, staff editor, API modules) are in scope for Phases 1–2; they were cross-checked at plan level for Phase 0.
