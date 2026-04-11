## Feature 2 Implementation Plan

### Feature name
**Visit schedule transparency + notifications + polished calendar-style schedule UI**

### Scope for this plan
This plan is for **Server** and **Client/web** only.

### Expanded scope requested for Feature 2
In addition to the original Feature 2 definition, this implementation plan assumes the sprint owner will deliver a **well-polished calendar-style schedule experience** that shows:
- appointments / visits
- relevant schedule-linked tasks
- role-appropriate schedule context by day and time
- notification and reminder visibility where it improves schedule clarity

This does **not** mean every existing task-like object in the system must become a draggable calendar item. The schedule should only surface items that actually have meaningful date/time context in the current data model.

### Out of scope for this implementation plan
- `Client/mobile/*`
- real GPS / ETA tracking
- route optimization / dispatch intelligence
- push-notification platform expansion beyond what already exists
- websocket/live-sync infrastructure unless explicitly approved
- EMR integration / FHIR
- billing / payments
- AI prediction / smart dispatch

---

## 1. Why this feature is second

Feature 2 is one of the clearest MVP-1 requirements in the original client documentation.

The spec and concept materials consistently emphasize:
- day/week visit schedule visibility
- status clarity for scheduled / confirmed / cancelled / rescheduled / delayed visits
- patient/family transparency after hospital discharge
- reminder and notification support
- a mobile-first, polished patient-portal scheduling experience

The current repo already has a strong backend base for this:
- typed visit APIs
- scheduling / review / reschedule / cancel lifecycle
- clinician availability gating
- in-app notifications
- outbound reminder jobs
- role-scoped visit visibility

But the current web experience is still fragmented and mostly **list-based**, not a true calendar-grade scheduling UX.

This makes Feature 2 a high-leverage sprint feature because the owner can build on substantial existing logic without inventing the domain from scratch.

---

## 2. Desired end state for Feature 2

At the end of this feature, the web app should provide a clearly demoable **"MyChart for home-health scheduling"** experience.

### 2.1 Product behavior target

#### Patient
- can see upcoming and historical visits in a polished **day/week calendar** and agenda view
- can clearly distinguish statuses: requested, confirmed, cancelled, reschedule requested, completed, missed, delayed (computed or persisted)
- can request visits, confirm, cancel, and request reschedules from schedule-aware UI
- can manage reminder preferences from a schedule-aware context
- can see visit-linked schedule items that matter on the calendar or in the agenda rail

#### Caregiver / MPOA
- can switch between linked patients and see each patient’s schedule clearly
- can view day/week schedule and timeline per patient
- can confirm / cancel / request reschedule within allowed permissions
- can see role-appropriate visit-linked tasks and alerts attached to scheduled events

#### Clinician
- can view today/day/week schedule in a real time-grid or agenda UI
- can see availability blocks and visit blocks clearly
- can check in / move visits through allowed statuses from schedule context
- can submit/manage availability with better connection to the calendar experience
- can view visit-linked prep tasks in schedule context

#### Admin
- can review appointment requests and clinician availability using better schedule context, not only tables
- can inspect operational schedule load in a calendar-style interface
- can approve/reject requests with date/time overrides from a schedule-aware UI

### 2.2 Technical outcome target
- the app has a **shared schedule/calendar component system** rather than bespoke list UIs per role
- the server exposes either:
  - a normalized schedule aggregation route, or
  - a well-documented composition strategy over existing visit / availability / prep-task routes
- schedule event rendering is consistent across patient / caregiver / clinician / admin
- notifications and reminder preferences are connected to the schedule UX instead of living as isolated utilities

---

## 3. Mandatory current-state audit before implementation

Before any implementation work starts, the Feature 2 owner/agent must audit the current code so they do not rebuild scheduling logic that already exists.

This audit is **required**.

---

## 4. Current-state audit checklist

---

## 4.1 Server scheduling audit

### File: `Server/src/routes/visits.ts`
Audit all existing visit behavior before making any schedule changes.

#### Existing visit capabilities already present
- `GET /api/visits`
  - role-scoped listing for admin / clinician / patient / caregiver
  - supports `status`, `from`, `to`, and role-aware filtering
- `GET /api/visits/admin/requests`
  - admin queue for new requests, reschedule requests, and cancellation updates
- `GET /api/visits/:id`
  - visit detail with role-aware access control
- `POST /api/visits`
  - create visit / visit request
