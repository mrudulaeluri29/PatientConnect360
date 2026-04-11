# Feature 5 Implementation Plan

### Feature name
**Admin / agency pilot-readiness & operational readout**

### Scope for this plan
This plan is for **Server** and **Client/web** only.

### Feature intent
Feature 5 is not just “add an admin dashboard.” The repo already contains real admin operations, analytics, audit-log querying, agency branding, assignment management, feedback review, and approval queues. The real goal is to package those partial capabilities into a **pilotable agency-facing operational layer** that an agency can trust during an MVP pilot.

This feature should turn the current admin area from a mostly-capable engineering surface into an **operational SaaS readout** with:
- clean admin overview
- usable audit log readout
- core pilot KPIs
- branding / support / defaults surfaces
- assignment and review workflows that feel operationally reliable
- visible pilot-readiness support artifacts

### Why this feature is fifth
This feature maps directly to the MVP and concept docs:
- **MVP-1:** audit log and admin readout
- **MVP-1:** pilot readiness kit
- **Concept docs:** agencies need oversight, trust, measurable value, and operational confidence

The patient-facing experience alone is not enough. The product must also be something an agency admin can evaluate and say: **“this is operationally usable for a pilot.”**

### Out of scope for this implementation plan
- `Client/mobile/*`
- deep BI / enterprise analytics warehouse work
- billing and payments
- full white-label packaging / multi-tenant agency partitioning
- EMR/vendor dashboards
- advanced infrastructure monitoring stack implementation
- full SCIM / SSO admin provisioning

---

## 1. Desired end state for Feature 5

At the end of this feature, the app should have a coherent admin/agency readiness story.

### 1.1 Product behavior target

#### Administrator / Agency operator
- sees a trustworthy overview of core operational activity
- can review pending scheduling/availability workflows efficiently
- can inspect audit logs with practical filtering/search/date-range support
- can manage users and patient-clinician assignments with clear status feedback
- can review family feedback and pilot-facing engagement indicators
- can manage agency branding / support settings in a way that updates public-facing portal surfaces
- can access a basic pilot-readiness area/checklist that explains what to validate during a pilot

#### Internal team / pilot sponsor
- can point to a concrete operational KPI layer:
  - DAU / engagement signal
  - schedule change behavior
  - operational queue volume
  - messaging activity
  - family feedback trends

### 1.2 Technical outcome target
- admin analytics, audit, settings, assignments, and feedback feel like one coherent admin product
- backend admin APIs are deliberate and documented rather than ad hoc
- audit logging is usable as an admin readout, not just a raw append-only table
- pilot KPIs have a clear calculation path and testability
- placeholder admin pages and redundant/fragmented routes are either integrated or explicitly de-scoped

---

## 2. Mandatory current-state audit before implementation

Before touching code, the Feature 5 owner/agent must audit all existing admin, analytics, audit, and pilot-readiness surfaces so they do not rebuild what is already present.

This audit is **required**.

The repo already has:
- admin routes with analytics, assignments, settings, messages, and audit logs
- DAU rollups and daily analytics
- family feedback APIs
- agency branding settings surfaced on public pages
- rich admin dashboard code in `Client/web/src/pages/admin/AdminDashboard.tsx`
- several placeholder standalone admin pages/routes that overlap with the dashboard
- audit-related test scripts already in `Server/scripts`

Feature 5 must **consolidate, polish, and operationalize** this, not create a second admin platform.

---

## 3. Current-state audit checklist

---

## 3.1 Data model and schema audit

### File: `Server/prisma/schema.prisma`
Audit these existing models:
- `AgencySettings`
- `AuditLog`
- `PatientAssignment`
- `FamilyFeedback`
- `UserActivityDaily`

### Important current-state conclusions
- `AgencySettings` already exists as persisted configuration for branding/support info
- `AuditLog` already exists and is append-only enough for MVP operational traceability
- `PatientAssignment` already supports core admin assignment workflow
- `FamilyFeedback` already supports anonymous caregiver-family feedback readout
- `UserActivityDaily` already supports daily active usage rollups

### Required conclusion
Feature 5 should build on these existing models and not invent parallel KPI or audit storage.

