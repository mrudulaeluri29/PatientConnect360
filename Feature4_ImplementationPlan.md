# Feature 4 Implementation Plan

### Feature name
**Patient records experience: care plans, documents, privacy, and therapy progress**

### Scope for this plan
This plan is for **Server** and **Client/web** only.

### Feature intent
Feature 4 is not a greenfield “records module.” The repo already contains substantial backend and web functionality for care plans, patient documents, privacy settings, HEP assignments, vitals, visit summaries, and caregiver-facing progress views.

The real goal of Feature 4 is to turn those partial capabilities into a **single coherent patient/family-facing records and recovery visibility experience** that matches the MVP concept docs:
- read-only care-plan visibility for patient/family
- clear document visibility and download behavior
- privacy and consent state that is understandable
- therapy progress that reflects actual clinical/workflow data instead of scattered widgets

### Why this feature is fourth
This feature maps directly to the original concept docs and MVP-1 tables:
- **MVP-1:** care plan read only
- **MVP-1:** therapy progress widget
- **Concept docs:** care plan visibility, therapy progress, caregiver transparency, privacy-aligned sharing

The codebase already has much of the required data and several partial surfaces, but the current experience is fragmented across dashboards and mixes read-only patient-family viewing with workflow-authoring behavior.

### Out of scope for this implementation plan
- `Client/mobile/*`
- full clinical authoring redesign across every record type
- AI-generated summaries
- OASIS workflows
- education library / classes expansion
- EMR / FHIR integration
- broad analytics work unrelated to records visibility

---

## 1. Desired end state for Feature 4

At the end of this feature, the app should have one clear records-and-recovery story for patient and caregiver users.

### 1.1 Product behavior target

#### Patient
- can open a clear **Records** experience showing active care plan information in patient-friendly language
- can understand what is being worked on, what goals exist, and when the plan was last updated
- can view and download visible documents safely
- can understand current privacy-sharing settings and consent state
- can understand therapy progress through a simplified progress summary built from existing HEP / care-plan / recent clinical data

#### Caregiver / MPOA
- can see only records the patient has chosen to share
- gets the same overall records mental model as the patient
- can switch patient context safely if linked to more than one patient
- can understand progress, active plan items, and visible documents without cross-patient leakage

#### Clinician / Admin
- continue using existing authoring/management surfaces for care plans, documents, visit summaries, and vitals
- do not lose current workflow capabilities while patient/caregiver read experiences are improved
- gain clearer visibility semantics so authored content appears correctly in patient/family views

### 1.2 Technical outcome target
- one coherent **patient/family records read experience** exists on web
- caregiver visibility rules are consistent across care plans, documents, and progress
- privacy/consent state is explicit and understandable
- therapy progress uses a deliberate, explainable model instead of multiple disconnected indicators
- clinician/admin authoring remains intact without forcing patient-family UIs to reuse authoring widgets

---

## 2. Mandatory current-state audit before implementation

Before touching code, the Feature 4 owner/agent must audit all existing records-related code so they do not rebuild what already exists.

This audit is **required**.

The codebase already has:
- care-plan routes and web UIs
- document upload/list/download flows
- privacy settings with patient-controlled caregiver visibility
- HEP assignment/completion flows
- vitals surfaces
- clinician/admin records editors
- caregiver progress summaries

Feature 4 must **unify and polish** these, not duplicate them.

---

## 3. Current-state audit checklist

---

## 3.1 Data model and schema audit

### File: `Server/prisma/schema.prisma`
Audit these existing models:
- `CarePlan`
- `CarePlanItem`
- `CarePlanItemProgress`
- `CarePlanCheckIn`
- `PatientDocument`
- `VitalSign`
- `Exercise`
- `ExerciseAssignment`
- `ExerciseCompletion`
- `VisitPrepTask`

### Important current-state conclusions
- the schema already supports care plans, structured plan items, item progress, and check-ins
- the schema already supports document metadata and Azure blob-backed storage references
- the schema already supports HEP assignments and completions
- the schema already supports vitals and visit-linked clinical summary data

### Important gap to note
`PatientPrivacySettings` is **not formalized in Prisma schema** even though privacy settings are already in use in the app.

That means privacy currently depends on runtime table management in:
- `Server/src/lib/privacySettings.ts`

This is a major architecture note for Feature 4. The owner must decide whether to:
1. keep the raw-SQL helper approach for MVP speed, or
2. formalize privacy settings in Prisma as part of the feature hardening.

### Required conclusion for the owner
Do not assume privacy is already modeled cleanly just because privacy endpoints exist.

---

## 3.2 Audit `Server/src/lib/patientAccess.ts`

This file is foundational for record visibility.

### Existing behavior already present
- resolves scoped access level by patient
- access levels include:
  - `NONE`
  - `SELF`
  - `CAREGIVER`
  - `CLINICIAN`
  - `ADMIN`
- helper gates already exist for:
  - reading care-plan data
  - editing care-plan definitions
  - updating care-plan progress
  - managing documents