- `POST /api/visits/:id/reschedule-request`
  - patient/caregiver reschedule request flow
- `POST /api/visits/:id/review`
  - admin approve/reject flow
- `PATCH /api/visits/:id/summary`
  - structured summary editing
- `PATCH /api/visits/:id`
  - role-based visit status update flow
- `DELETE /api/visits/:id`
  - admin delete path

#### Important existing behavior to preserve
- clinician availability gating via `checkApprovedAvailability(...)`
- role-based scoping for caregiver access
- reschedule chain model via `originalVisitId`
- cancellation audit + reminder cancellation hooks
- review workflow for requested / reschedule-requested visits

#### Important gaps relevant to Feature 2
- there is **no schedule aggregation endpoint** for the web UI
- there is **no dedicated calendar/event DTO**
- there is **no explicit delayed status** in the schema despite the spec mentioning delayed visits
- visit lifecycle is robust, but UI consumption is fragmented across role dashboards

---

## 4.2 Server availability audit

### File: `Server/src/routes/availability.ts`
Audit what already exists before designing clinician/admin schedule UI.

#### Existing availability capabilities already present
- clinician/admin availability submission
- batch availability submission
- admin availability review
- role-scoped availability reads
- deletion rules by role/status

#### Important current-state notes
- patients only see **approved** clinician availability for assigned clinicians
- clinicians already have a working availability submission backend
- admin already has a review backend
- current availability UX is functional but table/list-oriented, not a true calendar/time-block interface

---

## 4.3 Server notification/reminder audit

### Files to audit
- `Server/src/routes/notifications.ts`
- `Server/src/helpers/notificationHelpers.ts`
- `Server/src/jobs/visitReminders.ts`

#### Existing notification behavior already present
- in-app notification list/read/read-all endpoints
- reminder preference read/update endpoints
- visit lifecycle notification creation hooks
- scheduled reminder creation for 24h / 1h windows
- outbound email/SMS queueing when enabled

#### Important current-state notes
- current notification system is **visit-aware already**
- reminder preferences are stored in `VisitReminderPreference`
- notification center exists on web
- there is **no push notification implementation**
- schedule UI can build on this rather than creating parallel reminder logic

---

## 4.4 Server task-related audit for calendar expansion

Because you broadened the scope to include appointments, tasks, and whatever is relevant with a day/time, the owner must audit which task-like items actually have time meaning.

### File: `Server/src/routes/visitPrepTasks.ts`
Audit existing behavior:
- prep tasks are tied to `visitId`
- prep tasks inherit schedule meaning from their visit
- patient/caregiver can mark completion
- clinician/admin can create/edit depending on role

### File: `Server/src/routes/hep.ts`
Audit before trying to put HEP into the calendar:
- HEP assignments have `startDate` and `endDate`
- HEP does **not** naturally carry a precise visit-time event model

### Calendar-specific conclusion
For Feature 2, the schedule owner should treat:
- **VisitPrepTask** as a valid schedule-linked task source
- **HEP assignments** as better suited for an agenda/sidebar or all-day indicator unless business rules define exact due times

Do **not** force every HEP assignment into a time-grid event unless product approves that interpretation.

---

## 4.5 Web schedule/UI audit

### File: `Client/web/src/api/visits.ts`
Audit existing client abstractions.

#### Already present
- `getVisits`
- `getVisit`
- `updateVisitStatus`
- `createVisitRequest`
- `submitRescheduleRequest`
- `reviewVisitRequest`
- `getAdminVisitRequests`
- helpers for status, formatting, labels

#### Current-state conclusion
The client already has a solid typed visit API layer. Do **not** rewrite it unless a new schedule aggregation API makes it necessary to add a companion module.

### File: `Client/web/src/api/availability.ts`
Audit existing availability helpers.

### File: `Client/web/src/components/NotificationBell.tsx`
Audit existing behavior:
- combines in-app notifications and unread messages
- polls counts every 30s
- can deep-link into message-related actions

### File: `Client/web/src/components/notifications/NotificationCenter.tsx`
Audit existing behavior:
- notifications tab
- reminder preference tab
- list-based read-state UX

#### Current-state conclusion
Reminder preference UX already exists. Feature 2 should improve its linkage to schedule experience, not rebuild preferences from zero.

---

## 4.6 Role-dashboard audit

Feature 2 will touch multiple role dashboards. The owner must audit them before coding.