---

## 3.2 Audit `Server/src/lib/audit.ts`

### Existing behavior already present
- audit actor extraction from request
- `logAuditEvent(...)`
- normalized actor-role handling
- persistence to `AuditLog`

### Important current-state issue
The helper is deliberately minimal. It writes events, but it does not itself enforce:
- PHI redaction discipline
- schema validation for metadata
- export formatting
- richer event categorization for admin readouts

### Required conclusion
Feature 5 must treat `logAuditEvent` as the canonical write path, but likely needs read-model improvements and stricter conventions for admin-facing audit usability.

---

## 3.3 Audit `Server/src/lib/activityRollup.ts`

### Existing behavior already present
- `recordDailyActivity(userId)` upserts `UserActivityDaily`
- last-seen + event-count rollup by UTC day

### Important current-state implication
The app already has a credible daily activity rollup. Feature 5 should **reuse this** for pilot KPIs rather than deriving DAU only from raw audit log scans.

### Required conclusion
Activity rollups are already part of the architecture and should become a visible, documented KPI source in the pilot-readiness layer.

---

## 3.4 Audit `Server/src/lib/agencySettings.ts`

### Existing behavior already present
- upserts and returns default agency settings
- default branding/support config already exists

### Important current-state issue
This helper is intentionally minimal and only covers:
- portal name
- logo URL
- primary color
- support contact details

It does **not** yet represent a broader agency configuration layer for pilot defaults, feature flags, or operational policy settings.

### Required conclusion
Feature 5 should decide whether to extend `AgencySettings` or create a related pilot-settings model instead of overloading branding-only fields.

---

## 3.5 Audit `Server/src/routes/admin.ts`

This is the single most important backend file for Feature 5.

### Existing behavior already present
- user listing / user detail
- assignment CRUD
- summary stats
- analytics
- daily analytics
- settings (public + admin)
- audit-log querying with pagination, date range, search, and filters
- admin message readout

### Important current-state behavior already present
- `buildAdminAnalytics()` calculates:
  - active patients
  - linked caregivers
  - visits per week
  - reschedule rate
  - cancellation rate
  - pending availability
  - pending visit requests
  - message counts last 90 days
- `buildDailyAnalytics()` calculates:
  - login-based DAU
  - activity-based DAU
  - daily appointment approved/fulfilled/cancelled/rescheduled counts
- assignment updates are already audit logged
- settings updates are already audit logged as `BRANDING_UPDATED`
- audit log endpoint already supports:
  - action type filtering
  - actor role filtering
  - search
  - pagination
  - date range

### Important current-state issues
- this route file is large and blends multiple admin concerns
- some endpoints still contain debug-ish or TODO-oriented traits
- user update is still placeholder (`PUT /users/:id`)
- no built-in CSV export yet despite MVP callout
- no explicit pilot-readiness / checklist endpoint yet
- analytics are useful but not framed explicitly as pilot KPIs
- branding/settings are broader in the UI than in persistence model only by implication, not structure

### Critical conclusion
Feature 5 must **not** create a second admin API surface. It should strengthen and package `admin.ts`, or split it into helpers/routes cleanly without changing the fact that it is already the canonical admin backend.

---

## 3.6 Audit audit-event producers across the backend

### Files already emitting audit events
- `Server/src/routes/visits.ts`
- `Server/src/routes/availability.ts`
- `Server/src/routes/caregiverInvitations.ts`
- `Server/src/routes/caregiverLinks.ts`
- `Server/src/routes/simpleMessages.ts`
- `Server/src/routes/medications.ts`
- `Server/src/routes/admin.ts`

### Important current-state conclusion
The app already logs meaningful operational actions across major workflow surfaces.

### Important current-state issue
Not every important admin or pilot-readiness action is necessarily standardized or easy to summarize in the readout.

### Required conclusion
Feature 5 should improve audit **usability and read coherence**, not just add more audit writes indiscriminately.

---

## 3.7 Audit `Server/src/routes/familyFeedback.ts`

### Existing behavior already present
- caregiver feedback submission
- admin aggregated feedback readout
- clinician anonymized patient feedback readout