### Important current-state implication
Feature 4 should reuse this access model rather than inventing separate visibility logic inside every route/component.

### Important product nuance
Current helper semantics allow:
- patients and caregivers to update care-plan progress
- clinicians/admins to manage documents

This matters because the desired patient/family UX for Feature 4 is primarily **read-only records visibility**, but the current panel already exposes mutation actions.

---

## 3.3 Audit `Server/src/lib/privacySettings.ts`

### Existing behavior already present
- creates `PatientPrivacySettings` table at runtime if missing
- returns default privacy settings when no row exists
- stores:
  - `shareDocumentsWithCaregivers`
  - `carePlanVisibleToCaregivers`
  - `consentRecordedAt`
  - `consentVersion`

### Important current-state issues
- privacy storage is outside the Prisma schema model layer
- the helper uses raw SQL for table creation/query/upsert
- defaults are permissive (`true`) for sharing fields unless otherwise set

### Required conclusion
Feature 4 must explicitly account for the fact that privacy state is real and already enforced, but is not yet cleanly modeled.

---

## 3.4 Audit `Server/src/routes/carePlans.ts`

This route is already a substantial portion of Feature 4.

### Existing behavior already present
- `GET /api/care-plans?patientId=`
- `POST /api/care-plans`
- `POST /api/care-plans/:id/items`
- `PATCH /api/care-plans/items/:itemId`
- `POST /api/care-plans/items/:itemId/progress`
- `POST /api/care-plans/:id/checkins`
- `PATCH /api/care-plans/:id`

### Important current-state behavior
- caregiver access is already gated by patient privacy via `carePlanVisibleToCaregivers`
- care plans include item progress and recent check-ins
- clinicians/admins can author plans and items
- patients/caregivers can submit progress and check-ins
- care-plan updates already trigger notifications via `onCarePlanUpdated`

### Important current-state issue
The route is already capable of more than the **Feature 4 read-only care plan** MVP requirement.

That means the owner must decide whether the patient/caregiver records UI should:
- remain interactive for progress/check-ins, or
- become read-first with progress logging moved elsewhere

### Recommendation
Treat the **records experience** as read-first, even if care-plan progress/check-ins remain supported elsewhere.

Do not blindly reuse mutation-heavy UI just because the route allows it.

---

## 3.5 Audit `Server/src/routes/patientDocuments.ts`

This route already covers most of the document pipeline.

### Existing behavior already present
- `GET /api/patient-documents?patientId=`
- `POST /api/patient-documents`
- `PATCH /api/patient-documents/:id`
- `POST /api/patient-documents/:id/download-url`

### Important current-state behavior
- upload uses `multer` memory storage
- file types are already restricted
- upload requires Azure Blob configuration
- download uses SAS URL generation
- caregiver visibility is already blocked when `shareDocumentsWithCaregivers` is false
- `isHidden` removes documents from patient/caregiver visibility while keeping them visible to clinicians/admins

### Important current-state issues
- `docType` is effectively freeform and not strongly normalized in the current route/UI
- the staff editor labels `isHidden` as “Hidden from patient,” but the route also hides for caregivers
- there is no patient-friendly document taxonomy or explanation in the view layer
- current patient-family document surface is list-and-download only

### Required conclusion
Feature 4 should improve **document clarity and visibility semantics**, not rebuild blob storage or invent a new document service.

---

## 3.6 Audit `Server/src/routes/patientPrivacy.ts`

### Existing behavior already present
- `GET /api/patients/me/privacy`
- `PATCH /api/patients/me/privacy`

### Current fields already supported
- `shareDocumentsWithCaregivers`
- `carePlanVisibleToCaregivers`
- `recordConsent`
- `consentVersion`

### Important current-state issue
Privacy is currently patient-only for viewing/editing, which is correct for control, but the patient-family UX around this state is still fragmented.

### Required conclusion
Feature 4 should not expand privacy power to caregivers. It should improve clarity around what is shared, when consent was recorded, and how those changes affect patient/family views.

---

## 3.7 Audit `Server/src/routes/hep.ts`

This route is central to therapy-progress visibility.

### Existing behavior already present
- `GET /api/hep`
- `POST /api/hep/assignments`
- `PATCH /api/hep/assignments/:id`
- `POST /api/hep/assignments/:id/complete`

### Important current-state behavior
- clinicians/admins can assign exercises
- patients/caregivers can log completions
- role gating is already enforced
- assignment lists include completions, assigned clinician, and patient context

### Important current-state issue
The HEP route provides good raw data, but there is no single patient-friendly progress summary contract built on top of it.

### Required conclusion
Feature 4 should not duplicate HEP storage or assignment logic. It should build a coherent read model / UI on top of existing HEP data.

---

## 3.8 Audit `Server/src/routes/caregiverProgress.ts`

