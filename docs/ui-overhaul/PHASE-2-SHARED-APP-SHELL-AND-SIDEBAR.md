# Phase 2 - Shared App Shell And Sidebar

## Purpose

Replace the repeated top-bar dashboard pattern with one shared app shell while preserving current dashboard behavior.

This phase should feel like: same dashboards, new chrome.

## Non-Negotiables

- Keep the current single-route dashboard pattern
- Keep the current `activeTab` strings and render branches
- Do not introduce nested routes as part of the first pass
- Do not change any logout, notification, privacy, or message-open logic
- Do not hide critical destinations inside ambiguous icons or overflow menus

## Main Repository Touchpoints

- `Client/web/src/App.tsx`
- `Client/web/src/pages/patient/PatientDashboard.tsx`
- `Client/web/src/pages/clinician/ClinicianDashboard.tsx`
- `Client/web/src/pages/caregiver/CaregiverDashboard.tsx`
- `Client/web/src/pages/admin/AdminDashboard.tsx`
- `Client/web/src/pages/patient/PatientDashboard.css`
- `Client/web/src/pages/clinician/ClinicianDashboard.css`
- `Client/web/src/pages/caregiver/CaregiverDashboard.css`
- `Client/web/src/pages/admin/AdminDashboard.css`
- `Client/web/src/components/NotificationBell.tsx`
- `Client/web/src/components/NotificationBell.css`
- `Client/web/src/components/admin/AdminSidebar.tsx`
- `Client/web/src/components/admin/AdminNavbar.tsx`

## Target Component Architecture

Create a shared shell package under `Client/web/src/components/dashboard-shell/`:

```text
Client/web/src/components/dashboard-shell/
  DashboardShell.tsx
  DashboardShell.css
  ShellHeader.tsx
  SidebarNav.tsx
  shellTypes.ts
  navConfig.ts
```

### `DashboardShell`

Responsibilities:

- render sidebar, utility header, and main content regions
- own presentation-only shell state such as mobile drawer open/close
- support desktop sidebar, tablet rail, and mobile drawer modes
- accept the current active item as a prop instead of owning navigation logic
- support optional `secondaryAside` and `fullWidthContent` modes for special dashboards

### `SidebarNav`

Responsibilities:

- render grouped destinations from config
- support active state, high-priority items, and compact tablet rail mode
- call the existing dashboard tab handlers using the exact current tab ids

### `ShellHeader`

Responsibilities:

- show current section title
- expose mobile menu trigger
- render `NotificationBell`
- render user name, role badge, and logout button

## Role Mapping

### Patient

- `Home`: `overview`
- `Care`: `visits`, `medications`, `health`, `records`, `exercises`
- `Communication`: `messages`, `notifications`
- `Family & Access`: `family`

Important: patient shell navigation must call `openTab(...)`, not raw `setActiveTab(...)`, so privacy consent locking still works.

### Clinician

- `Clinical Work`: `schedule`, `patients`, `care-records`, `tasks`
- `Coordination`: `appointments`, `messages`, `contact-staff`, `notifications`

Important: keep the `care-records` full-width mode and the current assistant behavior intact.

### Caregiver

- `Overview`: `home`
- `Patient Care`: `schedule`, `medications`, `progress`, `records`, `exercises`
- `Communication & Alerts`: `messages`, `alerts`, `notifications`, `safety`
- `Access & Feedback`: `access`, `feedback`

Important: preserve the current shared patient-selection state across relevant tabs.

### Admin

- `Dashboard`: `overview`
- `People & Access`: `users`, `invitations`, `assign`
- `Operations`: `availability`, `appointments`, `messages`, `notifications`
- `Clinical Oversight`: `records`, `feedback`
- `Governance & Insights`: `reports`, `audit`, `settings`

Important: keep `Audit Log`, `Availability`, `Appointments`, and `Patient records` prominent.

## Migration Plan

### Step 1 - Nav Config

Create one nav config per role where every item id exactly matches the dashboard's current `activeTab` string.

### Step 2 - Shell Skeleton

Introduce `DashboardShell` and `ShellHeader` without changing content bodies.

### Step 3 - Role Wiring

Replace each top-bar nav with the shell and route sidebar clicks into the existing tab handlers:

- patient uses `openTab`
- clinician uses `setActiveTab`
- caregiver uses `setActiveTab`
- admin uses `setActiveTab`

### Step 4 - Header Utility Migration

Move these repeated items into the shell header:

- notification bell
- user name and role badge
- logout

Keep their handlers unchanged.

### Step 5 - Layout Exceptions

Preserve dashboard-specific exceptions:

- clinician non-record tabs may still use a secondary assistant panel
- clinician `care-records` stays full-width
- patient still shows global privacy warning above content
- caregiver shared patient state remains at dashboard level
- admin keeps branding driven by `useAgencyBranding`

### Step 6 - CSS Cleanup

Once all four dashboards are on the shell:

- remove old header/nav CSS blocks from role dashboard stylesheets
- keep dashboard CSS focused on content, not global chrome
- fix the bell dropdown width so it works inside the new shared header

## Responsive Requirements

- desktop: persistent sidebar
- tablet: compact rail with labels/flyouts
- mobile: off-canvas drawer with scrim and close-on-select
- no horizontal overflow caused by the new shell
- utility header remains usable with long labels and notification state at all required widths

## Skills To Use

- `layout` - define shell proportions, header spacing, and sidebar rhythm
- `adapt` - make desktop, tablet, and mobile shell modes truly usable
- `clarify` - keep grouped navigation labels obvious and low-cognitive-load
- `polish` - normalize active states, hover states, focus states, and drawer motion
- `audit` - verify no route or destination becomes less discoverable

## Validation Checklist

- every sidebar item opens the same content as the old tab button
- patient privacy gating still blocks navigation correctly
- notification bell still deep-links to messages correctly
- caregiver internal navigation from alerts/safety still works
- admin branding still renders correctly in the new shell
- no dashboard loses a destination during top-nav removal
- desktop, tablet, and mobile shell states work at the required widths
- keyboard access and visible focus work for sidebar, drawer, bell, and logout

## Risks And Dependencies

- Phase 1 foundation must exist first
- patient nav is the highest parity risk because of `openTab`
- clinician layout is the highest shell-layout risk because of `care-records` and assistant behavior
- notification dropdown width must be fixed during shell integration
- do not revive unused admin nav/sidebar stubs as the new system

## Exit Criteria

Phase 2 is complete when:

- all four role dashboards use the same shell
- top-level top-bar clutter is gone
- grouped sidebar navigation works without changing logic
- utility header is centralized
- dashboard content remains functionally identical beneath the new chrome