### Important current-state behavior
- feedback is anonymized to clinicians/admin-facing views appropriately
- feedback aggregates already exist:
  - total
  - average helpfulness
  - average communication
  - counts by event type

### Required conclusion
Feature 5 should integrate family feedback as a real pilot-readiness signal, not treat it as a disconnected tab.

---

## 3.8 Audit admin-related test scripts in `Server/scripts`

### Files to inspect
- `Server/scripts/testLoginAudit.ts`
- `Server/scripts/testActivityDAU.ts`
- `Server/scripts/testAuditPagination.ts`
- `Server/scripts/testDateRangeFilter.ts`
- `Server/scripts/testAdditionalAudit.ts`
- `Server/package.json`

### Important current-state conclusions
- audit and DAU validation scripts already exist
- these scripts already document parts of Feature 5 behavior informally
- server package scripts already expose several pilot/admin-related checks

### Important current-state issue
These tests are utility scripts, not comprehensive feature-level admin regression coverage.

### Required conclusion
Feature 5 should extend these into a more structured admin smoke/test strategy rather than ignoring them.

---

## 3.9 Audit `Client/web/src/api/admin.ts`

### Existing behavior already present
- typed `AgencySettings`
- typed `AdminSummary`
- typed `AdminAnalytics`
- typed `AuditLogRecord`
- typed `DailyAnalyticsData`
- API wrappers for:
  - `getAdminStats()`
  - `getAdminAnalytics()`
  - `getAgencySettings()`
  - `updateAgencySettings()`
  - `getAuditLogs()`
  - `getDailyAnalytics()`

### Important current-state issue
There are no typed API wrappers yet for:
- assignment CRUD
- family feedback admin readout
- user management update/invite/admin pilot surfaces
- audit export / KPI export / pilot checklist / feature flags

### Required conclusion
Feature 5 should expand this module (or related admin API modules) instead of embedding more raw `api.get(...)` calls inside giant dashboard files.

---

## 3.10 Audit `Client/web/src/pages/admin/AdminDashboard.tsx`

This is the most important client file for Feature 5.

### Existing behavior already present
- single-tab admin app shell for:
  - overview
  - users
  - assign patients
  - availability
  - appointments
  - messages
  - reports
  - settings
  - audit log
  - family feedback
  - patient records
  - notifications
- overview KPI cards and charts
- reports tab with analytics readouts
- settings tab for branding/support data
- audit log filters + pagination UI
- assignment manager
- user management
- admin messages readout + broadcast flow
- family feedback panel
- patient records tab reusing `StaffPatientRecordsEditor`

### Important current-state strengths
- much of the Feature 5 UI already exists in one place
- overview and reports already display live data from real backend endpoints
- audit filtering UX already exists
- assignment management is already operational
- branding settings already refresh the global branding context

### Important current-state issues
- the file is extremely large and mixes many admin concerns in one component
- several sections are operationally useful but not yet polished as one pilot-readiness workflow
- raw `api` calls are still embedded in multiple subpanels instead of typed API wrappers
- admin messaging/broadcast flow uses inconsistent endpoints and likely overlaps with earlier messaging architecture concerns
- user invitation flow is still placeholder/toast-only
- no explicit pilot-readiness tab/checklist exists
- no CSV export button for audit logs yet
- no feature flag surface exists yet
- admin overview/reporting still appears more as internal tooling than pilot packaging

### Critical conclusion
Feature 5 should prioritize **refactoring and packaging** this dashboard, not replacing it wholesale.

---

## 3.11 Audit `Client/web/src/branding/AgencyBranding.tsx`

### Existing behavior already present
- global branding provider
- loads public settings from `/api/admin/settings/public`
- applies `primaryColor` CSS variable
- refresh hook already exists

### Important current-state implication
Agency branding is already wired into public login/home flows and admin settings. Feature 5 should preserve this and make it feel intentionally part of pilot-readiness.

---

## 3.12 Audit standalone admin pages/routes that overlap with dashboard functionality