### Existing behavior already present
- `GET /api/caregiver/progress`
- returns caregiver-linked patient progress bundles
- includes derived goals and weekly summaries built from:
  - recent visits
  - recent vitals
  - active medications

### Important current-state issue
This route currently produces a **synthetic caregiver progress story** that is only partially tied to actual care-plan / HEP data.

It is useful, but it does not match the desired Feature 4 end state by itself.

### Required conclusion
The owner must decide whether to:
- refactor this route to align with canonical therapy-progress logic, or
- replace parts of it with a new shared records/progress read model.

Do not leave patient progress and caregiver progress driven by completely different logic after this feature is done.

---

## 3.9 Audit `Server/src/routes/vitals.ts`

### Existing behavior already present
- patient/clinician/admin vitals access already exists
- latest-per-type retrieval already exists
- visit-linked vital creation and update are already supported

### Important current-state implication
Vitals are already available as supporting recovery data. Feature 4 should decide whether they are:
- part of the therapy progress summary,
- a supporting “recent health snapshot,”
- or both.

Do not create a second vitals summary system if current endpoints are already sufficient.

---

## 3.10 Audit `Server/src/storage/blob.ts`

### Existing behavior already present
- Azure configuration detection
- upload helper
- SAS URL generation for reads

### Required conclusion
Feature 4 should continue using this storage path. Do not create alternate document-storage logic.

---

## 3.11 Audit existing server tests and scripts

### Files to inspect
- `Server/src/__tests__/feature1.carePlans.test.ts`
- `Server/src/__tests__/feature1.documents.test.ts`
- `Server/src/__tests__/feature1.privacy.test.ts`
- `Server/src/__tests__/feature4.hep.test.ts`
- `Server/src/__tests__/feature4.documentationGating.test.ts`
- `Server/src/scripts/seedFeature1.ts`
- `Server/src/scripts/seedFeature4.ts`
- `Server/src/scripts/smokeFeature1.ts`
- `Server/package.json`

### Important current-state conclusions
- there is already automated coverage for care plans, documents, privacy, and HEP
- there is already seed data for records and HEP demos
- there is already a smoke script for care plans/documents

### Required conclusion
Feature 4 should extend these patterns instead of creating an unrelated testing style.

---

## 3.12 Audit `Client/web/src/components/healthRecords/PatientCareRecordsPanel.tsx`

This is the most important current web component for Feature 4.

### Existing behavior already present
- loads care plans and documents in parallel
- used by patient and caregiver records views
- displays care plan blocks, check-ins, and documents
- allows:
  - care-plan item progress editing
  - check-in submission
  - document download

### Important current-state issue
This component is **not read-only** even though the desired Feature 4 records experience is primarily read-only care-plan visibility.

It currently mixes:
- reading care-plan details
- submitting progress
- submitting check-ins
- downloading documents

### Required conclusion
Feature 4 should likely split this into:
1. a read-first patient/family records surface
2. optional engagement actions kept separate if retained

Do not keep adding more responsibilities into this component without first deciding whether it should stay shared and interactive.

---

## 3.13 Audit `Client/web/src/components/healthRecords/StaffPatientRecordsEditor.tsx`

This is the current clinician/admin authoring surface.

### Existing behavior already present
- create/update care plans
- create/update care plan items
- activate/deactivate items
- see patient progress/check-ins
- upload documents
- toggle document hidden state
- edit visit summaries
- create/update visit vitals

### Important current-state implication
The repo already has a substantial staff records editor.

Feature 4 is **not** primarily about rebuilding this. It is about making patient/family records visibility coherent and ensuring authored content appears correctly downstream.

### Important current-state issue
This component currently acts as a large all-in-one editor with freeform `docType` input and visibility labels that are not fully aligned with patient/caregiver semantics.

---

## 3.14 Audit patient-facing dashboard integrations

### File: `Client/web/src/pages/patient/PatientDashboard.tsx`

### Existing behavior already present
- records tab already contains privacy consent + patient records panel
- other dashboard sections already compute/display care-plan progress
- health view already combines latest vitals and care-plan progress
- exercises view already uses `PatientHEPTab`

### Important current-state issues
- care-plan progress is duplicated between dashboard sections and records surfaces
- privacy gating is enforced at dashboard-navigation level, not just within records content
- the current records experience is only one part of a broader fragmented patient recovery story

### Required conclusion
Feature 4 should reduce fragmentation and define where the canonical patient records/progress experience lives.

---

## 3.15 Audit caregiver-facing dashboard integrations

### File: `Client/web/src/pages/caregiver/CaregiverDashboard.tsx`

### Existing behavior already present
- `CaregiverRecordsTab()` uses `PatientCareRecordsPanel`
- `CaregiverProgress()` uses `/api/caregiver/progress`
- `CaregiverHEPTab` exists separately
- patient switching is already built into the caregiver dashboard

### Important current-state issue
Caregiver records, caregiver progress, and caregiver exercises are currently **three separate stories**:
1. records tab
2. progress tab
3. exercises/tasks tab