### Patient schedule audit

#### File: `Client/web/src/pages/patient/PatientDashboard.tsx`

Audit these existing areas:
- `OverviewTab`
  - shows compact upcoming visit summaries
  - fetches team availability
  - not a day/week schedule UI
- `UpcomingVisits`
  - current list-based visit view
  - supports confirm/cancel/reschedule request
  - no calendar/time-grid visualization

#### Current-state conclusion
Patient scheduling logic already exists functionally, but presentation is not calendar-grade.

---

### Clinician schedule audit

#### File: `Client/web/src/pages/clinician/ClinicianDashboard.tsx`

Audit these existing areas:
- `TodaySchedule()`
  - today-only list view
  - check-in flow
  - route panel is a placeholder visualization, not real schedule UI
- `AppointmentsHub()`
  - upcoming appointments list
  - availability submission controls
  - no shared calendar/time-grid foundation

#### Current-state conclusion
Clinician scheduling is split across multiple partial experiences that should be unified.

---

### Caregiver schedule audit

#### File: `Client/web/src/pages/caregiver/CaregiverDashboard.tsx`

Audit these existing areas:
- `HomeOverview()`
  - includes upcoming visit summaries per patient
- `CaregiverSchedule()`
  - role-aware list view
  - supports confirm/cancel/reschedule request
  - no day/week calendar UI
  - supports multi-patient switching already

#### Current-state conclusion
Caregiver schedule logic is already strong enough to support a calendar UI with patient filtering.

---

### Admin schedule audit

#### File: `Client/web/src/pages/admin/AdminDashboard.tsx`

Audit these existing areas:
- `AppointmentsReview()`
  - admin queue in table form
- `AvailabilityReview()`
  - availability review in table form
- admin analytics already reference visit volume, but not an operational calendar surface

#### Current-state conclusion
Admin already has operational data but lacks calendar context and schedule load visualization.

---

## 4.7 Existing visits component audit

### File: `Client/web/src/components/visits/VisitStructuredSummaryPanel.tsx`

Audit what exists:
- summary panel for visit details
- structured summary rendering
- attached vitals snapshot

### Directory: `Client/web/src/components/visits/`
Current state:
- only contains the structured summary component
- there is **no shared schedule/calendar component system**

#### Conclusion
Feature 2 should add a new shared schedule component area instead of bloating existing dashboard files further.

---

## 4.8 Dependency audit before selecting calendar approach

### File: `Client/web/package.json`
Current dependencies do **not** include a real calendar library.

Current relevant packages:
- `react-datepicker`
- `react`
- `react-router`
- `axios`
- `recharts`

#### Important implementation implication
If the goal is a **polished calendar-style day/week experience**, the owner should strongly consider adding a schedule library instead of hand-rolling a calendar from scratch.

---

## 5. Implementation strategy recommendation

### Core recommendation
Do **not** implement Feature 2 by independently upgrading patient, clinician, caregiver, and admin schedule screens one by one with separate UI logic.

Instead, use three shared layers:

1. **Server schedule aggregation / event normalization layer**
2. **Shared calendar component system on Client/web**
3. **Role-specific adapters and actions on top of the shared layer**

This avoids four separate schedule implementations.

---

## 5.1 Preferred calendar UI approach

### Recommended approach
Add a real calendar library for the web client.

### Preferred dependency choice
Modify `Client/web/package.json` to add:
- `@fullcalendar/react`
- `@fullcalendar/daygrid`
- `@fullcalendar/timegrid`
- `@fullcalendar/interaction`

### Why this is recommended
- the user explicitly wants a **calendar-style, well-polished UI**
- the current repo has no existing calendar foundation
- FullCalendar provides robust day/week rendering, agenda views, event coloring, and click handling
- this avoids spending the sprint building calendar infrastructure instead of product behavior

### Alternate approach if new dependency is blocked
Build a custom schedule UI using CSS grid and existing components, but only if package additions are disallowed.

#### Warning
The custom approach is higher risk and will likely yield a less polished result in the same sprint.

---

## 5.2 Preferred server approach

### Recommended design
Add a dedicated schedule aggregation surface instead of forcing the web app to stitch everything together from multiple endpoints.

### Recommended new server route
- `Server/src/routes/schedule.ts`

### Recommended route shape
- `GET /api/schedule`