### Files to inspect
- `Client/web/src/routes/AdminRoutes.tsx`
- `Client/web/src/pages/admin/UserManagement.tsx`
- `Client/web/src/pages/admin/SystemSettings.tsx`
- `Client/web/src/pages/admin/Analytics.tsx`
- `Client/web/src/components/admin/AdminNavbar.tsx`
- `Client/web/src/components/admin/AdminSidebar.tsx`

### Important current-state issue
The repo contains both:
1. a rich integrated `AdminDashboard.tsx`
2. separate placeholder admin pages/components

This is a classic “parallel admin architecture” risk.

### Required conclusion
Feature 5 must explicitly choose which admin surface is canonical.

### Recommended conclusion
Use **`Client/web/src/pages/admin/AdminDashboard.tsx`** as the canonical admin UI and either:
- deprecate placeholder standalone pages, or
- reduce them to wrappers around shared admin modules.

Do **not** continue building admin functionality in two parallel UI systems.

---

## 3.13 Audit missing/partial pilot-readiness capabilities

From current code review, these areas appear missing or partial:
- explicit pilot checklist UI
- feature flags surface
- audit CSV export
- response-time / uptime readout
- invite workflow completion in user management
- packaging around “operational confidence” language and flow

### Important conclusion
Feature 5 should fill these **pilot packaging gaps** without overreaching into enterprise operations tooling.

---

## 4. Architecture recommendation for Feature 5

### Core recommendation
Do **not** build a new admin app. The repo already has the backbone of one.

Instead:
1. keep `Server/src/routes/admin.ts` as canonical admin backend surface, but refactor/helper-extract where necessary
2. keep `Client/web/src/pages/admin/AdminDashboard.tsx` as canonical admin UI shell
3. extract shared admin API wrappers and subcomponents to reduce file-size sprawl
4. add explicit pilot-readiness artifacts rather than burying them inside generic analytics/settings tabs

### Recommended feature packaging

#### Admin overview layer
- KPI cards
- queue counts
- daily analytics charts
- concise operational status messaging

#### Operational tools layer
- assignments
- availability review
- appointment review
- user management
- family feedback readout
- audit log readout/export

#### Agency configuration layer
- branding
- support contact
- notification defaults / operational defaults if added
- feature flags / pilot switches if included

#### Pilot-readiness layer
- checklist
- guide text / readiness notes
- top pilot KPIs
- adoption/engagement summary

---

## 5. Key implementation decisions the owner must make early

### 5.1 What is the canonical admin UI?
Recommended answer: **`AdminDashboard.tsx` is canonical**.

The placeholder standalone pages should not become a second implementation path.

### 5.2 What counts as “pilot KPIs” for MVP?
Recommended MVP KPI set:
- active patients
- linked caregivers
- visits per week
- reschedule rate
- cancellation rate
- pending availability
- pending visit requests
- messages last 90 days
- daily active usage (activity-based)
- family feedback aggregates

### 5.3 How much “feature flags” support belongs in this sprint?
Recommended answer: minimal but real.

Enough to support pilot packaging, for example:
- display-only feature switches in admin settings
- or a small persisted pilot-settings section

Do not build a sophisticated experimentation platform.

### 5.4 Is CSV export required in MVP?
Recommended answer: yes, minimally for audit log export, because the MVP table explicitly mentions CSV export and Excel-openable output.

### 5.5 Should response time / uptime be real telemetry now?
Recommended answer: only minimally if already observable, otherwise expose a lightweight placeholder operational-readiness panel with explicit wording that infra telemetry is limited in MVP.

Do not fake precision metrics that the backend does not actually measure.

---

## 6. Recommended file-level implementation plan

### 6.1 Existing files likely to be modified

#### Server
- `Server/prisma/schema.prisma`
- `Server/src/routes/admin.ts`
- `Server/src/lib/audit.ts`
- `Server/src/lib/activityRollup.ts`
- `Server/src/lib/agencySettings.ts`
- `Server/src/routes/familyFeedback.ts`
- `Server/package.json`
- `Server/scripts/testLoginAudit.ts`
- `Server/scripts/testActivityDAU.ts`
- `Server/scripts/testAuditPagination.ts`
- `Server/scripts/testDateRangeFilter.ts`
- `Server/scripts/testAdditionalAudit.ts`

