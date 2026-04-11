## Feature 1 Implementation Plan

### Feature name
**Secure onboarding, auth, and caregiver/MPOA access**

### Scope for this plan
This plan is for **Server** and **Client/web** only.

**Out of scope for this implementation plan**
- `Client/mobile/*`
- FHIR / HL7 / EMR integration
- AI-assisted onboarding
- billing / payments
- vendor portals
- full organization self-service agency registration if it expands beyond MVP onboarding needs

---

## 1. Why this feature is first

This feature is the best first sprint candidate because it closes the largest gap between the **original client spec** and the **current codebase**.

From the original spec set, MVP-1 explicitly depends on:
- secure login and session handling
- role-based caregiver / MPOA access
- invite-based onboarding flows
- consent capture
- communication preference capture

In the current repo, some of this already exists, but it is inconsistent and incomplete:
- patient signup uses OTP flow
- caregiver signup is partially invite-code based
- clinician signup is still direct self-registration
- admin signup is still direct self-registration
- consent capture is not part of onboarding
- communication preferences are not captured during onboarding
- caregiver access exists, but the product flow is only partially aligned to the spec

This means the owner of Feature 1 should focus on **unifying and hardening existing onboarding/auth/access logic**, not starting from scratch.

---

## 2. Desired end state for Feature 1

At the end of this feature, the web + server experience should support a consistent, spec-aligned onboarding model for the MVP:

### 2.1 Target product behavior
- **Patients** can register from an invitation / redemption code flow.
- **Caregivers / MPOAs** can register from an invitation / redemption code flow and become linked to the correct patient.
- **Clinicians** can register from an invitation / redemption code flow rather than generic public self-signup.
- **Admins** can register from an invitation / redemption code flow rather than generic public self-signup.
- During onboarding, users complete:
  - account credentials
  - OTP verification
  - required consent acknowledgments
  - communication preference selection
- Caregiver/MPOA access is scoped and enforced so they cannot see cross-patient data.
- Existing caregiver invite/revoke/link flows remain compatible with current dashboards.
- Login/session behavior is hardened enough for MVP and documented clearly.

### 2.2 Architectural outcome
- The repo has a single, coherent onboarding strategy instead of multiple unrelated sign-up patterns.
- Existing caregiver invitation logic is either generalized or wrapped so future work does not duplicate invite models.
- Web routes and backend routes clearly distinguish:
  - invitation validation
  - pending signup state
  - OTP verification
  - post-verification account creation
  - caregiver relationship activation

---

## 3. Mandatory current-state audit before any implementation

Before changing anything, the Feature 1 owner/agent must audit the current code to avoid rebuilding already-implemented logic.

This audit is **required** and should be completed in order.

---

## 4. Current-state audit checklist

### 4.1 Server auth / onboarding audit

#### File: `Server/src/auth.ts`
Audit and document the following existing behavior before modifying it:

1. **Direct registration path already exists**
   - `POST /api/auth/register`
   - creates users directly for `ADMIN`, `PATIENT`, `CAREGIVER`, `CLINICIAN`
   - creates `PatientProfile`, `ClinicianProfile`, or `CaregiverProfile` depending on role
   - currently bypasses invitation-only onboarding for most roles

2. **OTP pending-signup path already exists**
   - `POST /api/auth/send-otp`
   - `POST /api/auth/resend-otp`
   - `POST /api/auth/verify-otp`
   - uses `PendingVerification`
   - sends OTP through Twilio Verify email channel

3. **Caregiver invite validation already exists inside auth**
   - in `send-otp`, caregiver signup requires `profileData.invitationCode`
   - in `verify-otp`, caregiver account creation also creates `CaregiverPatientLink` and marks invitation accepted

4. **Important inconsistencies already present**
   - patient OTP signup exists
   - caregiver OTP + invite-code signup exists
   - clinician signup does **not** use OTP + invite code in the current web flow
   - admin signup does **not** use OTP + invite code in the current web flow
   - `ensureAdminExists()` auto-creates a default admin if none exists, which conflicts with invite-governed admin onboarding

5. **Security limitations to note before coding**
   - failed login attempts are recorded but not truly enforced as a lockout
   - idle timeout is not implemented at app level; only JWT/cookie expiry exists
   - magic-link login is not implemented
   - there is no onboarding consent persistence tied to account creation except privacy consent settings later in the app