### Required conclusion
Feature 4 should align these so caregiver “records and recovery visibility” feels deliberate rather than stitched together.

---

## 3.16 Audit clinician/admin records entry points

### Files
- `Client/web/src/pages/clinician/ClinicianDashboard.tsx`
- `Client/web/src/pages/admin/AdminDashboard.tsx`

### Existing behavior already present
- both already mount `StaffPatientRecordsEditor`
- clinician/admin dashboards already have patient-records entry points

### Required conclusion
Feature 4 should preserve these authoring entry points and only change them where necessary to support the improved patient/family experience.

---

## 3.17 Audit web API modules

### Files to inspect
- `Client/web/src/api/carePlans.ts`
- `Client/web/src/api/patientDocuments.ts`
- `Client/web/src/api/privacy.ts`
- `Client/web/src/api/hep.ts`
- `Client/web/src/api/vitals.ts`

### Important current-state conclusions
- dedicated API modules already exist
- care plans, documents, privacy, and HEP already have typed contracts
- the web app is already consuming domain-specific endpoints directly

### Required conclusion
If Feature 4 introduces an aggregate records endpoint, it should do so deliberately through a new API module rather than by sprinkling axios calls through dashboard files.

---

## 4. Architecture recommendation for Feature 4

### Core recommendation
Do **not** attempt to implement Feature 4 by continuing to grow the current all-in-one `PatientCareRecordsPanel` and scattered dashboard progress widgets.

Instead:
1. preserve existing server domain routes
2. add a **read-optimized records/progress layer** only where needed
3. split patient/family read surfaces from staff authoring surfaces
4. align patient and caregiver progress around one explainable model

### Recommended canonical product structure

#### Read layer
- patient and caregiver consume a shared records experience made of smaller reusable components
- that experience shows:
  - care plan summary
  - documents
  - privacy/consent state
  - therapy progress summary

#### Authoring layer
- clinicians/admins continue to use `StaffPatientRecordsEditor`
- only make targeted improvements there (labels, doc types, visibility semantics, previewability)

### Recommended server direction
Keep the existing domain routes, but strongly consider adding a **read-only aggregate records endpoint/helper** so the patient/caregiver UI does not keep stitching together many unrelated calls and progress formulas.

Recommended new server helper:
- `Server/src/lib/recordsOverview.ts`

Recommended new route:
- `Server/src/routes/recordsOverview.ts`

Recommended endpoint shape:
- `GET /api/records/overview?patientId=`

Potential payload sections:
- `carePlanSummary`
- `documents`
- `privacy`
- `therapyProgress`
- `recentVitalsSummary`
- `lastUpdated`

### Why this is recommended
- existing domain routes remain reusable
- caregiver gating can be centralized in one read model
- patient and caregiver UIs stop duplicating calculation logic
- therapy progress becomes deliberate instead of ad hoc

---

## 5. Key implementation decisions the owner must make early

Before coding deeply, the owner must explicitly decide the answers to these.

### 5.1 Should patient/family records be truly read-only?
Recommended answer: **yes for the primary records surface**.

If care-plan progress updates and check-ins remain in scope, move them into a clearly separate engagement section instead of mixing them into the main read-only care-plan renderer.

### 5.2 What is the canonical therapy progress model?
Recommended answer: use a transparent composite instead of a fake single magic score.

Example MVP breakdown:
- **Care plan progress:** percentage of active care-plan items marked started/completed
- **HEP adherence:** completions logged this week vs expected completions this week from active assignments
- **Recent health trend:** supporting summary from recent vitals/check-ins

### 5.3 Should privacy settings be formalized in Prisma now?
Recommended answer: if feasible, yes. If not, explicitly document why the raw-SQL helper remains and avoid expanding privacy fields too aggressively this sprint.

### 5.4 Does this sprint include patient/caregiver document upload?
Current code only supports clinician/admin upload.

Recommended MVP decision:
- keep clinician/admin upload authoritative unless product explicitly requires patient/family-originated uploads in this sprint
- if patient/caregiver upload is added, constrain it narrowly by role and document type

---

## 6. Recommended file-level implementation plan

### 6.1 Existing files likely to be modified

#### Server
- `Server/prisma/schema.prisma`
- `Server/src/lib/patientAccess.ts`
- `Server/src/lib/privacySettings.ts`
- `Server/src/routes/carePlans.ts`
- `Server/src/routes/patientDocuments.ts`
- `Server/src/routes/patientPrivacy.ts`
- `Server/src/routes/hep.ts`
- `Server/src/routes/caregiverProgress.ts`
- `Server/src/routes/vitals.ts`
- `Server/src/index.ts`
- `Server/package.json`