### Suggested query parameters
- `from`
- `to`
- `patientId?`
- `clinicianId?`
- `includeAvailability?`
- `includePrepTasks?`

### Suggested response shape
Return normalized calendar events, for example:

```ts
type ScheduleEventKind = "VISIT" | "PREP_TASK" | "AVAILABILITY_BLOCK";

type ScheduleEvent = {
  id: string;
  kind: ScheduleEventKind;
  title: string;
  startAt: string;
  endAt: string;
  status?: string;
  relatedVisitId?: string;
  patient?: { id: string; name: string };
  clinician?: { id: string; name: string; specialization?: string | null };
  location?: string | null;
  canConfirm?: boolean;
  canCancel?: boolean;
  canReschedule?: boolean;
  canCheckIn?: boolean;
  meta?: Record<string, unknown>;
};
```

### Why this is better than raw composition in the client
- the backend already owns role-scoping logic
- the backend already knows how visits, availability, and prep tasks relate
- it keeps calendar rendering consistent across roles

---

## 5.3 Recommended delayed-visit strategy

The spec references delayed visits, but the current schema does not contain a `DELAYED` visit status.

### Recommendation for MVP
Do **not** add a persisted `DELAYED` status unless the team explicitly wants a schema change.

Instead, define a **computed delayed state** in the schedule adapter layer:
- if visit status is `SCHEDULED` or `CONFIRMED`
- and current time is past scheduled start by a configured grace window
- and no `checkedInAt`
- then render as **Delayed** in the UI

### Relevant implementation locations
- server schedule normalization layer, or
- shared client schedule adapter layer

Prefer server-side normalization if a unified `/api/schedule` route is added.

---

## 5.4 Recommended schedule-linked task strategy

Because the requested scope includes appointments and tasks, the schedule owner should only calendarize tasks that actually have schedule meaning.

### Include in calendar / agenda
- `Visit` items
- `VisitPrepTask` items tied to a visit date/time
- `ClinicianAvailability` blocks for clinician/admin schedule contexts

### Do not force into time-grid
- HEP assignments without exact event times
- generic alerts without a start/end time

### Better placement for non-time-bound items
- agenda sidebar
- detail drawer
- summary rail beneath selected date

---

## 6. Recommended file-level implementation plan

### 6.1 Existing files likely to be modified

#### Server
- `Server/src/index.ts`
- `Server/src/routes/visits.ts`
- `Server/src/routes/availability.ts`
- `Server/src/routes/notifications.ts`
- `Server/src/routes/visitPrepTasks.ts`
- `Server/src/helpers/notificationHelpers.ts`
- `Server/src/jobs/visitReminders.ts`

#### Client/web
- `Client/web/package.json`
- `Client/web/src/App.tsx` *(only if route structure changes or shared schedule page routes are introduced)*
- `Client/web/src/api/visits.ts`
- `Client/web/src/api/availability.ts`
- `Client/web/src/components/NotificationBell.tsx`
- `Client/web/src/components/notifications/NotificationCenter.tsx`
- `Client/web/src/pages/patient/PatientDashboard.tsx`
- `Client/web/src/pages/clinician/ClinicianDashboard.tsx`
- `Client/web/src/pages/caregiver/CaregiverDashboard.tsx`
- `Client/web/src/pages/admin/AdminDashboard.tsx`

### 6.2 New files likely to be added

#### Server
- `Server/src/routes/schedule.ts`
- `Server/src/lib/schedule.ts`
- `Server/src/__tests__/feature2.schedule.test.ts`
- `Server/src/__tests__/feature2.notifications.test.ts`
- `Server/src/__tests__/feature2.reminders.test.ts`
- `Server/src/scripts/smokeFeature2Schedule.ts`

#### Client/web
- `Client/web/src/api/schedule.ts`
- `Client/web/src/components/schedule/ScheduleCalendar.tsx`
- `Client/web/src/components/schedule/ScheduleCalendar.css`
- `Client/web/src/components/schedule/ScheduleEventDrawer.tsx`
- `Client/web/src/components/schedule/ScheduleEventDrawer.css`
- `Client/web/src/components/schedule/ScheduleFilters.tsx`
- `Client/web/src/components/schedule/ScheduleAgenda.tsx`
- `Client/web/src/components/schedule/scheduleAdapters.ts`
- `Client/web/src/components/schedule/scheduleTypes.ts`