#### Files to cross-check while auditing
- `Server/src/middleware/requireAuth.ts`
- `Server/src/middleware/requireRole.ts`
- `Server/src/passwordReset.ts`
- `Server/src/lib/audit.ts`

---

### 4.2 Caregiver invitation / link audit

#### File: `Server/src/routes/caregiverInvitations.ts`
Confirm what already exists:

- patient-only invitation creation
- invitation code generation
- invitation expiry handling
- revocation flow
- public validation endpoint: `GET /api/caregiver-invitations/validate/:code`
- audit logging for create/revoke

#### File: `Server/src/routes/caregiverLinks.ts`
Confirm what already exists:

- list caregiver links
- activate/deactivate / primary caregiver behavior
- caregiver use-code flow for already-existing caregiver accounts
- audit logging for link updates/creation

#### Important conclusion from audit
The codebase **already has a robust caregiver invitation/link model**. Do **not** duplicate this logic in a parallel onboarding system without an explicit migration plan.

Any new onboarding work must either:
1. extend this model carefully, or
2. introduce a more general invitation model while preserving caregiver compatibility.

---

### 4.3 Data-model audit

#### File: `Server/prisma/schema.prisma`
Audit the following existing models and fields:

- `User`
- `PendingVerification`
- `CaregiverInvitation`
- `CaregiverPatientLink`
- `PatientProfile`
- `ClinicianProfile`
- `CaregiverProfile`
- `AdminProfile`
- `VisitReminderPreference`
- `AuditLog`

#### Important current-state findings
- There is **no generic invitation model** for patient / clinician / admin onboarding.
- There is **no dedicated onboarding consent model**.
- There is **no general communication preference model for onboarding**.
- `VisitReminderPreference` exists, but it is too narrow to represent full onboarding communication preferences.
- `PendingVerification` is email-keyed and currently stores pending signup JSON.

---

### 4.4 Web onboarding audit

#### File: `Client/web/src/App.tsx`
Audit current route structure:
- `/register`
- `/register/clinician`
- `/register/caregiver`
- `/verify-email`
- `/admin/signup`

Document that the current routing exposes public signup flows for multiple roles, which does not match the invitation-first spec.

#### File: `Client/web/src/pages/Signup.tsx`
Audit current patient signup behavior:
- patient-heavy form
- still contains a `role` dropdown with `PATIENT`, `CAREGIVER`, `CLINICIAN`
- submits through `sendOtp`
- currently behaves like a public signup page, not an invite redemption flow

#### File: `Client/web/src/pages/SignupCaregiver.tsx`
Audit current caregiver signup behavior:
- validates caregiver invitation code
- hides rest of form until code validates
- submits through `sendOtp`
- already close to the target model

#### File: `Client/web/src/pages/SignupClinician.tsx`
Audit current clinician signup behavior:
- uses `useAuth().register(...)`
- creates clinician directly
- no invitation code
- no OTP verification
- no onboarding consent or communication preference capture

#### File: `Client/web/src/pages/admin/AdminSignup.tsx`
Audit current admin signup behavior:
- uses `useAuth().register(...)`
- creates admin directly
- no invitation code
- no OTP verification
- no org-scoped onboarding rules

#### File: `Client/web/src/pages/VerifyEmail.tsx`
Audit current OTP verification behavior:
- expects only `{ email }` from navigation state
- verifies OTP then redirects to `/login`
- does not branch by onboarding type / role
- does not collect or confirm consent state before completion

#### File: `Client/web/src/auth/AuthContext.tsx`
Audit auth API usage:
- `register()` still uses `/api/auth/register`
- `login()` uses `/api/auth/login`
- `refreshUser()` uses `/api/auth/me`
- no dedicated onboarding client API abstraction exists beyond `sendOtp`/`verifyOtp`

#### File: `Client/web/src/api/auth.ts`
Audit existing auth API helpers:
- `sendOtp`
- `resendOtp`
- `verifyOtp`

#### File: `Client/web/src/api/caregiverInvitations.ts`
Audit existing invitation helpers:
- validate code
- create/revoke invitation
- link-management helpers

---

### 4.5 Existing testing audit

#### Files to review
- `Server/src/__tests__/apiTestClient.ts`
- `Server/src/__tests__/feature1.privacy.test.ts`
- any audit/login tests in `Server/scripts/*` and `Server/src/__tests__/*`

