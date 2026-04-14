# PatientConnect360

PatientConnect360 is a healthcare portal monorepo centered on a **web application** and a shared **Node/Express backend** for home-health style workflows. It supports four primary roles:

- **Patient**
- **Caregiver / MPOA**
- **Clinician**
- **Administrator**

> **Current repo reality:** the active product surface is **`Client/web` + `Server`**.

---

## Current State Snapshot

This repository is **well beyond a starter MVP skeleton**. It already contains substantial backend and web functionality across authentication, onboarding, visits, notifications, messaging, records, and admin tooling.

### What is true right now

- The app has a working **Express + Prisma + PostgreSQL** backend.
- The app has a working **React + Vite** web frontend.
- Role-aware login, protected routes, and dashboard experiences already exist.
- Multiple major domains are already implemented to varying levels of completeness:
  - onboarding/auth
  - caregiver linking
  - visits/scheduling
  - notifications/reminders
  - secure messaging
  - care plans/documents/privacy
  - HEP / prep tasks / therapy progress workflows
  - admin analytics / audit / branding / invitations

### What is also true right now

- The repo is still in an active **consolidation and hardening** phase.
- Several features are **partially implemented but not fully unified**.
- Some areas are polished and demoable; others still need consistency work, deeper tests, and UX cleanup.
- The current sprint anchor is still **Feature 1**, but the codebase already contains meaningful work from Features 2–5 as well.

---

## Repository Structure

```text
PatientConnect360/
├── Client/
│   ├── web/          # Primary product surface (React + Vite + TypeScript)
│   └── mobile/       # Placeholder / non-authoritative for current sprint work
├── Server/           # Express + TypeScript + Prisma backend
├── docs/
├── scripts/
├── Feature1_ImplementationPlan.md
├── Feature2_ImplementationPlan.md
├── Feature3_ImplementationPlan.md
├── Feature4_ImplementationPlan.md
└── Feature5_ImplementationPlan.md
```

---

## Tech Stack

### Web
- React 19
- TypeScript
- Vite
- Axios
- React Router

### Backend
- Node.js
- Express
- TypeScript
- Prisma ORM
- PostgreSQL

### Auth / Security / Integrations
- JWT in httpOnly cookies
- bcrypt password hashing
- Twilio Verify for OTP/email verification
- SendGrid for transactional email / reminders
- Azure Blob Storage for patient document storage and SAS-based downloads

---

## Product Domains Implemented in the Repo

### 1. Authentication, onboarding, and role access
- JWT cookie-based login/logout/me flow
- OTP-based verification flow via Twilio Verify
- Role-aware signup/login for:
  - patient
  - caregiver
  - clinician
  - admin
- Caregiver invitation and caregiver-to-patient linking model
- Generic onboarding invitation model for invite-driven onboarding
- Consent capture persistence
- Communication preference persistence
- Login lockout protection after repeated failed attempts
- Dev-gated default admin bootstrap

### 2. Visits, scheduling, and reminders
- Visit request / review / approval flows
- Reschedule request handling
- Cancellation handling
- Reschedule chain support via `originalVisitId`
- Clinician availability gating
- Reminder preference support
- In-app notifications
- Background reminder scheduler for SMS/email when enabled

### 3. Messaging
- Conversation-based messaging data model
- Role-scoped messaging routes
- Inbox / sent / thread views
- Unread counts and mark-read behavior
- Conversation starring/filtering support
- Caregiver-aware clinician/patient access restrictions

### 4. Patient records and recovery visibility
- Care plans with items, progress, and check-ins
- Patient documents with Azure-backed secure download flow
- Patient privacy / caregiver visibility controls
- Vitals
- HEP assignments and completions
- Visit prep tasks
- Visit documentation gating / worklist behavior

### 5. Admin and agency operations
- Admin dashboard surface
- User and assignment management
- Branding/settings persistence
- Audit logs with filtering/pagination/date range
- Invitation management
- Summary analytics and daily activity rollups
- Family feedback review support

---

## Feature-by-Feature Development Status