Optional if team wants stronger role separation:
- `Client/web/src/components/schedule/PatientScheduleView.tsx`
- `Client/web/src/components/schedule/ClinicianScheduleView.tsx`
- `Client/web/src/components/schedule/CaregiverScheduleView.tsx`
- `Client/web/src/components/schedule/AdminScheduleView.tsx`

---

## 7. Phased execution plan for AI agents / feature owner

The steps below are intentionally sequential and should be followed in order.

---

## Phase 0 — Audit and scope lock

### Goal
Understand exactly what already exists so the owner does not duplicate schedule logic.

### Tasks
1. Complete the audit in Sections 4.1–4.8.
2. Produce a written implementation note answering:
   - what schedule functionality already exists by role?
   - which actions already exist and should remain unchanged?
   - which items belong in a time-grid vs agenda/sidebar?
   - whether the team will add a schedule aggregation route or compose existing APIs client-side?
3. Decide whether to add a calendar dependency.

### Required output of Phase 0
- file touch list
- schedule event model decision
- dependency decision

### Do not proceed until
- the owner can clearly explain how patient, caregiver, clinician, and admin currently interact with visits and availability in the codebase

---

## Phase 1 — Schedule event model and API design

### Goal
Define one normalized event shape for the calendar UI.

### Recommended work

#### Server
Create `Server/src/lib/schedule.ts` to normalize existing domain records into schedule events.

Suggested helper responsibilities:
- map `Visit` → schedule event
- map `VisitPrepTask` + parent visit → schedule event
- map `ClinicianAvailability` → availability block event
- compute UI status labels including delayed derived state if adopted
- enforce role-safe inclusion of related metadata

#### Optional new route
Create `Server/src/routes/schedule.ts` and mount it in `Server/src/index.ts`.

Suggested initial route:
- `GET /api/schedule`

### Why this phase matters
Without a normalized event model, each dashboard will invent its own calendar mapping logic.

---

## Phase 2 — Server schedule aggregation implementation

### Goal
Expose a role-aware calendar/agenda data source.

### Recommended implementation details

#### New file: `Server/src/routes/schedule.ts`
Responsibilities:
- require auth
- infer current user role from `req.user`
- use existing scoping logic from visits/availability/prep-task behavior
- support `from`/`to` query filtering
- optionally include:
  - visits
  - availability blocks
  - prep tasks

#### Existing files to reuse, not duplicate
- visit scoping rules from `Server/src/routes/visits.ts`
- caregiver patient link rules already used across server routes
- patient/clinician scoping assumptions already in visits and availability routes

#### Important instruction
Do not rewrite the existing `GET /api/visits` route just to feed the calendar unless you must. Prefer a separate aggregation route that composes existing domain data cleanly.

### Optional enhancement
If the team does not want a new route, then add `Client/web/src/api/schedule.ts` that composes:
- `/api/visits`
- `/api/availability`
- `/api/visits/:visitId/prep-tasks`

#### Warning
This is less clean and may increase client-side coupling and request volume.

---

## Phase 3 — Notification and reminder alignment

### Goal
Make schedule UX and reminder UX feel like one feature instead of separate utilities.

### Existing files to audit/update
- `Server/src/routes/notifications.ts`
- `Server/src/helpers/notificationHelpers.ts`
- `Server/src/jobs/visitReminders.ts`
- `Client/web/src/components/NotificationBell.tsx`
- `Client/web/src/components/notifications/NotificationCenter.tsx`

### Recommended work

#### 3.1 Improve schedule-related notification metadata
Ensure visit notifications consistently include enough metadata for schedule linking:
- `visitId`
- patient/clinician display context if useful
- notification type

#### 3.2 Make reminder preferences schedule-visible
The user should be able to get to reminder preferences directly from the schedule interface.

#### 3.3 Decide what remains out of scope
- do not introduce push if it does not already exist
- do not attempt <5s true realtime with websocket infrastructure in this sprint unless approved

### Practical MVP recommendation
Use existing polling/refetch patterns:
- `useRefetchOnIntervalAndFocus`
- 15s–30s polling for schedule surfaces where appropriate

---

## Phase 4 — Shared Client/web schedule foundation

### Goal
Build one reusable schedule/calendar component system.