#### Client/web
- `Client/web/src/api/admin.ts`
- `Client/web/src/pages/admin/AdminDashboard.tsx`
- `Client/web/src/branding/AgencyBranding.tsx`
- `Client/web/src/routes/AdminRoutes.tsx`
- `Client/web/src/pages/admin/UserManagement.tsx`
- `Client/web/src/pages/admin/SystemSettings.tsx`
- `Client/web/src/pages/admin/Analytics.tsx`
- `Client/web/src/components/admin/AdminNavbar.tsx`
- `Client/web/src/components/admin/AdminSidebar.tsx`

### 6.2 New files likely to be added

#### Server
- `Server/src/lib/adminKpis.ts`
- `Server/src/lib/pilotReadiness.ts`
- `Server/src/__tests__/feature5.adminOverview.test.ts`
- `Server/src/__tests__/feature5.auditReadout.test.ts`
- `Server/src/__tests__/feature5.assignments.test.ts`
- `Server/src/__tests__/feature5.pilotReadiness.test.ts`
- `Server/src/scripts/smokeFeature5Admin.ts`

#### Client/web
- `Client/web/src/components/admin/AdminOverviewPanel.tsx`
- `Client/web/src/components/admin/AdminKpiCards.tsx`
- `Client/web/src/components/admin/PilotReadinessPanel.tsx`
- `Client/web/src/components/admin/AuditExportButton.tsx`
- `Client/web/src/components/admin/FeatureFlagsPanel.tsx`
- `Client/web/src/components/admin/AdminAssignmentsPanel.tsx`
- `Client/web/src/components/admin/AdminFeedbackPanel.tsx`
- `Client/web/src/components/admin/adminTypes.ts`

Optional:
- `Client/web/src/api/adminPilot.ts`

---

## 7. Phased execution plan for AI agents / feature owner

The steps below are intentionally sequential and should be followed in order.

---

## Phase 0 — Audit and canonical-admin decision

### Goal
Freeze the architecture so the team does not keep building overlapping admin surfaces.

### Tasks
1. Complete the audit in Sections 3.1–3.13.
2. Write down:
   - canonical admin UI
   - canonical admin backend route family
   - pilot KPI set for MVP
   - whether feature flags are persisted now or displayed as static pilot switches
   - whether CSV export is included in this sprint
3. Freeze the admin/pilot-readiness contract before major UI refactors.

### Required output of Phase 0
- canonical admin architecture note
- explicit list of placeholder pages/components to deprecate, wrap, or ignore

### Do not proceed until
- the owner can explain which admin surfaces already exist and which are only placeholders

---

## Phase 1 — Backend admin KPI and audit packaging

### Goal
Turn existing analytics/audit infrastructure into deliberate pilot KPIs and admin readouts.

### Recommended files
- `Server/src/routes/admin.ts`
- `Server/src/lib/adminKpis.ts`
- `Server/src/lib/pilotReadiness.ts`

### Tasks

#### 1. Extract KPI calculation helpers
Move large analytics logic out of `admin.ts` into helper(s) without changing behavior blindly.

Suggested helper responsibilities:
- build summary KPIs
- build daily analytics
- define pilot-readiness KPI payload

#### 2. Define canonical MVP KPI payload
Suggested sections:
- `summary`
- `dailyAnalytics`
- `operationalQueues`
- `engagement`
- `familyFeedbackSummary`
- `pilotReadiness`

#### 3. Add explicit pilot-readiness API shape
Recommended endpoint:
- `GET /api/admin/pilot-readiness`

Suggested payload:
- checklist items
- required environment/config readiness flags
- current KPI highlights
- missing setup items

### Important instruction
Do not compute pilot readiness only in the frontend. The admin backend should expose a coherent pilot-readiness contract.

---

## Phase 2 — Audit log usability hardening

### Goal
Make the audit log a true admin readout, not just a raw table.

### Existing strengths to preserve
- search
- action filter
- role filter
- pagination
- date range

### Recommended additions

#### A. CSV export
Recommended new endpoint:
- `GET /api/admin/audit-logs/export`

Requirements:
- same filters as audit list endpoint
- CSV safe for Excel open
- avoid dumping PHI-rich metadata blindly into export columns

