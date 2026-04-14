# Phase 4 - Patient And Caregiver Dashboard Overhaul

## Purpose

Simplify family-facing workflows without removing any capability.

This phase applies the new shell and grouping model to patient and caregiver dashboards, then redesigns their highest-friction sections with responsive, calmer, easier-to-scan layouts.

## Non-Negotiables

- preserve patient and caregiver `activeTab` values exactly
- preserve privacy consent, caregiver access, safety, notification, and messaging behavior exactly
- do not change API calls, tab logic, or workflow rules
- do not make `Records`, `Access`, `Safety`, or `Notifications` harder to find

## Main Repository Touchpoints

- `Client/web/src/pages/patient/PatientDashboard.tsx`
- `Client/web/src/pages/patient/PatientDashboard.css`
- `Client/web/src/pages/patient/PatientHEPTab.tsx`
- `Client/web/src/pages/caregiver/CaregiverDashboard.tsx`
- `Client/web/src/pages/caregiver/CaregiverDashboard.css`
- `Client/web/src/pages/caregiver/CaregiverHEPTab.tsx`
- `Client/web/src/components/healthRecords/PatientCareRecordsPanel.tsx`
- `Client/web/src/components/healthRecords/PatientCareRecordsPanel.css`
- `Client/web/src/components/healthRecords/PrivacyConsentPanel.tsx`
- `Client/web/src/components/notifications/NotificationCenter.tsx`
- `Client/web/src/components/NotificationBell.tsx`

## Target IA

### Patient

- `Home`: `overview`
- `Care`: `visits`, `medications`, `health`, `records`, `exercises`
- `Communication`: `messages`, `notifications`
- `Family & Access`: `family`

Important: patient navigation must still pass through `openTab(...)` so privacy consent locking remains intact.

### Caregiver

- `Overview`: `home`
- `Patient Care`: `schedule`, `medications`, `progress`, `records`, `exercises`
- `Communication & Alerts`: `messages`, `alerts`, `notifications`, `safety`
- `Access & Feedback`: `access`, `feedback`

Important: `Safety` must remain visually high-priority and clearly labeled.

## Major Redesign Targets

### 1. Patient Overview

Turn overview into a true summary page:

- next visit and visit actions
- urgent medication/refill reminders
- care-team snapshot
- records shortcut
- exercises/tasks shortcut
- fewer equal-weight cards and less duplication

### 2. Caregiver Home

Split the experience into:

- patient selection / multi-patient summary state
- selected-patient care-support state

Keep shared patient context explicit throughout the page.

### 3. Records Surfaces

Patient:

- keep `PrivacyConsentPanel` visually first
- keep records hidden until consent requirements are satisfied
- restructure the records screen into a stacked workspace: privacy, care plan, therapy progress, documents

Caregiver:

- keep patient-specific records with a clear header selector
- keep blocked-sharing states explicit
- keep all document and plan visibility rules unchanged

### 4. Messages

Unify patient and caregiver messaging into one responsive pattern:

- desktop: list + detail
- tablet: stacked list/detail with collapsible filters
- mobile: list -> thread view

Keep all current actions:

- inbox/sent
- compose
- unread/read
- starred filters where already present
- notification-driven message open
- reply and send flows

### 5. Alerts And Safety

Caregiver:

- redesign alerts as a clearer triage surface with severity, patient context, and action grouping
- keep `Safety` distinct from generic alerts and notifications
- preserve emergency-contact actions and schedule/medication shortcuts exactly

### 6. Exercises And Tasks

Patient and caregiver HEP/prep-task surfaces should:

- move off inline fixed-width side columns
- use shared adaptive workspace patterns
- keep all completion, status, adherence, and update behavior intact
- stack selectors and detail panels below tablet

### 7. Caregiver Patient Selector Standardization

Create one presentational patient selector pattern used across:

- home
- schedule
- medications
- progress
- records
- exercises/tasks

Rules:

- controlled by existing `sharedSelectedPatientId`
- page-header placement on desktop
- below-header placement on tablet/mobile
- never bury patient context mid-page

## Explicit Parity Protections

Do not regress these areas:

- patient privacy re-consent lock and global warning flow
- caregiver access linking and invitation behavior
- blocked records/document states
- caregiver safety actions
- notification bell + full notification center behavior
- message-open from notifications and pending conversation behavior

## Skills To Use

- `distill` - reduce clutter in family-facing surfaces without removing actions
- `layout` - rebuild overview, records, messages, and alerts with stronger hierarchy
- `adapt` - fix the worst responsive issues in records, messages, and HEP/prep layouts
- `clarify` - make safety, access, privacy, and patient context easier to understand
- `audit` - confirm parity on privacy, safety, notifications, and caregiver permissions
- `polish` - refine final card density, empty states, and selector behavior

## Validation Checklist

- patient tabs still expose the same modules and actions
- caregiver tabs still expose the same modules and actions
- privacy consent lock still prevents use of non-record sections when required
- caregiver sharing/blocked states still render accurately
- notifications and message deep-links still work
- caregiver patient selection stays synchronized across relevant tabs
- no horizontal overflow at required widths
- safety and access remain visually prominent and easy to reach

## Recommended Sequence

1. apply the shared shell and grouped sidebar
2. redesign patient overview and caregiver home
3. standardize caregiver patient selector
4. redesign records and privacy-heavy surfaces
5. rebuild messages into the shared responsive pattern
6. redesign alerts and safety
7. refactor HEP and prep-task layouts
8. run parity and viewport QA before moving to staff-facing phases

## Risks And Dependencies

- Phase 2 shell should already be in place
- patient records is the highest compliance-risk surface
- caregiver shared patient state is the highest continuity-risk surface
- message and notification coupling is the highest interaction-risk surface
- HEP/prep surfaces are the highest layout-regression risk because of their current inline widths

## Exit Criteria

Phase 4 is complete when:

- patient and caregiver navigation is simplified into sidebar groups
- overview/home pages act as true landing dashboards
- records, messaging, alerts, and exercise/task areas adapt cleanly across devices
- privacy, access, safety, and notifications remain explicit and functionally unchanged