#### Client/web
- `Client/web/src/pages/patient/PatientDashboard.tsx`
- `Client/web/src/pages/caregiver/CaregiverDashboard.tsx`
- `Client/web/src/pages/patient/PatientHEPTab.tsx`
- `Client/web/src/pages/caregiver/CaregiverHEPTab.tsx`
- `Client/web/src/pages/clinician/ClinicianDashboard.tsx`
- `Client/web/src/pages/admin/AdminDashboard.tsx`
- `Client/web/src/components/healthRecords/PatientCareRecordsPanel.tsx`
- `Client/web/src/components/healthRecords/PatientCareRecordsPanel.css`
- `Client/web/src/components/healthRecords/StaffPatientRecordsEditor.tsx`
- `Client/web/src/api/carePlans.ts`
- `Client/web/src/api/patientDocuments.ts`
- `Client/web/src/api/privacy.ts`
- `Client/web/src/api/hep.ts`

### 6.2 New files likely to be added

#### Server
- `Server/src/lib/recordsOverview.ts`
- `Server/src/routes/recordsOverview.ts`
- `Server/src/__tests__/feature4.recordsOverview.test.ts`
- `Server/src/__tests__/feature4.documentVisibility.test.ts`
- `Server/src/__tests__/feature4.privacyClarity.test.ts`
- `Server/src/__tests__/feature4.therapyProgress.test.ts`
- `Server/src/scripts/smokeFeature4Records.ts`

#### Client/web
- `Client/web/src/api/recordsOverview.ts`
- `Client/web/src/components/healthRecords/PatientRecordsExperience.tsx`
- `Client/web/src/components/healthRecords/PatientRecordsExperience.css`
- `Client/web/src/components/healthRecords/CarePlanReadOnlySection.tsx`
- `Client/web/src/components/healthRecords/TherapyProgressWidget.tsx`
- `Client/web/src/components/healthRecords/RecordsDocumentList.tsx`
- `Client/web/src/components/healthRecords/PrivacyConsentPanel.tsx`
- `Client/web/src/components/healthRecords/RecordsGlossary.tsx`

Optional if the owner prefers keeping mutation UI but splitting it from read-only view:
- `Client/web/src/components/healthRecords/CarePlanEngagementPanel.tsx`

---

## 7. Phased execution plan for AI agents / feature owner

The steps below are intentionally sequential and should be followed in order.

---

## Phase 0 — Audit and architecture freeze

### Goal
Decide what is already usable, what gets unified, and what becomes canonical for patient/family records visibility.

### Tasks
1. Complete the audit in Sections 3.1–3.17.
2. Write down:
   - whether privacy settings remain raw-SQL-backed or move into Prisma
   - whether patient/family records are strictly read-only
   - whether therapy progress gets a new aggregate read model
   - whether caregiver progress is refactored or wrapped
   - whether patient/caregiver document upload is in scope or deferred
3. Freeze the read-model contract before large UI changes.

### Required output of Phase 0
- canonical Feature 4 architecture note
- list of existing surfaces to keep, refactor, or deprecate

### Do not proceed until
- the owner can explain how care plans, documents, privacy, and HEP already work today

---

## Phase 1 — Server privacy and visibility hardening

### Goal
Ensure the visibility foundation is trustworthy before polishing the UI.

### Tasks

#### 1. Audit and decide privacy data storage strategy
Files:
- `Server/prisma/schema.prisma`
- `Server/src/lib/privacySettings.ts`

Recommended direction:
- preferably add a formal Prisma model for `PatientPrivacySettings`
- if not done now, document the raw-SQL helper as intentional MVP technical debt

#### 2. Normalize caregiver visibility semantics
Files:
- `Server/src/lib/patientAccess.ts`
- `Server/src/routes/carePlans.ts`
- `Server/src/routes/patientDocuments.ts`
- `Server/src/routes/patientPrivacy.ts`

Ensure the semantics are explicit and aligned:
- care plan visible to caregivers? use one consistent source
- documents visible to caregivers? use one consistent source
- hidden document means hidden from both patient and caregiver, not just patient

#### 3. Decide whether to expand privacy fields this sprint
Possible additions only if truly needed:
- explicit therapy-progress sharing toggle
- last-updated reason/source

Recommendation:
- avoid expanding privacy fields unless the current two toggles are insufficient

---

## Phase 2 — Server read-model / aggregate records API

### Goal
Create a clear, read-optimized contract for patient/caregiver records visibility.

### Recommended new file
- `Server/src/lib/recordsOverview.ts`

### Suggested responsibilities
- resolve patient access level
- apply caregiver privacy gating consistently
- fetch active care plan summary
- fetch visible documents
- fetch privacy state relevant to the viewer
- compute therapy progress summary from HEP + care-plan data
- optionally include recent vitals summary and last-updated timestamps

### Recommended new route
- `Server/src/routes/recordsOverview.ts`

### Recommended endpoint
- `GET /api/records/overview?patientId=`

### Suggested response sections
- `carePlan`
  - current/active plan
  - readable grouped items
  - last updated
  - review by
- `documents`
  - visible docs only
  - labels, timestamps, doc types
- `privacy`
  - what is shared and consent metadata