The repo includes five implementation plans. Those plans are still useful, but the codebase has moved ahead of the early audit assumptions in several places.

## Feature 1 — Secure onboarding, auth, and caregiver/MPOA access

### Status
**Partially implemented, and much further along than the original audit baseline in the plan.**

### Already implemented
- Generic onboarding invitation system exists:
  - `Server/src/routes/onboardingInvitations.ts`
  - `Server/src/lib/onboarding.ts`
- Legacy caregiver invitation/link model still exists and is preserved:
  - `Server/src/routes/caregiverInvitations.ts`
  - `Server/src/routes/caregiverLinks.ts`
- OTP signup flow exists and is live in backend auth:
  - `POST /api/auth/send-otp`
  - `POST /api/auth/resend-otp`
  - `POST /api/auth/verify-otp`
- Consent persistence exists via `UserConsent`
- Communication preference persistence exists via `UserCommunicationPreference`
- Direct registration is blocked in production
- Login lockout is implemented
- Web signup flows already use invite + OTP for:
  - caregiver
  - clinician
  - admin

### Biggest remaining gap
- **Patient onboarding is still effectively public** in the current web/backend flow unless an invitation code is optionally provided.

### Practical sprint conclusion
Feature 1 is close, but not fully closed if the intended final scope is **invite-first onboarding for patients too**.

---

## Feature 2 — Visit schedule transparency + notifications + polished scheduling UX

### Status
**Backend-heavy foundation is already present; web experience exists but is still partly fragmented.**

### Already implemented in the repo
- Robust visit lifecycle APIs
- Clinician availability APIs
- Reminder preferences
- In-app notifications
- Background visit reminder scheduler
- Role-aware visit visibility

### Remaining direction
- Further unify schedule/calendar experiences across roles
- Continue moving from list-based scheduling UI toward a more coherent calendar-grade experience

---

## Feature 3 — Secure messaging starter

### Status
**Functionality exists, but architecture is not yet fully consolidated.**

### Already implemented in the repo
- Multiple message route families exist today:
  - `/api/messages`
  - `/api/simple-messages`
  - `/api/messages-v2`
- Inbox/sent/thread behavior exists on web
- Unread state and starring exist
- Role gating is already partly enforced

### Main remaining problem
- Messaging is implemented, but still needs canonicalization so the app has **one clearly authoritative messaging system** instead of overlapping route families.

---

## Feature 4 — Patient records experience: care plans, documents, privacy, and therapy progress

### Status
**A large amount of Feature 4 functionality is already implemented.**

### Already implemented in the repo
- Care plan APIs and supporting schema
- Document upload/list/download pipeline
- Caregiver privacy gating for records visibility
- HEP assignments and completions
- Visit prep tasks
- Visit documentation gating
- Feature 4 tests already exist:
  - `feature4.hep.test.ts`
  - `feature4.prepTasks.test.ts`
  - `feature4.documentationGating.test.ts`
- Feature 4 smoke checklist exists under `docs/feature4-smoke-checklist.md`

### Main remaining direction
- Keep unifying these pieces into a cleaner patient/family records-and-recovery story
- Maintain caregiver scoping and privacy consistency

---

## Feature 5 — Admin / agency pilot-readiness & operational readout

### Status
**Substantial admin infrastructure already exists.**

### Already implemented in the repo
- Admin analytics endpoints
- Daily activity rollups
- Audit log querying
- Assignment management
- Branding/settings persistence
- Feedback review support
- Invitation management

### Main remaining direction
- Continue packaging admin functionality into a more operationally polished, pilot-ready agency surface
- Improve KPI framing, readout clarity, and admin UX cohesion

---

## What the Current Web App Already Exposes

The current `Client/web` application already includes public and protected routes for:

- homepage
- login
- forgot password
- patient registration
- caregiver registration
- clinician registration
- admin signup/login
- patient dashboard
- caregiver dashboard
- clinician dashboard
- admin dashboard
- admin invitation management

There are also shared web building blocks already in place such as:
- auth context
- feedback/toast context
- agency branding provider
- role-based route guards
- onboarding consent/preferences components
- notification UI pieces
- file upload/address autocomplete utilities