### Recommended new files
- `Client/web/src/components/schedule/ScheduleCalendar.tsx`
- `Client/web/src/components/schedule/ScheduleEventDrawer.tsx`
- `Client/web/src/components/schedule/ScheduleFilters.tsx`
- `Client/web/src/components/schedule/ScheduleAgenda.tsx`
- `Client/web/src/components/schedule/scheduleAdapters.ts`
- `Client/web/src/components/schedule/scheduleTypes.ts`

### Suggested component responsibilities

#### `ScheduleCalendar.tsx`
- renders day/week calendar using normalized schedule events
- role-independent visual shell
- supports event click selection
- supports status color mapping

#### `ScheduleAgenda.tsx`
- renders same-day or selected-range agenda list
- useful for mobile-width responsiveness and detailed reading

#### `ScheduleEventDrawer.tsx`
- opens event details
- shows:
  - title
  - date/time
  - location
  - patient/clinician info
  - status
  - allowed actions
  - visit summary panel where relevant

#### `ScheduleFilters.tsx`
- view toggle: day / week / agenda
- patient selector where relevant
- status filters
- optional type filters (visits / tasks / availability)

#### `scheduleAdapters.ts`
- maps server schedule events or raw visit API rows into the event format required by the calendar component
- computes delayed display state if done client-side

### Styling guidance
Add dedicated CSS files instead of continuing to grow dashboard CSS files uncontrollably.

---

## Phase 5 — Patient schedule integration

### Goal
Replace the patient’s list-only schedule experience with a polished calendar-aware experience.

### Existing patient areas to modify
- `Client/web/src/pages/patient/PatientDashboard.tsx`

### Specific current areas to audit before editing
- `OverviewTab` — compact summary cards
- `UpcomingVisits()` — list-based scheduling view
- care-team availability snippets in overview
- request/reschedule/cancel behavior already embedded in the page

### Recommended implementation direction

#### Replace or refactor `UpcomingVisits()`
Turn it into a container that uses the shared schedule components.

Instead of directly rendering only cards, it should:
- fetch normalized schedule data
- render a day/week calendar and agenda toggle
- still expose:
  - confirm visit
  - cancel visit
  - request reschedule
  - request new visit

#### Keep existing visit actions
Reuse existing API calls already used in the current component:
- `updateVisitStatus(...)`
- `submitRescheduleRequest(...)`
- `createVisitRequest(...)`

### Specific UI requirement
Patient schedule must feel like a polished portal experience, not only an internal ops screen.

Recommended visual behavior:
- default to week view
- highlight next upcoming visit
- show agenda rail for selected day
- allow easy access to reminder preferences

---

## Phase 6 — Clinician schedule and availability integration

### Goal
Unify clinician day schedule and availability submission around the same schedule model.

### Existing clinician areas to modify
- `Client/web/src/pages/clinician/ClinicianDashboard.tsx`

### Specific areas to audit before editing
- `TodaySchedule()`
- `AppointmentsHub()`

### Recommended implementation direction

#### `TodaySchedule()`
Refactor into a true day schedule view using shared schedule components.

Keep existing actions:
- check in / `IN_PROGRESS`

Potential new UI enhancements:
- time-grid by hour
- selected-event drawer
- visible gaps between visits
- clearer overdue / delayed indication

#### `AppointmentsHub()`
Do not leave this as a disconnected list + separate availability form.

Recommended end state:
- calendar-style upcoming appointment view
- adjacent availability block editor or availability calendar overlay
- submitted availability history remains accessible below or in a side panel

### Important instruction
Do not remove working availability submission behavior. Wrap it in a better UX rather than replacing it with untested mechanics.

---

## Phase 7 — Caregiver schedule integration

### Goal
Give caregivers a true day/week patient schedule experience without breaking multi-patient context.

### Existing caregiver areas to modify
- `Client/web/src/pages/caregiver/CaregiverDashboard.tsx`

### Specific areas to audit before editing
- `HomeOverview()`
- `CaregiverSchedule()`
- patient-switching logic already built into caregiver flows

### Recommended implementation direction

#### `CaregiverSchedule()`
Refactor to use the shared schedule/calendar components.

Key requirements:
- preserve patient switching
- preserve confirm/cancel/reschedule actions
- show only selected patient’s schedule unless explicitly in all-patients mode
- optionally support an “all linked patients” agenda mode if visually manageable

### Important schedule-linked task rule
Calendarize visit-linked prep tasks if they help the caregiver prepare for scheduled visits.
Do not clutter the time-grid with non-time-bound HEP items.

---

## Phase 8 — Admin schedule operations integration