#### B. Event label mapping
Provide clearer admin-friendly labels for action types where needed.

#### C. Metadata summarization
Where possible, summarize metadata into safe human-readable text rather than exposing raw JSON in the main grid.

### Important instruction
The MVP callout explicitly mentions CSV export. Do not leave export unimplemented if this feature claims pilot readiness.

---

## Phase 3 — Assignment, user, and operational workflow cleanup

### Goal
Package core admin workflows as reliable operational tools.

### Existing workflows to preserve
- patient-clinician assignments
- availability review
- appointments review
- user listing/removal

### Tasks

#### 1. Assignment workflow hardening
Files:
- `Server/src/routes/admin.ts`
- `Client/web/src/pages/admin/AdminDashboard.tsx`
- `Client/web/src/api/admin.ts`

Add typed API wrappers and reduce raw axios usage.

#### 2. User management completion decision
Current issue:
- invite workflow is placeholder in UI
- user update route is placeholder in backend

Recommended MVP decision:
- if full invite backend is not ready, mark invite as explicitly out of scope in the live UI rather than a fake success path
- or implement minimal invite/create flow properly if feasible within sprint

#### 3. Review queue packaging
Ensure overview links/cards clearly connect to:
- pending availability
- pending visit requests
- review queues

### Important instruction
Do not leave fake operational affordances in a pilot-facing admin product.

---

## Phase 4 — Family feedback as pilot-readiness signal

### Goal
Treat family feedback as a meaningful operational KPI.

### Existing assets already present
- feedback submission
- admin aggregate view
- clinician anonymized view

### Recommended work
- integrate feedback summary into pilot-readiness overview
- surface trend or summary copy in admin overview
- add date range filtering if needed for pilot windows
- make it obvious this is a quality and satisfaction signal

### Files likely touched
- `Server/src/routes/familyFeedback.ts`
- `Client/web/src/pages/admin/AdminDashboard.tsx`
- `Client/web/src/api/admin.ts`
- `Client/web/src/components/admin/AdminFeedbackPanel.tsx`

---

## Phase 5 — Agency settings, branding, and operational defaults

### Goal
Turn branding/settings into a real agency-facing configuration surface.

### Existing behavior already present
- branding fields persist
- public and admin reads exist
- public pages already reflect settings

### Recommended work
- keep branding section
- add a minimal operational defaults section if supported this sprint, such as:
  - support escalation info
  - notification default copy / pilot contact info
  - feature-availability flags (if implemented)

### Important instruction
Do not overload branding settings with too many unrelated runtime controls unless schema changes are made deliberately.

---

## Phase 6 — Feature flags / pilot switches (minimal MVP)

### Goal
Support the “pilot readiness kit” concept without building an enterprise flagging system.

### Recommended MVP approach
One of these two approaches:

#### Option A — Preferred lightweight path
Persist a minimal set of pilot toggles in agency settings or related pilot settings:
- messaging enabled
- notifications enabled
- records visibility enabled
- feedback enabled

#### Option B — Display-only readiness switches
Show the operational status of existing major features without making them editable yet.

### Important instruction
If true persistence is not implemented, do not present the UI as if toggles are actually live-configurable.

---

## Phase 7 — Client/web admin dashboard refactor into modules

### Goal
Reduce `AdminDashboard.tsx` sprawl while keeping it the canonical admin UI.

### Recommended new client structure
- `AdminOverviewPanel.tsx`
- `AdminKpiCards.tsx`
- `PilotReadinessPanel.tsx`
- `AuditExportButton.tsx`
- `FeatureFlagsPanel.tsx`
- `AdminAssignmentsPanel.tsx`
- `AdminFeedbackPanel.tsx`

### Suggested responsibilities

#### `AdminOverviewPanel.tsx`
- overview composition
- top KPI and queue summary

#### `AdminKpiCards.tsx`
- summary metric card rendering

#### `PilotReadinessPanel.tsx`
- checklist + missing items + recommended next actions

#### `AuditExportButton.tsx`
- filtered export trigger

#### `FeatureFlagsPanel.tsx`
- minimal pilot switch readout/edit surface