#### Current testing reality
- there are server-side request helpers for authenticated API testing against a running server
- there is not yet a comprehensive automated test suite for onboarding invitation flows
- there is not yet a browser-e2e suite for registration

---

## 5. Implementation strategy recommendation

### Core recommendation
Do **not** patch this feature by scattering special cases across multiple signup pages.

Instead, implement Feature 1 using three coordinated layers:

1. **Invitation layer**
   - generic enough for patient / clinician / admin onboarding
   - preserves caregiver invitation compatibility

2. **Pending onboarding layer**
   - extends existing `PendingVerification` usage or replaces it with clearer staged onboarding payloads

3. **Web onboarding flow layer**
   - role-specific entry pages, but all flowing through the same back-end verification lifecycle

This gives the repo a future-proof onboarding foundation while staying MVP-sized.

---

## 6. Recommended file-level implementation plan

This section lists exact files the Feature 1 owner should plan to touch.

### 6.1 Existing files likely to be modified

#### Server
- `Server/prisma/schema.prisma`
- `Server/src/auth.ts`
- `Server/src/routes/caregiverInvitations.ts`
- `Server/src/routes/caregiverLinks.ts`
- `Server/src/lib/audit.ts` *(only if new audit action types are introduced)*
- `Server/src/index.ts` *(only if new routes are added)*

#### Client/web
- `Client/web/src/App.tsx`
- `Client/web/src/auth/AuthContext.tsx`
- `Client/web/src/api/auth.ts`
- `Client/web/src/api/caregiverInvitations.ts`
- `Client/web/src/pages/Signup.tsx`
- `Client/web/src/pages/SignupCaregiver.tsx`
- `Client/web/src/pages/SignupClinician.tsx`
- `Client/web/src/pages/admin/AdminSignup.tsx`
- `Client/web/src/pages/VerifyEmail.tsx`
- `Client/web/src/pages/Login.tsx`

### 6.2 New files likely to be added

#### Server
- `Server/src/routes/onboardingInvitations.ts`
  - recommended if generic invite handling is introduced rather than overloading caregiver routes
- `Server/src/lib/onboarding.ts`
  - helper layer for invitation validation, payload normalization, consent/preference handling
- `Server/src/__tests__/feature1.onboarding.test.ts`
- `Server/src/__tests__/feature1.caregiverAccess.test.ts`
- `Server/src/scripts/smokeFeature1Onboarding.ts`

#### Client/web
- `Client/web/src/api/onboarding.ts`
  - if a dedicated onboarding API surface is introduced
- `Client/web/src/pages/RegisterFromInvite.tsx`
  - recommended if patient/clinician/admin invite redemption is unified
- `Client/web/src/pages/admin/AdminInviteSignup.tsx`
  - optional if admin invite path should be separate from generic register page
- `Client/web/src/pages/clinician/ClinicianInviteSignup.tsx`
  - optional if clinician invite path should be separate from generic register page
- `Client/web/src/types/onboarding.ts`
  - optional for shared form payload typing on the web side

---

## 7. Phased execution plan for AI agents / feature owner

The steps below are intentionally sequential and should be followed in order.

---

## Phase 0 — Audit, scope freeze, and implementation notes

### Goal
Make sure the agent fully understands current behavior before changing anything.

### Tasks
1. Perform the audit in Sections 4.1–4.5.
2. Produce a short implementation note answering:
   - which current flows are already correct?
   - which flows conflict with the spec?
   - which server routes should be preserved vs generalized?
3. Decide whether to:
   - extend `CaregiverInvitation` into a generalized invitation approach, or
   - add a new invitation model for non-caregiver onboarding.

### Required output of Phase 0
- a written current-state summary in the PR / work log
- explicit list of files to modify
- explicit list of files not to modify

### Do not proceed until
- the owner can clearly state how patient, caregiver, clinician, and admin onboarding differ in the current code

---

## Phase 1 — Data model design

### Goal
Introduce the minimum schema changes needed to support spec-aligned onboarding.

### Recommended design direction

#### Option A — Preferred for maintainability
Add a **generic onboarding invitation model** instead of forcing all roles into `CaregiverInvitation`.