### Goal
Add calendar context to admin operational scheduling instead of leaving everything in tables.

### Existing admin areas to modify
- `Client/web/src/pages/admin/AdminDashboard.tsx`

### Specific areas to audit before editing
- `AppointmentsReview()`
- `AvailabilityReview()`

### Recommended implementation direction

#### `AppointmentsReview()`
Keep queue tables for detail-heavy admin review, but add one of:
- a schedule calendar above the queue
- or a right-side calendar/time visualization linked to selected request rows

#### `AvailabilityReview()`
Keep review actions, but add calendar/time-block context for clinician availability.

### Important instruction
Admin does not need a consumer-style schedule view only; it needs an **operational schedule review** view.

That means the admin schedule UI should emphasize:
- reviewability
- capacity visibility
- request timing conflicts
- availability windows

---

## Phase 9 — Visual polish, accessibility, timezone consistency, and performance

### Goal
Make the schedule feature demo-ready.

### Required polish areas

#### 9.1 Accessibility
- keyboard-accessible event selection
- adequate contrast for status colors
- clear labels for selected day / selected event / status
- no schedule actions hidden behind icon-only interactions without labels

#### 9.2 Timezone handling
The feature owner must audit all date/time transformations already present in:
- `Client/web/src/api/visits.ts`
- patient dashboard local datetime conversion helpers
- clinician dashboard local datetime conversion helpers
- caregiver dashboard local datetime conversion helpers
- server availability gating and scheduling logic

### Important instruction
Do not invent new inconsistent date-time conversion helpers across dashboards.

If needed, create a shared utility file for:
- local `datetime-local` to ISO conversion
- display formatting
- schedule sorting and grouping

Suggested new shared utility:
- `Client/web/src/utils/datetime.ts`

#### 9.3 Performance
- keep date-range fetches bounded
- do not request the entire visit history for every calendar render if unnecessary
- use `from` / `to` filters intentionally
- avoid N+1 fetch patterns for prep tasks where possible

---

## 10. Testing plan

Feature 2 must include both automated and browser/manual testing.

---

## 10.1 Server automated testing

### Recommended new tests

#### File: `Server/src/__tests__/feature2.schedule.test.ts`
Cover:
- role-scoped schedule fetch for patient / caregiver / clinician / admin
- schedule event range filtering with `from` / `to`
- inclusion/exclusion of availability blocks by role
- inclusion/exclusion of prep-task-derived schedule items
- computed delayed-state behavior if implemented server-side

#### File: `Server/src/__tests__/feature2.notifications.test.ts`
Cover:
- visit request notification generation
- visit approval notification generation
- visit denial notification generation
- visit cancellation notification generation
- linked caregiver notification fan-out

#### File: `Server/src/__tests__/feature2.reminders.test.ts`
Cover:
- 24h and 1h reminder enqueue logic
- duplicate reminder prevention
- reminder preference filtering
- pending outbound job creation
- reminder cancellation after visit cancellation/reschedule

### Existing testing references to review
- `Server/src/__tests__/apiTestClient.ts`
- `Server/src/__tests__/feature4.documentationGating.test.ts`
- `Server/src/__tests__/feature4.prepTasks.test.ts`

### Important note
There are already visit-related tests elsewhere in the repo. The Feature 2 owner must audit them first so they extend coverage instead of duplicating it.

---

## 10.2 Server smoke script

### Recommended new script
Create:
- `Server/src/scripts/smokeFeature2Schedule.ts`

### Suggested smoke coverage
1. create or identify a test visit in a bounded date range
2. fetch `/api/visits` and/or `/api/schedule`
3. confirm role-based visibility for patient / clinician / caregiver / admin
4. update reminder preferences
5. trigger a cancellation / reschedule flow
6. verify notifications created
7. verify reminder jobs are cancelled appropriately when visit state changes

### Package script
Update `Server/package.json` with something like:
- `smoke:feature2:schedule`

---

## 10.3 Browser/manual validation plan

If browser tools are available to the implementing agent, validate these end-to-end.

### Environment
- backend: `npm run dev --prefix Server`
- web: `npm run dev --prefix Client/web`

### Browser validation matrix

#### Flow A — Patient calendar experience
1. sign in as patient
2. open patient visits tab
3. verify week view calendar renders
4. verify visit events display with correct time, title, and status colors
5. click a scheduled visit
6. verify detail drawer shows visit data and allowed actions
7. confirm a scheduled visit if allowed
8. cancel a visit with required reason
9. request reschedule from the selected event
10. verify reminder preferences are reachable and save correctly