#### `AdminAssignmentsPanel.tsx`
- extracted assignment table and actions

#### `AdminFeedbackPanel.tsx`
- extracted family feedback surface

### Important instruction
Refactor incrementally. Do not destabilize the existing admin dashboard by rewriting everything at once.

---

## Phase 8 — Placeholder admin surface cleanup

### Goal
Prevent future duplication and confusion.

### Files to reconcile
- `Client/web/src/routes/AdminRoutes.tsx`
- `Client/web/src/pages/admin/UserManagement.tsx`
- `Client/web/src/pages/admin/SystemSettings.tsx`
- `Client/web/src/pages/admin/Analytics.tsx`
- `Client/web/src/components/admin/AdminNavbar.tsx`
- `Client/web/src/components/admin/AdminSidebar.tsx`

### Recommended direction
- mark `AdminDashboard.tsx` as canonical
- convert standalone admin pages into thin wrappers if needed
- otherwise deprecate clearly

### Important instruction
Do not continue splitting feature work across two admin paradigms.

---

## Phase 9 — Pilot-readiness packaging

### Goal
Add the explicit “pilotable SaaS MVP” layer described in the project docs.

### Recommended pilot-readiness panel contents
- readiness checklist
- key KPIs snapshot
- environment/config status summary
- top unresolved issues / missing setup items
- suggested pilot guide copy or launch notes

### Example checklist categories
- auth / onboarding ready
- patient-family visibility features enabled
- visit workflows functioning
- messaging functioning
- audit logging functioning
- family feedback functioning
- branding/support configured
- at least one clinician and one patient assignment exists

### Important instruction
Keep this concrete and operational. Do not make it a generic project-management checklist disconnected from the live app state.

---

## 8. Testing plan

Feature 5 must include automated and browser/manual validation.

---

## 8.1 Server automated testing

### Existing scripts/tests to audit and extend
- `Server/scripts/testLoginAudit.ts`
- `Server/scripts/testActivityDAU.ts`
- `Server/scripts/testAuditPagination.ts`
- `Server/scripts/testDateRangeFilter.ts`
- `Server/scripts/testAdditionalAudit.ts`

### Recommended new tests

#### File: `Server/src/__tests__/feature5.adminOverview.test.ts`
Cover:
- admin stats endpoint returns expected shape
- analytics endpoint returns summary + charts
- daily analytics returns bounded date window results
- non-admin access is rejected

#### File: `Server/src/__tests__/feature5.auditReadout.test.ts`
Cover:
- audit log filters by action type
- audit log filters by actor role
- audit log date range filtering works
- pagination returns total/limit/offset correctly
- CSV export respects filters and returns valid content type / body

#### File: `Server/src/__tests__/feature5.assignments.test.ts`
Cover:
- admin creates assignment
- admin toggles assignment active/inactive
- admin removes assignment
- assignment actions emit audit logs

#### File: `Server/src/__tests__/feature5.pilotReadiness.test.ts`
Cover:
- pilot-readiness endpoint returns checklist/status payload
- missing settings or missing assignments appear in readiness output as expected
- feature flag / pilot-switch state is reflected correctly if implemented

---

## 8.2 Server smoke script

### Recommended new script
- `Server/src/scripts/smokeFeature5Admin.ts`

### Suggested smoke coverage
1. log in as admin
2. fetch admin stats, analytics, and daily analytics
3. fetch audit logs with filters
4. fetch audit CSV export if implemented
5. fetch and update agency settings
6. create/toggle/remove a patient-clinician assignment
7. fetch family feedback admin readout
8. fetch pilot-readiness payload

### Package script
Update `Server/package.json` with something like:
- `smoke:feature5:admin`

---

## 8.3 Browser/manual validation plan

If browser tools are available, run these end-to-end.

### Environment
- backend: `npm run dev --prefix Server`
- web: `npm run dev --prefix Client/web`

### Browser validation matrix

#### Flow A — Admin overview
1. sign in as admin
2. open Overview
3. verify KPI cards load
4. verify daily DAU chart loads
5. verify appointment outcome chart loads
6. verify overview copy feels operationally meaningful