Example conceptual model to add in `Server/prisma/schema.prisma`:
- `OnboardingInvitation`
  - `id`
  - `code`
  - `targetRole` (`PATIENT`, `CAREGIVER`, `CLINICIAN`, `ADMIN`)
  - `email`
  - `phoneNumber?`
  - `invitedByUserId?`
  - `patientId?` (for caregiver invite)
  - `agencyId?` or deferred equivalent if agency model is not yet formalized
  - `metadata Json?` for flexible invite payloads (employee ID, agency name, etc.)
  - `status`
  - `expiresAt`
  - `usedAt`
  - `usedByUserId?`

Also add onboarding-specific persistence for:
- consent acknowledgments
- communication preferences

Recommended model shapes:
- `UserConsent` or `OnboardingConsent`
- `UserCommunicationPreference` or `NotificationPreference`

If the team wants to stay lighter-weight, consent and preference data can be stored in:
- profile tables + `metadata Json`
- or a single new `UserOnboardingSettings` table

#### Option B — Minimal change approach
Keep `CaregiverInvitation` as-is and add only:
- a separate generic invitation model for clinician/admin/patient
- onboarding consent/preference model(s)

### Files
- `Server/prisma/schema.prisma`
- new migration under `Server/prisma/migrations/*`

### Specific audit caution
Do not break:
- existing caregiver invitation list UI
- existing caregiver link creation logic
- existing tests or seed assumptions around `CaregiverInvitation`

### Phase 1 deliverable
- finalized schema diff and migration plan

---

## Phase 2 — Server invitation API layer

### Goal
Create or formalize a unified invite-validation API.

### Recommended server work

#### If adding a generic route
Create `Server/src/routes/onboardingInvitations.ts` with endpoints such as:
- `POST /api/onboarding-invitations`
  - create invitation
  - patient can create caregiver invite
  - admin can create clinician/admin/patient invites
- `GET /api/onboarding-invitations/validate/:code`
  - returns role-safe minimal metadata for rendering onboarding UI
- `DELETE /api/onboarding-invitations/:id`
  - revoke pending invitation

#### Existing route compatibility
Keep `Server/src/routes/caregiverInvitations.ts` operational during rollout.

You may either:
1. leave caregiver routes intact and have new routes only for generic onboarding, or
2. internally delegate caregiver invite logic to shared helper functions in `Server/src/lib/onboarding.ts`

### Exact existing files likely touched
- `Server/src/routes/caregiverInvitations.ts`
- `Server/src/index.ts`
- `Server/src/lib/onboarding.ts` *(new)*
- `Server/src/lib/audit.ts` *(if audit types are extended)*

### Important current-state preservation
Do not remove the existing public caregiver validation behavior until the web caregiver registration flow is migrated.

---

## Phase 3 — Server auth flow alignment

### Goal
Make all onboarding routes converge into a consistent OTP verification lifecycle.

### Existing logic to preserve
`Server/src/auth.ts` already provides:
- pending signup persistence
- OTP send / resend / verify
- caregiver code validation during signup
- caregiver link creation after verification

### Recommended server changes

#### 3.1 Refactor `send-otp`
Extend `POST /api/auth/send-otp` so it can support invite-based onboarding for all target roles.

It should:
- accept invitation code when required
- validate role-specific invite state
- normalize pending onboarding payload
- store consent + communication-preference selections in pending state if collected before OTP verification

#### 3.2 Refactor `verify-otp`
Extend `POST /api/auth/verify-otp` so after OTP approval it can:
- create patient, caregiver, clinician, or admin from invite-governed data
- persist consent acknowledgments
- persist communication preferences
- activate or create caregiver links where relevant
- mark onboarding invitation used/accepted where relevant

#### 3.3 Decide what happens to `POST /api/auth/register`
Recommended approach:
- keep it only for controlled internal/dev paths, or
- restrict it to scenarios allowed by the product

For the MVP, public web onboarding should no longer rely on unrestricted direct registration for clinician/admin.

#### 3.4 Review `ensureAdminExists()`
This needs a product decision.

Recommended MVP stance:
- keep it for local/dev bootstrap only
- clearly mark it as development fallback
- ensure it does not undermine invite-based admin onboarding expectations in staging/production

Possible implementation approaches:
- gate it behind `NODE_ENV !== "production"`
- or gate behind an explicit env var like `ALLOW_DEV_ADMIN_BOOTSTRAP=true`