---

## What the Backend Already Exposes

The backend already mounts routes for:

- auth
- password reset
- admin
- visits
- medications
- vitals
- availability
- caregiver invitations / links / overview / access / alerts / progress / safety
- family feedback
- care plans
- patient documents
- patient privacy
- notifications
- HEP
- visit prep tasks
- onboarding invitations
- messaging

This is not a concept-only backend; it is a real application backend with substantial domain coverage.

---

## Important Architecture Notes

### Role and access model
- `User` is the central auth entity.
- Role-specific profile tables exist for:
  - `PatientProfile`
  - `ClinicianProfile`
  - `CaregiverProfile`
  - `AdminProfile`
- Caregiver-to-patient visibility is enforced through relationship/link logic and privacy settings.
- Patient-scoped access helper logic lives in `Server/src/lib/patientAccess.ts`.

### Audit and safety
- Audit logging already exists across key actions.
- Login lockout exists.
- Direct registration is restricted in production.
- Secure document download flow uses blob storage + temporary URL generation.

### Current repo caveat
- The codebase includes some duplicated or overlapping route families and partially overlapping UI flows.
- The main engineering theme now is **unify, harden, and polish** rather than rebuild from scratch.

---

## Local Development

## Install

From the repository root:

```bash
npm install
npm run setup
```

### Root scripts

| Script | Purpose |
|---|---|
| `npm run setup` | Installs dependencies for `Server` and `Client/web` |
| `npm run dev` | Runs backend + web together |
| `npm run build` | Builds backend + web |
| `npm run start` | Starts backend production build |
| `npm run lint` | Runs web linting |

---

## Environment Notes

Important environment variables include:

### Core
- `DATABASE_URL`
- `JWT_SECRET`

### OTP / Verification
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_VERIFY_SERVICE_SID`

### Email / Reminders
- `SENDGRID_API_KEY`
- `SENDGRID_FROM_EMAIL`
- `ENABLE_APPOINTMENT_EMAILS`
- `ENABLE_OUTBOUND_REMINDERS`

### Blob Storage / Documents
- `AZURE_STORAGE_CONNECTION_STRING`
- `AZURE_STORAGE_CONTAINER`
- `AZURE_BLOB_SAS_MINUTES`

### Dev bootstrap
- `ADMIN_EMAIL`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ALLOW_DEV_ADMIN_BOOTSTRAP`

---

## Seeding and Smoke Commands

Run from `Server/` unless noted otherwise.

### Seeds
- `npm run seed:admin`
- `npm run seed:feature1`
- `npm run seed:feature4`
- `npm run seed:feedback`
- `npm run seed:comprehensive`
- `npm run seed:demo`

### Smokes / tests
- `npm run smoke:feature1`
- `npm run smoke:feature1-onboarding`
- `npm test`

There are also targeted audit/analytics scripts in `Server/scripts/`.

---

## Current Recommended Mental Model for the Repo

Treat PatientConnect360 as:

1. a **real, partially productized healthcare portal**, not a blank MVP starter,
2. a **web-first application** backed by a substantial Express/Prisma API,
3. a codebase where the main development work is now:
   - unifying overlapping implementations,
   - tightening role-safe behavior,
   - polishing UX,
   - and improving test/smoke confidence.

---

## Immediate Development Priority

The immediate sprint priority remains **Feature 1 completion/hardening**.

### Most important open question
- Should **patients also be invite-only**, or are they intentionally the one public self-registration exception?

That decision determines whether Feature 1 is effectively in final cleanup or still missing a core onboarding requirement.

---

## Summary

PatientConnect360 already demonstrates:

- multi-role healthcare workflows
- role-based access control
- invite and OTP onboarding infrastructure
- caregiver relationship management
- visit scheduling and reminders
- messaging infrastructure
- patient records and recovery surfaces
- admin analytics and audit capabilities

The repo is best understood as a **substantially built, actively refined healthcare web platform** whose remaining work is focused on coherence, polish, and sprint-by-sprint hardening.
