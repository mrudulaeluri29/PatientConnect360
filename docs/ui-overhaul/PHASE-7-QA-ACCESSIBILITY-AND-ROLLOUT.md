# Phase 7 - QA, Accessibility, And Rollout

## Purpose

Verify that the UI overhaul ships without functional loss.

Phase 7 is the proof phase: the redesign is only successful if routes, destinations, permissions, actions, and high-risk workflows still behave exactly as before while the presentation layer improves.

## Non-Negotiables

- no missing route, tab destination, button, or primary action
- no logic/API/permission/state-shape changes hidden inside the redesign
- no inaccessible sidebar, drawer, dialog, or high-risk control
- no required workflow blocked by mobile layout or horizontal overflow
- no compliance-sensitive destination made less discoverable

## QA Scope

### Routes

Validate all current frontend routes in `Client/web/src/App.tsx`:

- `/`
- `/login`
- `/register`
- `/register/clinician`
- `/register/caregiver`
- `/verify-email`
- `/forgot-password`
- `/admin/login`
- `/admin/signup`
- `/admin/dashboard`
- `/admin/invitations`
- `/clinician/login`
- `/clinician/dashboard`
- `/patient/dashboard`
- `/caregiver/dashboard`
- `/dashboard`

### Dashboard Destinations

Validate every current tab destination for:

- patient
- clinician
- caregiver
- admin

using the current `activeTab` inventories already defined in the role dashboard files.

### High-Risk Surface Families

- auth and onboarding
- notifications
- messaging
- records and privacy/consent
- schedule/calendar and event drawer flows
- availability and appointment review flows
- safety and access flows
- audit and oversight flows

## Viewport Matrix

Run a required pass at:

- `320`
- `375`
- `768`
- `1024`
- `1280`
- `1440`

Recommended device/browser coverage:

- Chrome on Windows
- Edge on Windows
- Safari on iPhone/iPad
- Chrome on Android
- Firefox smoke pass for core flows

## Accessibility Checklist

### Keyboard

- every route and dashboard shell is keyboard navigable
- sidebar/drawer can be opened, navigated, and closed by keyboard
- dialogs and drawers trap focus correctly and restore focus on close
- no dead-end or invisible focus state exists

### Semantics And Labels

- `nav`, `main`, `header`, and `form` landmarks are present where expected
- icon-only controls have accessible names
- active nav items use `aria-current` or equivalent
- dialogs use proper dialog semantics and announced titles

### Visual Accessibility

- text and controls meet contrast requirements
- status, unread, warning, and error states do not rely on color alone
- touch targets meet the minimum size requirement
- 200% zoom and larger-text scenarios still work
- reduced motion is respected

### High-Risk Destinations

Confirm visibility and accessibility of:

- `Records`
- `Safety`
- `Access`
- `Care records`
- `Appointments`
- `Availability`
- `Audit Log`

## Parity Verification Approach

Build a parity matrix with columns for:

- route or dashboard tab
- role
- surface
- action
- before state
- after state
- pass/fail
- evidence link
- owner

Every row must prove parity for:

- navigation access
- primary actions
- secondary actions
- supporting feedback states
- modal/drawer access where relevant

Treat these as parity-critical:

- notification to message deep-link behavior
- privacy re-consent gating
- caregiver access linking flows
- safety shortcuts
- schedule drawer actions
- records editor actions
- availability and appointment review actions
- audit filters and visibility

## Screenshot And Regression Strategy

Create before/after evidence at desktop, tablet, and mobile for:

- homepage
- login
- signup
- forgot password
- verify email
- each dashboard landing view
- message center states
- notification dropdown and full center
- records blocked state, read state, and edit state
- schedule/event drawer states
- admin audit and review queues

Recommended evidence types:

- full-page screenshots for public/auth and dashboard shells
- component-state captures for overlays, dropdowns, thread views, and blocked states
- approved-diff log for intentional visual changes

## Rollout Strategy

### Stage 1 - Internal QA Build

- feature-complete UI build
- block all non-critical visual churn
- run full parity, viewport, and accessibility pass

### Stage 2 - Role-Owner Validation

Have one stakeholder execute scripted journeys for:

- patient/family
- clinician
- caregiver
- admin/operations

### Stage 3 - Controlled Release

- ship behind a UI flag if possible
- monitor auth failures, navigation confusion, notification complaints, scheduling issues, and records/privacy issues
- keep rollback criteria documented and explicit

### Stage 4 - Full Release

- publish only after parity matrix, a11y checklist, and stakeholder signoff are complete
- communicate clearly that the change is UI-only, not a workflow change

## Skills To Use

- `audit` - primary release-readiness skill for responsive, accessibility, and theming verification
- `adapt` - validate breakpoints and cross-device behavior
- `critique` - catch UX issues that pass technical QA but still feel confusing
- `polish` - final pass after blockers are closed
- `distill` - compress findings into clear release and stakeholder artifacts
- `clarify` - improve support docs, rollout notes, and user-facing labels discovered during QA

## Required Artifacts

- release readiness report
- feature parity matrix
- accessibility regression checklist
- viewport QA matrix
- screenshot pack and approved-diff log
- critical journey scripts
- rollout runbook
- stakeholder signoff sheet

## Signoff Criteria

Release is approved only when:

- all current routes are reachable and correctly protected
- all current dashboard destinations remain reachable
- all critical journeys pass at required viewport widths
- there are no P0/P1 accessibility blockers
- there are no missing actions on public, auth, dashboard, notification, messaging, records, schedule, or audit surfaces
- visual regressions are reviewed and accepted
- product, design, and role stakeholders sign off

## Risks And Dependencies

- QA only works if earlier phases preserved logic/state contracts as intended
- screenshot automation may need to be added because the current frontend stack has no visual regression setup
- large dashboard files and shared surfaces increase the chance of parity misses without a formal matrix
- rollout communication must translate old top-nav guidance into the new sidebar language

## Exit Criteria

Phase 7 is complete when:

- the redesign is proven route-safe, parity-safe, responsive, and accessible
- release artifacts exist and are reviewed
- stakeholders have signed off
- the team can ship the new UI with confidence that the product behavior has not changed