### Exact file
- `Server/src/auth.ts`

### Phase 3 acceptance criteria
- all web onboarding pages can use OTP verification consistently
- caregiver onboarding still creates the link atomically
- admin/clinician onboarding no longer bypasses invite validation if the product requires invitation-only entry

---

## Phase 4 — Web onboarding routing and page consolidation

### Goal
Make the Client/web experience match the server onboarding model.

### Existing issues to fix

#### `Client/web/src/pages/Signup.tsx`
- currently labeled as patient signup but contains a role selector
- should not remain a mixed-role page if the spec is invitation-first

#### `Client/web/src/pages/SignupClinician.tsx`
- currently direct-registers clinicians
- must be migrated to OTP + invite validation flow

#### `Client/web/src/pages/admin/AdminSignup.tsx`
- currently direct-registers admins
- must be migrated to OTP + invite validation flow

#### `Client/web/src/pages/SignupCaregiver.tsx`
- already closest to the desired pattern
- should be used as a reference implementation

### Recommended route structure

Modify `Client/web/src/App.tsx` toward one of these approaches:

#### Approach A — role-specific invite routes
- `/register/patient`
- `/register/caregiver`
- `/register/clinician`
- `/register/admin`
- `/verify-email`

#### Approach B — unified invite redemption route
- `/register/invite`
  - validates code
  - infers role
  - renders role-specific fields dynamically

For this codebase, **Approach A is easier to implement safely** because the app already has role-specific pages.

### Recommended exact web tasks

#### `Client/web/src/pages/Signup.tsx`
Convert into a true patient invite-based registration page.

Changes should include:
- remove mixed-role dropdown
- add invitation / redemption code entry if patient onboarding is invite-first
- collect patient fields required by current backend and original onboarding flow
- add consent + communication-preference sections
- submit through `sendOtp`

#### `Client/web/src/pages/SignupCaregiver.tsx`
Enhance existing caregiver signup page.

Add:
- consent section
- communication preferences section
- clearer invitation validation states
- better expired/revoked invite UX

#### `Client/web/src/pages/SignupClinician.tsx`
Migrate from direct `register()` flow to invite-based OTP flow.

Replace:
- `useAuth().register(...)`

With:
- invite code validation
- role-specific clinician onboarding payload
- `sendOtp(...)`
- redirect to `/verify-email`

#### `Client/web/src/pages/admin/AdminSignup.tsx`
Migrate from direct `register()` flow to invite-based OTP flow.

For MVP, keep admin onboarding lightweight but compliant:
- invite code
- admin identity fields
- optional org setup fields if truly required now
- consent section
- communication preference section
- OTP verification

#### `Client/web/src/pages/VerifyEmail.tsx`
Enhance navigation-state handling so it supports:
- role
- invitation code reference if needed for troubleshooting
- post-verification redirect target

Potential navigation state shape:
- `email`
- `role`
- `nextPath`

### Additional recommended client abstraction
Create `Client/web/src/api/onboarding.ts` if the auth API begins to grow more role-aware.

This avoids stuffing all onboarding behavior into `api/auth.ts`.

---

## Phase 5 — Consent and communication preferences

### Goal
Bring onboarding closer to the original spec without overbuilding.

### Minimum MVP requirement
Capture and persist:
- consent acknowledgments
- communication preferences

### Recommended implementation scope

#### Consents to capture now
Only include the consents needed to make MVP onboarding credible.

Examples:
- app terms of use acknowledged
- privacy / HIPAA acknowledgment
- data sharing consent
- caregiver participation agreement for caregiver flow

Do not over-model this if legal text is still evolving. A versioned consent record is sufficient.

#### Communication preferences to capture now
For MVP, allow selection of:
- email
- SMS
- in-app

At minimum, store these in a way that can later inform:
- reminder preferences
- onboarding communication defaults

### Exact current-state interaction note
`VisitReminderPreference` already exists in schema, but it is too narrow to represent all onboarding communication preferences. Reuse carefully only if product semantics line up.

### Relevant files
- `Server/prisma/schema.prisma`
- `Server/src/auth.ts`
- `Server/src/routes/patientPrivacy.ts` *(review for consistency; not necessarily modify heavily)*
- `Client/web/src/pages/Signup.tsx`
- `Client/web/src/pages/SignupCaregiver.tsx`
- `Client/web/src/pages/SignupClinician.tsx`
- `Client/web/src/pages/admin/AdminSignup.tsx`

