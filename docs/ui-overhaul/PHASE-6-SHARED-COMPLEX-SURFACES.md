# Phase 6 - Shared Complex Surface Harmonization

## Purpose

Fix the screens most likely to break on real devices.

This phase standardizes the app's densest, most stateful UI surfaces so they share one responsive model instead of each role maintaining its own fragile layout pattern.

## Non-Negotiables

- do not change message, notification, records, schedule, HEP, or prep-task logic
- do not change API calls or response handling
- do not change route structure or dashboard tab structure
- preserve all unread, mark-read, notification-refresh, reminder, and schedule action behavior
- preserve explicit visibility for critical destinations and compliance-related sections

## Main Repository Touchpoints

- `Client/web/src/components/NotificationBell.tsx`
- `Client/web/src/components/NotificationBell.css`
- `Client/web/src/components/notifications/NotificationCenter.tsx`
- `Client/web/src/components/schedule/ScheduleCalendar.tsx`
- `Client/web/src/components/schedule/ScheduleCalendar.css`
- `Client/web/src/components/schedule/ScheduleEventDrawer.tsx`
- `Client/web/src/components/schedule/ScheduleEventDrawer.css`
- `Client/web/src/components/healthRecords/PatientCareRecordsPanel.tsx`
- `Client/web/src/components/healthRecords/PatientCareRecordsPanel.css`
- `Client/web/src/components/healthRecords/StaffPatientRecordsEditor.tsx`
- `Client/web/src/components/healthRecords/PrivacyConsentPanel.tsx`
- `Client/web/src/components/healthRecords/RecordsDocumentList.tsx`
- `Client/web/src/pages/patient/PatientHEPTab.tsx`
- `Client/web/src/pages/caregiver/CaregiverHEPTab.tsx`
- `Client/web/src/pages/clinician/ClinicianWorklistTab.tsx`
- messaging surfaces inside patient, clinician, caregiver, and admin dashboard files

## Shared Pattern Targets

### 1. Message Center

Create one shared message-center model across roles:

- desktop: list + detail + optional filter rail
- tablet: stacked list/detail with collapsible filters
- mobile: list -> thread view

Shared presentational pieces should include:

- folder tabs
- filter chips/search row
- conversation list
- conversation row
- thread header
- message bubble layout
- compose/reply modal shell

Keep all role-specific data, recipients, unread rules, and handlers where they already live.

### 2. Notification Surfaces

Unify:

- bell dropdown
- notification list rows
- unread indicators
- mark-read / mark-all-read affordances
- empty states
- preferences forms in `NotificationCenter`

Fix the current fixed-width dropdown assumption.

### 3. Schedule And Calendar

Standardize:

- schedule toolbar
- calendar frame
- agenda/list fallback on smaller screens
- event-detail overlay behavior

Desktop can remain calendar-heavy, but phone layouts should become agenda-first instead of squeezing FullCalendar into narrow widths.

### 4. Records Workspaces

Use one adaptive records model for:

- patient/caregiver read-oriented records
- clinician/admin edit-oriented records

Shared rules:

- clear section framing
- desktop split layout only when it remains legible
- tablet/mobile stack and collapse secondary detail
- keep privacy/consent, care plans, documents, and summaries explicit

### 5. HEP / Worklist / Prep Tasks

Create one adaptive workspace layout for:

- patient exercises and prep tasks
- caregiver exercises and prep tasks
- clinician documentation worklist
- clinician exercise assignment and prep-task views

Remove hard-coded side widths and inline layout styling.

### 6. Overlays

Normalize drawers and modals across the app:

- shared width and height rules
- accessible header/body/footer structure
- mobile full-height or bottom-sheet behavior where needed
- consistent close affordance and spacing

## Refactor Plan

### Step 1 - Shared Presentational Primitives

Create shared presentational surfaces such as:

- `MessageCenterShell`
- `MessageThreadView`
- `ConversationList`
- `NotificationList`
- `AdaptiveSplitLayout`
- `TaskWorkspaceLayout`
- `SurfaceModal`
- `SurfaceDrawer`
- `SurfaceToolbar`
- `SurfaceEmptyState`

These should be UI-only and should not own business logic.

### Step 2 - Messaging Convergence

Start with patient and clinician messaging, then caregiver, then admin oversight messaging.

Preserve:

- unread handling
- message-open from bell notifications
- compose and reply flows
- folder states
- mark-read and mark-all-read behavior

### Step 3 - Notification Convergence

Split notification data logic from notification presentation.

Rebuild both bell dropdown and full notification center with shared list, badge, and preference primitives.

### Step 4 - Schedule Convergence

- make the calendar responsive by mode, not just by squeezing width
- convert `ScheduleEventDrawer` into a true adaptive overlay
- keep current role actions intact

### Step 5 - Task And Prep Layout Convergence

Replace inline width-based side columns in:

- `PatientHEPTab.tsx`
- `CaregiverHEPTab.tsx`
- `ClinicianWorklistTab.tsx`

with one shared layout contract that stacks on smaller screens.

### Step 6 - Records Convergence

Rebuild patient/caregiver/staff records layouts around one adaptive section system while keeping their actual behavior and permissions distinct.

## Responsive And Accessibility Requirements

- one-column primary flow on phones
- collapsible or stacked secondary panels on tablet/mobile
- no standard workflow should require horizontal scroll
- all dialogs/drawers must use proper dialog semantics
- unread, warning, and status states must not rely on color alone
- focus must remain visible in lists, chips, drawers, overlays, and selector controls
- minimum 44x44 targets for all high-use controls

## Skills To Use

- `adapt` - primary skill for reshaping complex surfaces across breakpoints
- `audit` - catch responsive, accessibility, and anti-pattern failures before and after refactor
- `layout` - unify split panes, rail/detail views, and overlay structure
- `animate` - add restrained, purposeful motion to drawers, thread transitions, and overlays
- `polish` - normalize spacing, item density, and visual consistency across all shared surfaces
- `clarify` - improve status language, filter labels, and task/records wayfinding

## Validation Checklist

- messaging still supports all existing actions across roles
- bell unread count and notification-center behavior still match current logic
- schedule actions still work for every role that uses the shared schedule surfaces
- HEP, prep-task, and documentation actions still submit and update exactly as before
- records and privacy panels still surface required compliance content clearly
- no fixed-width overlay or dropdown exceeds the viewport at target sizes
- no mandatory horizontal overflow remains for patient/clinician/caregiver standard flows

## Recommended Sequence

1. shared overlay and surface primitives
2. patient + clinician messaging alignment
3. caregiver + admin messaging alignment
4. notification dropdown + notification center alignment
5. shared schedule/calendar and event drawer refactor
6. HEP/worklist/prep-task shared layout refactor
7. records workspace harmonization
8. full responsive and accessibility regression pass

## Risks And Dependencies

- Phase 1 and Phase 2 foundations should already exist
- message and notification surfaces are tightly coupled through refresh/read events
- schedule drawer behavior can regress if callbacks are not made explicit during refactor
- large dashboard files make surface extraction easy to destabilize if logic and presentation are mixed
- records surfaces are compliance-sensitive and must retain prominence during layout cleanup

## Exit Criteria

Phase 6 is complete when:

- shared complex surfaces use one responsive interaction model
- inline width hacks and duplicated layout systems are largely removed
- overlays, drawers, and dropdowns behave consistently across the app
- high-density surfaces are more stable, more accessible, and more maintainable without any logic change
