# PatientConnect360 Repository Analysis

## Overview
PatientConnect360 is a full-stack, monorepo-based healthcare portal for home healthcare scenarios. It is built as a centralized platform catering to four primary user roles: **Patient**, **Clinician**, **Caregiver**, and **Administrator**. 

### Technology Stack
- **Backend**: Node.js, Express, TypeScript
- **Database/ORM**: PostgreSQL, Prisma ORM
- **Frontend (Web)**: React, TypeScript, Vite
- **Frontend (Mobile)**: React Native, Expo
- **Authentication**: JWT (JSON Web Tokens) with bcrypt password hashing
- **Integrations**: 
  - Twilio (OTP / Email verification)
  - SendGrid (Transactional emails, appointment reminders)
  - Azure Blob Storage (Document uploads and storage)

## Core Architecture

The repository is structured as a monorepo containing a shared Node/Express backend that powers both the React web application and the React Native mobile app.

```
PatientConnect360/
├── Client/
│   ├── web/      (Vite + React frontend)
│   └── mobile/   (Expo + React Native frontend)
└── Server/       (Express + Prisma + TypeScript backend)
```

### Database Schema (Prisma)
The database serves as the ultimate source of truth, establishing deep relational connections across domains:
- **Users & Roles**: Uses a single `User` table, with dedicated profile tables (`PatientProfile`, `ClinicianProfile`, `CaregiverProfile`, `AdminProfile`) containing role-specific data.
- **Visits/Appointments**: The `Visit` model tracks lifecycle (Scheduled, Confirmed, Completed, Cancelled, etc.), with features for requesting visits, managing cancellations, and rescheduling chains.
- **Clinical Data**: Supports `CarePlan` (Problems, Goals, Interventions), `Medication` (active/discontinued tracking), `VitalSign` histories, `Exercise` / HEP (Home Exercise Programs), and clinical `VisitPrepTask`s.
- **Communication & Notifications**: Features `Conversation`, `Message`, and `ConversationParticipant` tracking. Supports `Notification` (in-app) and `OutboundNotification` (SMS/Email via background jobs).
- **Security & Auditing**: Detailed `AuditLog` captures user actions (logins, appointment modifications, caregiver updates).

### Backend (Server)
The backend leverages strongly-typed `Express` endpoints, split logically by domain inside `Server/src/routes`.
- **Authentication Routes (`auth.ts`, `passwordReset.ts`)**: Manages JWT lifecycle and handles Twilio 2FA / OTP requests.
- **Domain logic**: Grouped into specific route handlers such as `carePlans.ts`, `medications.ts`, `messages.ts`/`simpleMessages.ts` (for multi-tenant or role-based conversation gating), and `visits.ts`.
- **Caregiver Linking**: Robust `caregiverInvitations.ts` and `caregiverLinks.ts` control how patients securely invite and link caregivers to access limited subsets of data.
- **Background Jobs**: Built-in schedulers inside `jobs/visitReminders.ts` send automated SMS and emails based on the visit timeline.
- **RBAC Middleware**: Under `src/middleware/`, the application employs strict checks (e.g. `requireRole`) to fence off endpoints from unauthorized profiles.

### Frontend Web (Client/web)
The web client provides unified access to distinct experiences based on login credentials:
- **Routing**: `App.tsx` configures routes spanning `/patient/dashboard`, `/clinician/dashboard`, `/caregiver/dashboard`, and `/admin/dashboard`.
- **Middleware / Guards**: Components like `RequirePatient`, `RequireClinician`, and `RequireAdmin` intercept unauthenticated or incorrectly-authorized users, ensuring complete frontend role segregation.
- **Contexts**: Global state like active user and auth status are managed through `AuthContext.tsx`. Feedback cycles are handled in `FeedbackContext.tsx`.

### Frontend Mobile (Client/mobile)
- Designed to replicate and extend the web workflows tailored for mobile form factors.
- Configured using Expo (`App.tsx`) with an underlying `navigation/AppNavigator` to orchestrate screen routing (e.g., login, patient, caregiver, notifications).
- Communicates directly with the same backend REST API endpoints as the web client.

## Workflows & Component Details

1. **Visit Management Lifecycle**
   - Scheduling includes complex gates checking `ClinicianAvailability`. If conflicts happen, the API returns an `availabilityHint` for rescheduling.
   - Visits track `originalVisitId` linking to support "Reschedule Chain" audits.

2. **Secure Communication**
   - Conversations explicitly map participants by `ConversationParticipant`.
   - Message endpoints implement conversation starring, unread counts, and file attachments dynamically.

3. **Data Security & Privacy**
   - Protected endpoints explicitly verify ownership via `userId` or validated relationships. `CaregiverPatientLink` determines what data a caregiver can retrieve for their assigned patient.
   - Document logic explicitly supports temporary Azure Blob SAS URLs for secure access to uploaded records.

## State of the Application (Current MVP)
- The app is fundamentally operations-ready. It can authenticate, link users, create visits, schedule notifications, and write/fetch clinical data safely.
- Certain areas still have UI placeholders, emphasizing a "backend architecture-first" development mentality.
- Designed with HIPAA alignment in mind (audit logging, data isolation, encrypted token storage, no direct DB access for clients).

**Ready to cross-reference with the broader documentation requirements.**