- `therapyProgress`
  - care-plan item progress summary
  - active HEP counts
  - weekly completion/adherence indicator
  - recent supporting trend
- `recentVitals`
  - latest-per-type snapshot if included

### Important instruction
This route should be **read-only** and should call into existing domain logic rather than re-implementing business rules differently.

---

## Phase 3 — Canonical therapy progress model

### Goal
Replace fragmented progress visuals with one explainable progress story.

### Current-state problems to solve
- patient dashboard computes care-plan percent locally from started/completed items
- caregiver progress route computes synthetic goals from visits/vitals/medications
- HEP views expose raw assignments/completions but not one patient-friendly summary

### Recommended MVP progress model

#### A. Care plan progress
Derived from active care-plan items:
- `NOT_STARTED` = 0
- `IN_PROGRESS` = 50
- `COMPLETED` = 100

Use aggregate percent + grouped counts.

#### B. HEP adherence
Derived from active assignments:
- expected completions this week = sum of `frequencyPerWeek` for active assignments
- actual completions this week = number of completion rows in last 7 days
- adherence percent = `actual / expected`, capped at 100 for the main widget but raw values retained in detail text

#### C. Supporting trend signal
Use existing recent vitals and/or recent care-plan check-ins as supporting context, not as opaque numeric score inflation.

### Important instruction
Do not invent fake progress percentages that cannot be explained to users or validated in tests.

---

## Phase 4 — Document experience normalization

### Goal
Make document handling understandable and safe.

### Tasks

#### 1. Normalize document type presentation
Files:
- `Server/src/routes/patientDocuments.ts`
- `Client/web/src/api/patientDocuments.ts`
- `Client/web/src/components/healthRecords/RecordsDocumentList.tsx`
- `Client/web/src/components/healthRecords/StaffPatientRecordsEditor.tsx`

Recommended direction:
- introduce a shared label map for common document types
- avoid exposing raw uppercase internal strings as the only user-facing taxonomy

#### 2. Clarify visibility labels
Current issue:
- “Hidden from patient” does not fully describe caregiver behavior

Recommended language:
- “Hidden from patient & caregiver portal view”

#### 3. Improve error states
Current issue:
- Azure misconfiguration is mostly a raw backend error

Recommended UX:
- explicit message in staff editor if upload is unavailable
- explicit message in patient/caregiver views if a download cannot be generated

#### 4. Decide upload scope
If patient/caregiver upload is **not** included:
- keep upload in staff surfaces only
- do not accidentally promise self-upload in the patient-family UI

If patient/caregiver upload **is** included:
- use the existing `patientDocuments.ts` pipeline
- add strict role and document-type rules
- include audit/test coverage for unsafe uploads and caregiver scoping

---

## Phase 5 — Split read-only patient/family records UI from edit flows

### Goal
Stop using one component as both reader and lightweight editor.

### Recommended new component structure
- `PatientRecordsExperience.tsx`
- `CarePlanReadOnlySection.tsx`
- `TherapyProgressWidget.tsx`
- `RecordsDocumentList.tsx`
- `PrivacyConsentPanel.tsx`
- `RecordsGlossary.tsx`

### Suggested responsibilities

#### `PatientRecordsExperience.tsx`
- top-level orchestration for patient/caregiver records view
- consumes aggregate records overview endpoint or composed domain APIs
- handles loading/error/empty states cleanly

#### `CarePlanReadOnlySection.tsx`
- renders grouped care plan headings in patient-friendly terms:
  - Problems we’re watching
  - Goals we’re working toward
  - What your care team is doing
- shows last updated and review-by metadata

#### `TherapyProgressWidget.tsx`
- shows care-plan progress, active HEP counts, and weekly adherence text
- uses human language, not only percentages

#### `RecordsDocumentList.tsx`
- shows document labels, timestamps, and download actions
- handles “not shared” and “none available” clearly

#### `PrivacyConsentPanel.tsx`
- patient-facing control panel for sharing + consent metadata
- caregiver-facing read-only explanation of patient-controlled visibility state

#### `RecordsGlossary.tsx`
- explains terms like care plan, intervention, HEP, and check-in where helpful

### Important instruction
Do not keep extending `PatientCareRecordsPanel.tsx` indefinitely. Either refactor it into the above structure or replace it with the new read-first composition.

---

## Phase 6 — Patient dashboard integration

### Goal
Make the patient records experience coherent across Records, Health, and Exercises surfaces.

### Existing file
- `Client/web/src/pages/patient/PatientDashboard.tsx`

### Recommended implementation direction

#### Records tab
- replace direct use of mutation-heavy `PatientCareRecordsPanel` with the new read-first records experience
- retain privacy consent gating

#### Health / overview duplication cleanup
- reduce duplicate care-plan progress calculations scattered through dashboard sections
- ensure the same progress logic powers both summary widgets and full records view

#### Exercises tab coordination
- keep `PatientHEPTab` as the exercise/task action surface
- do not force the records tab to become the main exercise-completion workflow