---

## Phase 6 — Caregiver/MPOA access hardening review

### Goal
Ensure onboarding changes do not accidentally weaken caregiver access rules.

### Existing behavior already present
- caregiver invitation creation
- caregiver link activation
- caregiver link deactivation
- caregiver-scoped access checks across patient data domains

### Required verification tasks
After onboarding refactor, the owner must verify that caregivers can only access linked-patient data in:
- `carePlans`
- `patientDocuments`
- `visits`
- `medications`
- `vitals`
- `simpleMessages`
- caregiver dashboard summary routes

### Minimum file audit targets
- `Server/src/lib/patientAccess.ts`
- `Server/src/routes/carePlans.ts`
- `Server/src/routes/patientDocuments.ts`
- `Server/src/routes/visits.ts`
- `Server/src/routes/medications.ts`
- `Server/src/routes/vitals.ts`
- `Server/src/routes/simpleMessages.ts`

### Important instruction
The Feature 1 owner does **not** need to rewrite these routes unless onboarding changes break assumptions. The purpose is to verify compatibility, not reopen unrelated features.

---

## Phase 7 — Login/session hardening for MVP

### Goal
Close the highest-value auth/security gaps without expanding into a whole identity platform.

### Recommended MVP improvements

#### Already present
- bcrypt password hashing
- httpOnly cookie session via JWT
- remember-me cookie lifetime
- failed login counters
- audit logging of login events

#### Recommended improvements for this feature
1. **True lockout enforcement after repeated failures**
   - current code increments `failedLoginAttempts`
   - add server-side rejection if threshold exceeded within a defined window

2. **Environment-gate default admin bootstrap**
   - prevent accidental production misuse

3. **Document session timeout behavior clearly**
   - if 20-minute idle timeout is not implemented in this sprint, document it as pending and avoid claiming it exists

4. **Do not implement magic links in this sprint unless explicitly approved**
   - spec mentions it, but it is not required to land the onboarding foundation

### Exact file
- `Server/src/auth.ts`

---

## 8. Testing plan

Feature 1 must include both **scripted/server tests** and **browser-based validation**.

---

## 8.1 Server automated testing

### Recommended new tests

#### File: `Server/src/__tests__/feature1.onboarding.test.ts`
Cover:
- patient invite validation success/failure
- caregiver invite validation success/failure
- clinician/admin invite validation success/failure
- send OTP with valid invite
- send OTP with expired/revoked/invalid invite
- verify OTP creates correct user/profile row
- verify OTP persists consent/preferences
- verify OTP marks invitation accepted/used

#### File: `Server/src/__tests__/feature1.caregiverAccess.test.ts`
Cover:
- caregiver signup from valid invite creates link
- revoked caregiver link blocks access on next request
- caregiver cannot access unlinked patient data
- caregiver can access linked patient data only

#### File: `Server/src/__tests__/feature1.authHardening.test.ts`
Cover:
- lockout threshold behavior if implemented
- login success resets failed attempt counter
- admin bootstrap guard behavior if environment-gated

### Suggested tooling pattern
Use the existing testing style found around:
- `Server/src/__tests__/apiTestClient.ts`
- current `supertest` setup

If tests need a running server and seeded accounts, create a dedicated seed/setup approach rather than reusing manual credentials only.

---

## 8.2 Server smoke script

### Recommended new script
Create:
- `Server/src/scripts/smokeFeature1Onboarding.ts`

Purpose:
- run a sequential onboarding smoke against a local or staged server
- validate key feature paths using real HTTP requests

Suggested smoke coverage:
1. create invitation
2. validate invitation code
3. start OTP flow
4. confirm pending-verification record exists
5. optionally verify OTP using a test override/dev-only strategy if available
6. confirm account created
7. confirm caregiver link created when applicable

Also update `Server/package.json` with a script like:
- `smoke:feature1:onboarding`

---

## 8.3 Browser/manual validation plan

If browser tools are available to the implementing agent, run these manually against the local app.

### Environment
- start backend: `npm run dev --prefix Server`
- start web: `npm run dev --prefix Client/web`

### Browser validation matrix

