# PatientConnect360

PatientConnect360 is a healthcare portal monorepo centered on a **web application** and a shared **Node/Express backend** for home-health style workflows. It supports four primary roles:

- **Patient**
- **Caregiver / MPOA**
- **Clinician**
- **Administrator**

> **Current repo reality:** the active product surface is **`Client/web` + `Server`**.

---

## Original Product Concept and Positioning

PatientConnect360 was originally conceived as **“MyChart for Home Health”**: a patient- and family-facing portal that extends hospital-style transparency into the post-discharge home-health setting.

The founding concept is that patients often lose digital visibility once care transitions from hospitals and clinics into home health. Traditional portals such as MyChart and Healow provide access to records, appointments, and provider messaging in clinical settings, but that transparency usually stops once care moves into the home. Home-health agencies then fall back on fragmented systems, phone calls, paper instructions, and manual updates.

PatientConnect360 is intended to close that gap by giving patients, families, caregivers, clinicians, and agencies a shared digital surface for:

- care plan visibility
- visit schedule transparency
- therapy and recovery progress visibility
- secure communication
- role-based family/caregiver participation

At the concept level, the platform is meant to act as a **continuity-of-care bridge** between hospital discharge and in-home care delivery.

---

## Target Users and Market Context

The original concept materials describe a layered audience:

### Primary users
- Home-health patients
- Families / MPOAs
- Caregivers who need real-time updates and reliable communication

### Secondary users
- Home-health clinicians such as nurses, therapists, and aides who benefit from a secure, structured patient-facing communication channel

### Tertiary stakeholders
- Home-health agencies and administrators
- Physicians and oversight stakeholders who need visibility into communication, satisfaction, compliance, and care coordination

### Market thesis from the concept docs
- The U.S. home-health market includes thousands of agencies and millions of patients annually.
- The aging population will continue increasing demand for home-health support.
- The core business thesis is that there is no dominant home-health equivalent of **MyChart / Healow** for patients and families today.

## Concept Feature Pillars

The original concept overview emphasized these major product pillars:

- **Care Plan Access** — patient/family visibility into care plans, goals, and medication-related information
- **Visit Schedule Transparency** — real-time schedule visibility with immediate updates for reschedules, cancellations, and delays
- **Therapy Progress Tracking** — patient-friendly progress indicators and milestone-style recovery visibility
- **Secure Messaging** — HIPAA-aligned two-way communication between patients/families and care teams
- **Role-Based Access Controls** — especially for caregivers and MPOAs
- **Mobile + Web Access** — conceptually designed for patient-friendly access across devices, even though the current authoritative implementation is web-first
- **SDK / White-Label Architecture** — long-term ability to integrate with or be embedded into agency/EMR ecosystems


---

## Concept-Driven Onboarding Intent

The original registration-flow materials are especially important because they explain why Feature 1 is structured the way it is.

### Patient onboarding intent
The concept docs describe patient registration as:

1. invitation or redemption code
2. account creation
3. OTP verification
4. consent capture
5. communication preference selection
6. access to the patient dashboard

### Clinician onboarding intent
The concept docs describe clinician registration as invitation-driven and more structured than ordinary self-signup, including:

- invitation / redemption code
- employment details
- personal details
- OTP verification
- consent capture
- communication preferences

### Admin onboarding intent
The concept docs describe admin onboarding as invitation-driven, including:

- invitation code
- OTP / 2FA verification
- organization setup details
- role/security defaults
- consent capture
- communication preferences



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