#### Flow B — Audit log usability
1. open Audit Log
2. filter by action type
3. filter by role
4. apply date range
5. paginate results
6. export CSV if implemented
7. verify output is usable and safe

#### Flow C — Assignment management
1. open Assign Patients
2. create assignment
3. toggle assignment active/inactive
4. remove assignment
5. confirm audit log captures the changes

#### Flow D — Branding/settings
1. open Settings
2. update portal name or support details
3. save
4. verify public branding refreshes where expected
5. verify audit log records the settings change

#### Flow E — Family feedback readout
1. open Family Feedback
2. review aggregates and list
3. filter by event type
4. verify anonymity language is clear

#### Flow F — Pilot readiness
1. open Pilot Readiness panel/tab if added
2. verify checklist items reflect real app state
3. verify missing operational prerequisites are clearly communicated

### Browser-tool evidence the owner should capture
- admin overview screenshot
- audit log filtered screenshot
- assignment management screenshot
- settings/branding screenshot
- family feedback screenshot
- pilot-readiness checklist screenshot

---

## 9. Definition of done for Feature 5

Feature 5 is done only when all of the following are true.

### Product criteria
- admin area feels operationally usable for an agency pilot
- audit log is readable and useful, not just technically present
- pilot KPIs are visible and explainable
- branding/support settings update the portal correctly
- core admin workflows (assignments, review queues, feedback) feel trustworthy

### Server criteria
- canonical admin route surface is preserved and strengthened
- pilot-readiness data has a coherent backend contract
- audit filtering/pagination/export work reliably
- assignment and settings actions are audited consistently

### Web criteria
- `AdminDashboard.tsx` remains canonical but is more modular and maintainable
- placeholder standalone admin pages are reconciled or explicitly deprecated
- admin API calls are increasingly typed rather than raw inline axios calls
- pilot-readiness surface exists and is understandable

### Testing criteria
- server tests added for admin overview, audit readout, assignments, and pilot readiness
- smoke script added and runnable
- browser/manual validation completed across overview, audit, settings, assignments, feedback, and pilot-readiness flows

---

## 10. Implementation cautions and anti-patterns

### Do not:
- create a second admin backend route family
- keep building both placeholder admin pages and dashboard subviews independently
- present fake invite/feature-flag/export behavior as if it works when it does not
- add flashy analytics without a clear calculation source
- expose raw audit metadata carelessly if it may contain sensitive detail
- claim production monitoring/uptime telemetry if the app does not truly measure it

### Do instead:
- consolidate around existing admin backend and dashboard
- package existing analytics/audit as pilot-ready operational readouts
- add only minimal but real pilot-readiness features
- prefer typed admin API wrappers and extracted subcomponents
- keep every KPI explainable and testable

---

## 11. Suggested task order for the Feature 5 owner

If another AI agent or engineer owns this feature, they should work in this order:

1. **Audit all existing admin backend and frontend surfaces**
2. **Choose canonical admin UI and backend surfaces**
3. **Extract KPI / pilot-readiness backend helpers**
4. **Harden audit readout and add export**
5. **Refactor assignment and settings flows to typed/admin-specific modules**
6. **Integrate family feedback as a pilot KPI**
7. **Add pilot-readiness panel/checklist**
8. **Refactor AdminDashboard into reusable subcomponents**
9. **Reconcile/deprecate placeholder admin pages**
10. **Run scripts, tests, and browser validation**

This order matters. Do not start by styling new admin pages before choosing the canonical admin architecture.

---

## 12. Final recommendation to the implementing agent

Feature 5 should be treated as an **operational packaging and trust-building effort**.

The repo already has:
- admin analytics
- DAU rollups
- audit logs
- assignment management
- queue review flows
- family feedback readout
- branding/settings persistence

What it lacks is a cohesive operational story that says:
**this product is ready for an agency pilot.**

The owner’s real job is to:
1. audit what already exists,
2. consolidate around the existing admin backend and admin dashboard,
3. make audit and KPI readouts truly usable,
4. add explicit pilot-readiness packaging,
5. and leave the repo with an admin experience that feels like an operational MVP rather than a collection of internal tools.