### Important instruction
The patient should not see contradictory care-plan/therapy progress values in different tabs after this feature is complete.

---

## Phase 7 — Caregiver dashboard integration

### Goal
Make caregiver records and progress feel like one product story.

### Existing file
- `Client/web/src/pages/caregiver/CaregiverDashboard.tsx`

### Recommended implementation direction

#### Records tab
- replace or refactor current `PatientCareRecordsPanel` usage into the same read-first records experience used by patients
- preserve patient selection chip UX

#### Progress tab
- align `CaregiverProgress()` with the canonical therapy-progress model
- either refactor `caregiverProgress.ts` to match the new overview data or have the tab consume the new aggregate contract

#### Exercises tab
- keep `CaregiverHEPTab` as a task/action view
- ensure its counts and status language match the progress widget

### Critical caregiver instruction
Multi-patient caregivers must never see:
- wrong patient documents
- wrong patient care plan data
- progress/adherence metrics from another linked patient

---

## Phase 8 — Staff authoring surface alignment

### Goal
Keep clinician/admin authoring useful while ensuring authored content renders well for end users.

### Existing files
- `Client/web/src/components/healthRecords/StaffPatientRecordsEditor.tsx`
- `Client/web/src/pages/clinician/ClinicianDashboard.tsx`
- `Client/web/src/pages/admin/AdminDashboard.tsx`

### Recommended work
- improve visibility labels for documents
- standardize/commonize doc type options instead of relying only on free text
- ensure authored care-plan items display well in the new read-only renderer
- optionally show a small “patient portal preview” hint or note so staff understand how content will appear downstream

### Important instruction
Do not turn Feature 4 into a full clinician documentation overhaul. Make only the changes needed to support the patient/caregiver records experience correctly.

---

## Phase 9 — Privacy UX clarity on web

### Goal
Make privacy state obvious to both the patient controlling it and the caregiver affected by it.

### Patient expectations
- sees current sharing toggles clearly
- sees last consent date/version clearly
- sees explanation that changing sharing preferences affects caregiver visibility
- sees re-consent path clearly when required

### Caregiver expectations
- if blocked, sees a specific message such as:
  - care plan sharing is disabled by the patient
  - document sharing is disabled by the patient
- does not see ambiguous generic errors where a friendly explanation should exist

### Files likely touched
- `Client/web/src/pages/patient/PatientDashboard.tsx`
- `Client/web/src/pages/caregiver/CaregiverDashboard.tsx`
- `Client/web/src/components/healthRecords/PrivacyConsentPanel.tsx`
- `Client/web/src/api/privacy.ts`

---

## 8. Testing plan

Feature 4 must include automated and browser/manual validation.

---

## 8.1 Server automated testing

### Existing tests to preserve / extend
- `Server/src/__tests__/feature1.carePlans.test.ts`
- `Server/src/__tests__/feature1.documents.test.ts`
- `Server/src/__tests__/feature1.privacy.test.ts`
- `Server/src/__tests__/feature4.hep.test.ts`

### Recommended new tests

#### File: `Server/src/__tests__/feature4.recordsOverview.test.ts`
Cover:
- patient can load records overview for self
- caregiver can load records overview only for linked patient
- clinician/admin can load overview for assigned/managed patient
- unauthorized user gets `403`

#### File: `Server/src/__tests__/feature4.documentVisibility.test.ts`
Cover:
- caregiver sees documents when sharing is enabled
- caregiver cannot see documents when sharing is disabled
- hidden documents remain invisible to patient/caregiver but visible to clinician/admin
- SAS download URL can be generated only for authorized viewers

#### File: `Server/src/__tests__/feature4.privacyClarity.test.ts`
Cover:
- patient updates sharing toggles and records consent
- caregiver visibility changes take effect immediately on next read
- default privacy state is deterministic when no row exists
- if Prisma migration is added, privacy behavior remains identical

#### File: `Server/src/__tests__/feature4.therapyProgress.test.ts`
Cover:
- care-plan progress summary calculations
- HEP adherence calculations for weekly completion
- caregiver progress and patient progress use the same logic
- no divide-by-zero / empty-state errors when there are no active assignments

### Important instruction
Do not delete the earlier Feature 1/Feature 4 tests unless they become genuinely obsolete. Prefer extending coverage and reusing seeded assumptions.

---

## 8.2 Server smoke script

### Recommended new script
- `Server/src/scripts/smokeFeature4Records.ts`

### Suggested smoke coverage
1. log in as patient
2. fetch records overview / care plans / privacy
3. verify visible documents list returns successfully
4. if documents exist, request a download URL
5. log in as caregiver and verify linked-patient visibility behavior
6. log in as clinician, upload or edit one document if storage is configured
7. verify patient/caregiver read views reflect visibility correctly
8. verify therapy progress payload returns usable values

### Package script
Update `Server/package.json` with something like:
- `smoke:feature4:records`

---

