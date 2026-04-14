# Phase 5 - Clinician And Admin Dashboard Overhaul

## Purpose

Improve dense operational workflows while protecting high-risk actions.

This phase gives clinician and admin a unified staff-facing shell, clearer operational hierarchy, and responsive queue/table behavior without changing any actual workflows.

## Non-Negotiables

- preserve clinician and admin `activeTab` values exactly
- keep `Care records`, `Appointments`, `Availability`, `Patient records`, and `Audit Log` visually prominent
- do not change review, approval, scheduling, message, record-editing, upload, or audit logic
- do not hide high-risk actions behind hover-only or mobile-only UI

## Main Repository Touchpoints

- `Client/web/src/pages/clinician/ClinicianDashboard.tsx`
- `Client/web/src/pages/clinician/ClinicianDashboard.css`
- `Client/web/src/pages/clinician/ClinicianWorklistTab.tsx`
- `Client/web/src/pages/admin/AdminDashboard.tsx`
- `Client/web/src/pages/admin/AdminDashboard.css`
- `Client/web/src/components/healthRecords/StaffPatientRecordsEditor.tsx`
- `Client/web/src/components/schedule/ScheduleCalendar.tsx`
- `Client/web/src/components/schedule/ScheduleEventDrawer.tsx`
- `Client/web/src/components/NotificationBell.tsx`
- `Client/web/src/components/notifications/NotificationCenter.tsx`

## Target IA

### Clinician

- `Clinical Work`: `schedule`, `patients`, `care-records`, `tasks`
- `Coordination`: `appointments`, `messages`, `contact-staff`, `notifications`

Important: `care-records` remains a first-class workspace and still supports a full-width content mode.

### Admin

- `Dashboard`: `overview`
- `People & Access`: `users`, `invitations`, `assign`
- `Operations`: `availability`, `appointments`, `messages`, `notifications`
- `Clinical Oversight`: `records`, `feedback`
- `Governance & Insights`: `reports`, `audit`, `settings`

Important: `Audit Log`, `Availability`, `Appointments`, and `Patient records` must not become buried.

## Major Redesign Targets

### 1. Care Records

Use `StaffPatientRecordsEditor.tsx` as the shared staff records workspace.

Goals:

- adaptive primary/secondary layout
- cleaner section framing for care plans, documents, visit summary, and vitals
- more responsive patient selector placement
- preserved edit/upload/hide/save actions

### 2. Tasks And Worklist

Rebuild `ClinicianWorklistTab.tsx` into a shared section-shell pattern:

- `Needs Documentation` queue + detail/editor workflow
- `Assign Exercises` form + history layout
- `Visit Prep Tasks` selector + checklist layout

Remove fixed inline width assumptions while preserving all handlers and state.

### 3. Appointments And Availability

Clinician:

- upcoming appointments
- availability builder
- submission history

Admin:

- appointment review queues
- availability review queues
- clearer action bars and filters

Keep all approve, reject, reschedule, cancel, submit, and withdraw behavior intact.

### 4. Messages

Clinician:

- use the shared responsive message-center pattern
- keep inbox/sent, unread handling, reply, and notification deep-links intact

Admin:

- split into operations review and broadcast composition
- keep all filter/search/delete/broadcast behaviors intact
- replace horizontal-scroll-only table fallback with adaptive card/table behavior

### 5. Oversight, Reports, And Audit

Admin overview should become a true operational landing page with direct drill-ins.

`Family Feedback`, `Patient records`, `Reports`, and `Audit Log` should all feel like one staff system, not isolated page islands.

For audit specifically:

- keep filters and date handling unchanged
- redesign as responsive table on desktop and event-card list on smaller screens
- preserve compliance visibility and discoverability

### 6. Notifications And Shared Staff Chrome

- standardize bell dropdown and notification center styling with the staff shell
- keep unread count, mark-read, message-related notification behavior, and preferences intact

## Parity Protections

Do not regress these actions:

- clinician visit actions, note entry, availability submission, reply/send flows
- staff record editing, uploads, visibility toggles, summary saves, vitals saves
- admin approve/reject/schedule flows
- admin delete/remove/assignment/settings actions
- audit filtering and visibility
- notification-driven message opens

## Skills To Use

- `layout` - primary skill for staff shells, queue structure, and dense operational hierarchy
- `adapt` - essential for tables, records, and scheduling surfaces across breakpoints
- `audit` - verify parity and catch responsive/a11y failures in high-risk operational areas
- `clarify` - improve queue labels, helper text, review-note framing, and compliance visibility
- `typeset` - strengthen dense staff hierarchy without increasing noise
- `polish` - normalize spacing, filters, chip styles, and action density
- `colorize` - use restrained semantic color to improve status scanning

## Validation Checklist

- every clinician/admin sidebar item maps to the same current tab content
- `care-records` still has a full-width workspace mode
- admin operational actions remain visible and keyboard reachable
- records editing and upload flows still behave exactly the same
- notifications and messaging still integrate correctly
- tables and queues adapt cleanly at required widths
- audit log remains prominent and usable on smaller screens
- no mandatory horizontal scroll remains for standard staff workflows

## Recommended Sequence

1. apply the staff shell and grouped sidebar
2. extract shared staff section primitives
3. redesign clinician care records, appointments, and worklist
4. redesign clinician messages and notifications
5. redesign admin availability, appointments, and audit
6. redesign admin records, messages, reports, and overview
7. run parity, responsive, and accessibility QA on all high-risk staff actions

## Risks And Dependencies

- Phase 2 shell and Phase 6 shared surface work need to align tightly
- `StaffPatientRecordsEditor.tsx` is shared across clinician and admin, so regressions hit two roles at once
- admin message and audit surfaces are the biggest responsive risk
- clinician worklist is the biggest inline-style and fixed-width layout risk
- do not accidentally edit unused admin stub components instead of the real dashboard surface

## Exit Criteria

Phase 5 is complete when:

- clinician and admin share one staff-facing layout language
- critical operational destinations remain obvious and easy to reach
- queues, tables, and records workspaces are more readable and responsive
- all current actions remain present and functionally identical