#### Flow B — Caregiver calendar experience
1. sign in as caregiver linked to at least one patient
2. open schedule tab
3. switch between patients if multiple exist
4. verify only selected patient’s visits appear
5. verify role-allowed actions function correctly
6. verify no unrelated patient data appears

#### Flow C — Clinician calendar experience
1. sign in as clinician
2. open today schedule
3. verify day/time grid renders visits in chronological slots
4. check in from selected event
5. open appointments/availability area
6. verify availability blocks align with calendar context
7. submit availability and verify it appears in the correct operational context

#### Flow D — Admin appointment operations
1. sign in as admin
2. open appointment requests
3. verify request queue and schedule context both render
4. approve/schedule with datetime override
5. reject a request with note
6. verify updated visit leaves queue when appropriate

#### Flow E — Admin availability operations
1. open availability review
2. verify availability blocks are visible in operational schedule context
3. approve and reject submissions
4. verify counts and filtered views remain consistent

#### Flow F — Notifications / reminders
1. create or update a visit that should produce a notification
2. verify NotificationBell count updates after polling window
3. open NotificationCenter
4. verify reminder preferences save
5. verify created notifications appear with correct icon/title/body metadata

### Browser-tool evidence the owner should capture
- patient week calendar screenshot
- caregiver patient-switch calendar screenshot
- clinician day grid screenshot
- admin request review with schedule context screenshot
- notification center preferences screenshot

---

## 11. Definition of done for Feature 2

Feature 2 is done only when all of the following are true.

### Product criteria
- patient, caregiver, clinician, and admin all have a more polished schedule experience than today
- day/week and/or agenda calendar view exists where appropriate
- visits show clear status distinctions
- schedule actions are available from schedule-aware UI
- reminder preferences are integrated into the schedule experience

### Server criteria
- schedule data can be fetched cleanly and role-safely
- notification generation continues to work for visit lifecycle changes
- reminder job logic remains intact
- no role-scoping regressions are introduced

### Web criteria
- shared schedule component system exists
- role dashboards consume shared calendar logic instead of custom one-off renderers
- schedule UI is visually polished and accessible
- date/time formatting is consistent across roles

### Testing criteria
- new server tests added and passing
- smoke script added and runnable
- browser/manual validation completed for patient, caregiver, clinician, and admin schedule flows

---

## 12. Implementation cautions and anti-patterns

### Do not:
- build separate calendar implementations inside each dashboard file
- duplicate visit role-scoping logic on the client if the server already owns it
- force HEP into timed calendar events without actual due-time semantics
- introduce a delayed database status unless product explicitly wants it
- replace working reminder logic with a new system in parallel
- leave admin as tables-only if the sprint goal includes schedule polish and calendar context
- continue growing dashboard mega-files without extracting shared schedule components

### Do instead:
- centralize schedule event normalization
- centralize calendar rendering
- keep role-specific behavior in adapters and action policies
- reuse existing visit + availability + notification backends whenever possible

---

## 13. Suggested task order for the Feature 2 owner

If another AI agent or engineer owns this feature, they should work in this order:

1. **Audit current schedule, availability, notification, and task flows**
2. **Decide on schedule event model and calendar dependency**
3. **Implement server schedule aggregation / normalization layer**
4. **Implement shared Client/web schedule component system**
5. **Integrate patient schedule**
6. **Integrate clinician schedule + availability**
7. **Integrate caregiver schedule**
8. **Integrate admin operational schedule views**
9. **Polish notifications, preferences, accessibility, and timezone handling**
10. **Add tests and run browser/manual validation**

This order matters. Do not start by redesigning all four dashboards independently.

---

## 14. Final recommendation to the implementing agent

Feature 2 should be treated as a **schedule system unification + UX elevation effort**.

The current repo already has the hard parts of the domain:
- visit lifecycle logic
- availability rules
- reminders
- notifications
- role-based scoping

What it lacks is a **cohesive, polished calendar-grade web experience**.

The owner’s real job is to:
1. audit what already exists,
2. normalize schedule data once,
3. build a reusable schedule component system,
4. connect notifications/reminders to that experience,
5. and leave the repo with one clear scheduling story across patient, caregiver, clinician, and admin roles.