#### Flow A — Patient invite signup
1. open patient invite registration route
2. enter valid code
3. complete patient form
4. accept consents and preferences
5. submit OTP request
6. enter OTP
7. verify redirect to login
8. sign in
9. verify patient lands on `/patient/dashboard`

#### Flow B — Caregiver invite signup
1. create caregiver invite from an existing patient flow or admin-assisted test setup
2. open caregiver signup page
3. validate invite code
4. complete caregiver form
5. accept consents and preferences
6. submit OTP request
7. verify OTP
8. sign in as caregiver
9. verify caregiver lands on `/caregiver/dashboard`
10. verify only linked patient data is visible

#### Flow C — Expired / revoked invite
1. open signup page with expired/revoked invite code
2. verify no progression past validation
3. verify error copy is clear and non-technical

#### Flow D — Clinician invite signup
1. create clinician invite
2. complete invite-based signup
3. verify no direct public registration path bypass remains
4. verify login lands on `/clinician/dashboard`

#### Flow E — Admin invite signup
1. create admin invite
2. complete invite-based signup
3. verify login lands on `/admin/dashboard`

#### Flow F — Login hardening
1. attempt repeated invalid logins
2. verify threshold behavior if implemented
3. verify successful login resets counter

### Browser-tool guidance for agent
If browser automation exists, record screenshots at these checkpoints:
- invite validation
- OTP sent state
- OTP verified success state
- first successful login by role
- caregiver dashboard with linked-patient-only data

---

## 9. Definition of done for Feature 1

Feature 1 is done only when all of the following are true:

### Product criteria
- patient onboarding is invite-based if required by final scope
- caregiver onboarding is invite-based and link-activating
- clinician onboarding is no longer unrestricted public self-signup
- admin onboarding is no longer unrestricted public self-signup
- consent and communication preference capture are present in onboarding UX
- role-based redirects after login still work

### Server criteria
- invitation validation is consistent
- OTP flow works for all supported onboarding roles
- caregiver link creation is atomic and tested
- audit logs exist for key onboarding actions
- no duplicate invitation systems were introduced without clear compatibility handling

### Web criteria
- routes are coherent and match the intended user flows
- verify-email flow handles role-specific onboarding context correctly
- old direct registration paths are removed, hidden, or explicitly limited
- error states for invalid/revoked/expired invites are user-friendly

### Testing criteria
- server tests added and passing
- smoke script added and runnable
- manual/browser verification completed for patient, caregiver, clinician, and admin onboarding paths

---

## 10. Implementation cautions and anti-patterns

The Feature 1 owner should avoid these mistakes:

### Do not:
- build a second caregiver invite system in parallel to the existing one
- leave clinician/admin direct registration untouched while adding invite flows separately
- keep the patient signup role dropdown if the page is meant to be patient-only
- store consent state only in transient client state
- claim idle timeout / magic-link support unless actually implemented
- break current caregiver link management pages while refactoring onboarding
- introduce onboarding routes without updating `App.tsx` and navigation entry points

### Do instead:
- centralize onboarding logic wherever possible
- preserve existing working caregiver flows unless intentionally replacing them
- use phased migration if route changes are disruptive
- keep schema changes incremental and explicit

---

## 11. Suggested task breakdown for the Feature 1 owner

If another AI agent or engineer owns this feature, they should work in this order:

1. **Audit and document current state**
2. **Finalize schema design**
3. **Implement / update invitation APIs**
4. **Refactor auth OTP lifecycle to support invite-based onboarding**
5. **Update patient and caregiver web onboarding**
6. **Migrate clinician and admin web onboarding off direct registration**
7. **Add consent and communication preference capture**
8. **Harden login/session behavior where in scope**
9. **Add automated tests**
10. **Run browser/manual validation and smoke tests**

This order is important. Do not start by rewriting the UI without first stabilizing invitation and auth assumptions on the server.

---

## 12. Final recommendation to the implementing agent

This feature should be treated as a **unification and hardening effort**, not a greenfield build.

The current codebase already contains valuable parts of the target solution:
- OTP signup infrastructure
- caregiver invitation validation
- caregiver linking
- audit logging
- role-based dashboards

The real job is to:
1. eliminate spec/code inconsistencies,
2. generalize invitation-governed onboarding where needed,
3. preserve existing caregiver access rules,
4. and leave the repo with a single, coherent onboarding/auth story for the MVP.