## 8.3 Browser/manual validation plan

If browser tools are available, run these end-to-end.

### Environment
- backend: `npm run dev --prefix Server`
- web: `npm run dev --prefix Client/web`

### Browser validation matrix

#### Flow A — Patient records experience
1. sign in as patient
2. open Records
3. verify care plan is rendered with patient-friendly headings
4. verify last-updated metadata is visible
5. verify privacy state is understandable
6. verify documents list/download works for visible docs
7. verify therapy progress widget is understandable and internally consistent

#### Flow B — Patient privacy control
1. open patient privacy settings
2. disable caregiver care-plan visibility
3. re-consent if required
4. verify records tab behavior remains valid for patient
5. later confirm caregiver loses access appropriately

#### Flow C — Caregiver records visibility
1. sign in as caregiver linked to one or more patients
2. open Records
3. switch patient if applicable
4. verify only allowed records appear
5. verify blocked sections show clear explanations instead of generic failures
6. verify no cross-patient leakage when switching contexts

#### Flow D — Therapy progress coherence
1. sign in as patient
2. compare records progress widget vs exercises tab data
3. sign in as caregiver
4. compare caregiver progress tab vs records progress widget
5. verify they reflect the same underlying logic/story

#### Flow E — Staff authoring still works
1. sign in as clinician or admin
2. open patient records editor
3. create or update care-plan item
4. upload a document if Azure is configured
5. toggle document visibility
6. sign in as patient/caregiver and verify downstream rendering matches expectations

#### Flow F — Storage/error handling
1. if Azure is not configured, attempt document upload/download from staff surface
2. verify the UI gives actionable feedback instead of raw failure confusion

### Browser-tool evidence the owner should capture
- patient records screenshot
- patient privacy consent screenshot
- caregiver blocked/unblocked visibility screenshot
- therapy progress widget screenshot
- clinician/admin document visibility control screenshot

---

## 9. Definition of done for Feature 4

Feature 4 is done only when all of the following are true.

### Product criteria
- patient has a coherent records experience for care plan, documents, privacy, and therapy progress
- caregiver has a coherent records experience with correct patient-scoped visibility
- privacy state is understandable and enforceable
- therapy progress feels connected to real care activity rather than arbitrary dashboard math

### Server criteria
- caregiver visibility rules are consistent across care plans and documents
- privacy-state behavior is explicit and tested
- therapy progress has a deliberate read model or canonical calculation path
- document storage continues to use existing Azure blob/SAS flow

### Web criteria
- patient/caregiver records views are read-first and coherent
- patient/caregiver no longer rely on a mutation-heavy shared records component by accident
- clinician/admin authoring still works
- duplicated/contradictory progress logic is reduced

### Testing criteria
- automated tests added/updated for records overview, documents, privacy, and therapy progress
- smoke script added and runnable
- patient, caregiver, clinician/admin browser validation completed

---

## 10. Implementation cautions and anti-patterns

### Do not:
- build a second independent records system parallel to current care-plan/document routes
- leave patient progress and caregiver progress using completely different business logic
- keep mixing read-only patient-family viewing with editing controls without a clear product reason
- silently loosen caregiver visibility rules
- expose hidden documents because of UI label confusion
- expand privacy fields carelessly while they are still stored outside Prisma models

### Do instead:
- reuse current server domain routes where possible
- centralize read-model aggregation if needed
- separate read-first patient/family experience from staff authoring
- make therapy progress explainable and testable
- preserve existing HEP, document, and care-plan infrastructure

---

## 11. Suggested task order for the Feature 4 owner

If another AI agent or engineer owns this feature, they should work in this order:

1. **Audit all current records, privacy, documents, and HEP surfaces**
2. **Decide read-only vs interactive scope for patient/family records**
3. **Decide canonical therapy progress model**
4. **Harden privacy / caregiver visibility semantics**
5. **Add server read-model / aggregate records endpoint if approved**
6. **Extract shared patient-family records UI components**
7. **Integrate patient records experience**
8. **Integrate caregiver records/progress experience**
9. **Align clinician/admin authoring labels and downstream rendering**
10. **Run automated tests, smoke checks, and browser validation**

This order matters. Do not start by styling UI before the visibility and progress model are clear.

---

## 12. Final recommendation to the implementing agent

Feature 4 should be treated as a **records unification and recovery-visibility effort**.

The repo already has:
- care plans
- item progress and check-ins
- patient documents with Azure-backed download flow
- privacy sharing controls
- HEP assignments and completions
- vitals and visit summaries
- clinician/admin authoring tools

What it lacks is a single coherent patient/family-facing records experience and one canonical recovery-progress story.

The owner’s real job is to:
1. audit what already exists,
2. keep the current data model and domain routes where they are already strong,
3. unify caregiver visibility and privacy semantics,
4. build a read-first patient/family records experience,
5. and leave the repo with a trustworthy “records and recovery visibility” pillar that clearly reflects the concept docs.