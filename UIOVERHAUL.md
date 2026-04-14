# PatientConnect360 UI Overhaul Plan

## 1. Mandate

This document defines a UI-only overhaul for PatientConnect360.

Non-negotiable constraints:

- Do not change business logic, API contracts, route protection, data fetching, validation, permissions, or workflow rules.
- Preserve every existing feature, page, tab destination, button, and action.
- Rework presentation, layout, navigation chrome, spacing, typography, component styling, and responsive behavior only.
- Use the current application state and handlers as-is during the first rollout. In practical terms, the new sidebar should initially drive the same existing `activeTab` values already used by each dashboard.
- Keep privacy-sensitive and compliance-sensitive items obvious and easy to reach: `Records`, `Safety`, `Access`, `Care records`, `Appointments`, `Availability`, and `Audit Log`.

The goal is not to rebuild the product. The goal is to make the current product feel coherent, modern, scalable, and usable on real devices without sacrificing any capability.

## 2. Product Surface To Preserve

Current app surfaces that must remain functionally intact:

- Public/shared: `/`, `/login`, `/register`, `/register/clinician`, `/register/caregiver`, `/verify-email`, `/forgot-password`
- Admin: `/admin/login`, `/admin/signup`, `/admin/dashboard`, `/admin/invitations`
- Clinician: `/clinician/login`, `/clinician/dashboard`
- Patient: `/patient/dashboard`
- Caregiver: `/caregiver/dashboard`

Primary role dashboards currently rely on single-route, local tab state patterns and must keep their existing actions intact during the UI refresh:

- Patient dashboard: 9 top-level tabs
- Clinician dashboard: 8 top-level tabs
- Caregiver dashboard: 12 top-level tabs
- Admin dashboard: 13 top-level tabs

## 3. Audit Summary

### 3.1 Cross-app diagnosis

The current UI has grown feature-by-feature instead of system-by-system. The result is a product that works functionally but feels fragmented visually and operationally.

Core issues:

- Navigation is overloaded. Each role dashboard uses a large horizontal top bar with too many peer tabs competing for attention.
- The app lacks a shared shell. Each dashboard recreates its own header, nav, user badge, and logout controls instead of using one consistent layout system.
- Typography is weak and generic. The app still defaults to a system stack in `Client/web/src/index.css`, which makes the interface feel unfinished and inconsistent with a premium healthcare product.
- Visual hierarchy is flat. Many screens rely on similar white cards, shallow shadows, and repeated section headers with little variation in emphasis.
- Spacing is inconsistent. Some panels feel cramped while others waste space, especially in dashboards with large cards, nested containers, and uneven padding.
- Responsive behavior is mostly fallback behavior, not intentional behavior. Many layouts simply wrap, clip, scroll horizontally, or collapse too late.
- Public and app experiences feel like different products. The homepage/auth pages use one visual language, while each dashboard uses a different role-colored header bar.
- Component styling is inconsistent. Shared patterns such as messages, alerts, tables, drawers, pills, badges, and forms are implemented differently in different roles.

### 3.2 Evidence snapshot

Representative UI issues visible in the current codebase:

- Homepage mobile nav removes links entirely at small widths with no replacement: `Client/web/src/pages/Homepage.css:469`
- Patient messaging uses a rigid 3-column layout: `Client/web/src/pages/patient/PatientDashboard.css:959`
- Patient inbox rows use fixed metadata columns: `Client/web/src/pages/patient/PatientDashboard.css:1575`
- Clinician care records header forces a `430px` select width: `Client/web/src/pages/clinician/ClinicianDashboard.css:168`
- Clinician communication uses another rigid 3-column layout: `Client/web/src/pages/clinician/ClinicianDashboard.css:839`
- Admin messaging forces horizontal scroll with `min-width: 800px`: `Client/web/src/pages/admin/AdminDashboard.css:2332`
- Caregiver multi-patient overview cards use a large `minmax(350px, 1fr)` floor: `Client/web/src/pages/caregiver/CaregiverDashboard.css:1565`
- Notification dropdown uses a fixed `380px` width in the header: `Client/web/src/components/NotificationBell.css:46`
- Schedule drawer uses a `340px` width floor: `Client/web/src/components/schedule/ScheduleEventDrawer.css:15`
- HEP and worklist tabs still contain fixed inline side-column widths inside TSX files, which is a strong sign the responsive system is not centralized.

### 3.3 Navigation and information architecture flaws

The biggest structural UX problem is not missing functionality. It is that too much detail has been promoted into top-level navigation.

Current top-level tab counts:

- Patient: `Overview`, `Visits`, `Medications`, `Health`, `Records`, `Messages`, `Family`, `Exercises & Tasks`, `Notifications`
- Clinician: `Today's Schedule`, `Patients`, `Care records`, `Messages`, `Tasks`, `Appointments`, `Contact Staff`, `Notifications`
- Caregiver: `Home`, `Schedule`, `Medications`, `Progress`, `Records`, `Alerts`, `Access`, `Safety`, `Feedback`, `Messages`, `Exercises & Tasks`, `Notifications`
- Admin: `Overview`, `Users`, `Invitations`, `Assign Patients`, `Availability`, `Appointments`, `Messages`, `Reports`, `Settings`, `Audit Log`, `Family Feedback`, `Patient records`, `Notifications`

Why this is failing:

- Wide top bars force users to scan too many items at once.
- Several tabs are workflow siblings and should live under one broader sidebar group.
- Notifications, alerts, messages, contact flows, and access/governance flows are separated more than they need to be.
- Overview/home surfaces duplicate data already visible elsewhere, which increases visual noise instead of reducing it.

### 3.4 Typography, color, and spacing flaws

- System-font default weakens trust and polish.
- Dashboard headers rely heavily on large gradients, which makes the product feel louder without actually improving hierarchy.
- Role dashboards use different dominant colors in ways that make the app feel inconsistent rather than intentionally branded.
- Card styling is generic and repetitive; too many surfaces are simple rounded white boxes with low-contrast shadows.
- Some legacy accent patterns still rely on colored left borders, which visually date the product.
- Copy hierarchy is too shallow. Heading scales, labels, helper text, badges, and section intros are often too close in weight and size.
- Spacing rhythm is inconsistent between sections, forms, cards, and message layouts.

### 3.5 Responsive and scaling flaws

- Headers are desktop-first and only partially collapse at phone widths.
- Messaging surfaces use fixed sidebars and late breakpoints.
- Admin tables rely on horizontal scrolling rather than mobile-friendly restructuring.
- Auth pages use tall centered shells and nested scrolling that will feel awkward on short viewports and mobile keyboards.
- Popovers, drawers, and modal surfaces still use fixed width assumptions.
- Mobile behavior often hides content, wraps controls awkwardly, or turns the page into a scroll maze instead of simplifying the task.

### 3.6 Interaction flaws

- The same task type behaves differently across roles.
- Notifications, alerts, and messages are fragmented instead of connected through one communication model.
- Message centers are dense and desktop-oriented.
- The current top-bar pattern makes switching between work areas feel cumbersome, especially on tablets.
- Large dashboards lack a clear left-to-right reading structure and often present too many equal-weight sections at once.

## 4. New UI Direction

### 4.1 Experience goal

PatientConnect360 should feel like a calm, modern care coordination workspace rather than a collection of large tabbed pages.

Target feeling:

- trustworthy
- clinically clear
- patient-friendly
- responsive without feeling stripped down
- operationally efficient for staff

### 4.2 Visual direction

- Default to a light theme optimized for anxious or time-constrained healthcare users.
- Replace the current heavy gradient header bars with a quiet application shell built from soft tinted neutrals, white content surfaces, and restrained brand accents.
- Use the agency brand as the accent system, but normalize it through a token set so the product still feels cohesive when branding changes.
- Introduce stronger type hierarchy and cleaner spacing rather than more decoration.
- Use role accents sparingly in chips, status labels, and small markers, not as a full-screen theme change per dashboard.

### 4.3 Proposed type system

- UI/body font: `Manrope`
- Display/marketing headline font: `Source Serif 4`
- Product UI uses fixed rem-based sizing, not fluid dashboard typography.
- Marketing and auth pages can use restrained fluid scaling for hero and section headings.

### 4.4 Proposed design tokens

Introduce a shared token layer before any screen redesign:

- Color tokens: `--bg-app`, `--bg-surface`, `--bg-muted`, `--border-subtle`, `--text-strong`, `--text-muted`, `--brand-primary`, `--brand-primary-soft`, `--success`, `--warning`, `--danger`, `--info`
- Space tokens: `4, 8, 12, 16, 24, 32, 48, 64, 96`
- Radius tokens: `10, 14, 18, 24`
- Shadow tokens: low, medium, overlay
- Motion tokens: fast, standard, reduced-motion fallback

## 5. Target Shell And Navigation Model

### 5.1 Shared application shell

Replace every role-specific top bar with one reusable shell:

- Desktop: persistent left sidebar + slim utility header + content viewport
- Tablet: collapsible icon rail + flyout labels + same utility header
- Mobile: left drawer sidebar triggered from the page header; content becomes single-column by default

Utility header content should reuse existing functionality only:

- page title / current section label
- notification bell
- user name and role badge
- logout

No new product logic is required for this shell. In the first version, sidebar clicks simply call the same current tab-change handlers.

### 5.2 Sidebar grouping by role

#### Patient

Top-level sidebar groups:

- `Home`
  - `Overview`
- `Care`
  - `Visits`
  - `Medications`
  - `Health`
  - `Records`
  - `Exercises & Tasks`
- `Communication`
  - `Messages`
  - `Notifications`
- `Family & Access`
  - `Family`

Important rule: `Records` must remain explicit and easy to reach because privacy consent and re-consent flows depend on it.

#### Clinician

Top-level sidebar groups:

- `Clinical Work`
  - `Today's Schedule`
  - `Patients`
  - `Care records`
  - `Tasks`
- `Coordination`
  - `Appointments`
  - `Messages`
  - `Contact Staff`
  - `Notifications`

Important rule: `Care records` stays visually prominent and should still support a full-width workspace mode.

#### Caregiver

Top-level sidebar groups:

- `Overview`
  - `Home`
- `Patient Care`
  - `Schedule`
  - `Medications`
  - `Progress`
  - `Records`
  - `Exercises & Tasks`
- `Communication & Alerts`
  - `Messages`
  - `Alerts`
  - `Notifications`
  - `Safety`
- `Access & Feedback`
  - `Access`
  - `Feedback`

Important rule: `Safety` must remain clearly labeled as a high-urgency area and must never be visually buried under a generic notification label.

#### Admin

Top-level sidebar groups:

- `Dashboard`
  - `Overview`
- `People & Access`
  - `Users`
  - `Invitations`
  - `Assign Patients`
- `Operations`
  - `Availability`
  - `Appointments`
  - `Messages`
  - `Notifications`
- `Clinical Oversight`
  - `Patient records`
  - `Family Feedback`
- `Governance & Insights`
  - `Reports`
  - `Audit Log`
  - `Settings`

Important rule: `Audit Log` must remain highly visible because it is a compliance destination, not a buried settings subpanel.

## 6. Page-Level UX Rules

### 6.1 Dashboard landing pages

`Overview` and `Home` views should become true summary pages:

- one primary status strip
- 2-4 high-value modules only
- direct entry points into deeper sections
- fewer duplicated cards
- stronger visual ranking between urgent items, next actions, and reference information

### 6.2 Messaging surfaces

Use one responsive messaging pattern across roles:

- Desktop: master-detail layout with collapsible filter rail
- Tablet: list + detail with optional slide-over filters
- Mobile: list view -> thread view, full width, no fixed sidebars
- Preserve all existing message actions, folders, compose flows, unread states, and filters

### 6.3 Tables and review queues

Admin and operational tables should adapt instead of merely overflow:

- Desktop: true table layout
- Tablet: compact table with sticky key columns only where necessary
- Mobile: card/list row transformation with key metadata stacked vertically
- Keep all current action buttons available in-row or inside the row footer, never hidden behind missing logic

### 6.4 Records and documentation surfaces

- Keep care plans, documents, privacy controls, prep tasks, and HEP flows intact
- Replace rigid multi-column layouts with adaptive panels
- Turn secondary context into collapsible sections on smaller screens
- Keep critical consent, compliance, and completion actions above the fold

### 6.5 Auth and public pages

- Homepage gets a cleaner public narrative, calmer typography, clearer CTAs, and a real mobile navigation pattern
- Login/signup/forgot/verify pages become form-first and mobile-friendly, with less ornamental framing and more readable field spacing
- Preserve every current role entry point and registration path

## 7. Responsive System

### 7.1 Breakpoints

Use content-driven adaptation around these targets:

- Mobile: `320-767px`
- Tablet: `768-1023px`
- Desktop: `1024px+`
- Wide desktop: `1440px+`

### 7.2 Responsive rules

- Minimum tap target: `44x44px`
- One primary content column on phones
- Sidebar becomes drawer on phones and compact rail on tablets
- Avoid fixed content sidebars below desktop unless the panel is collapsible
- Replace `min-width` table assumptions with stacked layouts or progressive disclosure
- Convert fixed-width inline TSX panels into CSS classes with breakpoint behavior
- Eliminate horizontal scrolling for standard workflows; only truly dense data review should allow controlled overflow

### 7.3 Component adaptation rules

- Message centers: stack, do not squeeze
- Filters: become chips, drawers, or collapsible rows on smaller screens
- Forms: single-column below tablet
- KPI cards: compress density before stacking
- Calendars/schedules: agenda-first on small screens, full calendar only where it remains legible
- Drawers and popovers: use viewport-aware width and height caps

## 8. Phased Delivery Plan

### Phase 0 - Audit Freeze And Parity Baseline

Purpose: lock the functional surface before visual work starts.

Actions:

- Capture a route inventory and dashboard tab inventory
- Create a button/action parity checklist for every role dashboard and public/auth flow
- Screenshot current states at desktop, tablet, and mobile widths
- Record critical workflows that cannot regress: login, signup, notifications, messaging, visit review, records/privacy, HEP, audit, availability, appointments

Deliverables:

- feature parity matrix
- screen inventory
- regression checklist

### Phase 1 - Design Foundations

Purpose: create one visual system before touching page layouts.

Actions:

- Add shared design tokens and semantic color roles
- Introduce typography scale, spacing scale, and elevation system
- Create shared primitives for page headers, cards, pills, form fields, filter bars, drawers, and empty states
- Normalize focus states, hover states, and disabled states

Deliverables:

- foundational token layer
- reusable UI primitives
- documented spacing and type rules

### Phase 2 - Shared App Shell And Sidebar

Purpose: replace the repeated top-bar pattern without changing page logic.

Actions:

- Build a reusable `DashboardShell`
- Build a reusable `SidebarNav` with grouped destinations
- Move user badge, notification bell, and logout into one shared utility header
- Wire sidebar destinations to the existing dashboard tab state values
- Add tablet rail and mobile drawer behavior

Deliverables:

- shared dashboard chrome across patient, caregiver, clinician, and admin
- top-level navigation reduced to grouped sidebar structure

### Phase 3 - Public And Auth Refresh

Purpose: make first impressions consistent with the new product shell.

Actions:

- Redesign homepage using the new typography, spacing, and color system
- Replace hidden mobile nav with a real mobile drawer/menu
- Rework login, signup, forgot password, and verify email layouts around smaller screens first
- Keep all current links, role entry points, and actions intact

Deliverables:

- refreshed public site
- refreshed auth system UI
- improved mobile form usability

### Phase 4 - Patient And Caregiver Dashboard Overhaul

Purpose: simplify family-facing workflows without removing any capability.

Actions:

- Apply new sidebar grouping for patient and caregiver roles
- Convert overview/home pages into cleaner landing dashboards
- Rebuild records, messaging, alerts, and exercise/task layouts using adaptive sections
- Preserve privacy consent, caregiver access, safety, and notifications as explicit destinations
- Standardize patient selector behavior and placement in caregiver views

Deliverables:

- simplified patient navigation
- simplified caregiver navigation
- unified family-facing care workspace

### Phase 5 - Clinician And Admin Dashboard Overhaul

Purpose: improve dense operational workflows while protecting high-risk actions.

Actions:

- Apply grouped sidebar model for clinician and admin roles
- Keep `Care records`, `Appointments`, `Availability`, and `Audit Log` visually prominent
- Convert rigid review queues and wide tables into adaptive list/table hybrids
- Rework messaging, contact, oversight, and reporting sections around consistent section shells
- Keep admin operational buttons exactly available, but reorganized visually

Deliverables:

- unified staff-facing shell
- more readable operational queues
- responsive admin oversight surfaces

### Phase 6 - Shared Complex Surface Harmonization

Purpose: fix the screens most likely to break on real devices.

Actions:

- Standardize message center layout across roles
- Standardize notification center layout across roles
- Refactor schedule/calendar surfaces to support smaller screens better
- Replace inline fixed-width TSX side panels in HEP/worklist/prep flows with shared layout classes
- Normalize drawers, modals, and panel widths

Deliverables:

- consistent high-complexity patterns
- fewer one-off layout hacks
- reduced overflow and internal scroll traps

### Phase 7 - QA, Accessibility, And Rollout

Purpose: verify that the product is visually improved without functional loss.

Actions:

- Run viewport QA at `320`, `375`, `768`, `1024`, `1280`, and `1440`
- Validate keyboard navigation, focus visibility, and drawer/sidebar accessibility
- Run parity checks against the Phase 0 button/action inventory
- Do screenshot comparison against current and redesigned states
- Test role-critical journeys end-to-end

Deliverables:

- release readiness report
- accessibility regression checklist
- feature parity signoff

## 9. Transition Strategy

This overhaul should be delivered as a presentation-layer migration, not a logic rewrite.

Recommended transition path:

- First wrap existing dashboard content inside the new shell without changing data logic
- Keep current tab state and render branches in place during the first pass
- Replace top-nav buttons with sidebar items that call the same tab handlers
- Move repeated header UI into shared shell components
- Refactor layout CSS around the current content before splitting components further
- Only consider deeper structural refactors after UI parity is complete and verified

Important implementation note:

- Route restructuring, nested dashboard routes, or major component decomposition may be valuable later, but they are not required for the initial UI-only overhaul and should not block the first redesign pass.

## 10. Post-Rollout Refactor Opportunities

These are refactoring opportunities to consider only after the visual rollout is stable. They are not part of the UI-only spec and must remain separate from the first overhaul scope.

Potential follow-up work:

- breaking the 2k+ line dashboard files into smaller view modules
- extracting shared dashboard shell pieces into reusable components
- consolidating repeated message and panel patterns
- reducing inline style usage in HEP, worklist, and record-editing surfaces
- evaluating route-based subpages later if parity has already been proven

None of the above should be bundled into the first redesign if it risks changing behavior.

## 11. Acceptance Criteria

The overhaul is successful only if all of the following are true:

- No existing route, tab destination, feature, or button is removed.
- No business logic, validation rule, permission rule, API contract, request shape, or state shape is changed as part of the UI rollout.
- Sidebar navigation replaces the current top-bar clutter for dashboard roles while preserving direct access to current destinations.
- Homepage and auth flows are fully usable on phones without missing navigation, missing buttons, or nested scroll traps.
- Each dashboard is usable at `320`, `375`, `768`, `1024`, `1280`, and `1440` widths without clipped primary actions or mandatory horizontal overflow for standard workflows.
- Messaging, records, alerts, and operational review surfaces adapt cleanly across mobile, tablet, and desktop.
- Patient privacy consent flows, caregiver visibility controls, and admin audit surfaces remain explicit, prominent, and functionally unchanged.
- High-risk destinations such as `Records`, `Safety`, `Access`, `Care records`, `Appointments`, `Availability`, and `Audit Log` are not made harder to find than they are today.
- Every existing page keeps its current actions, even if the layout, grouping, and styling change.
- The app feels like one coherent product rather than separate role-specific mini apps.

## 12. Out Of Scope For This Plan

These items are intentionally excluded from the first overhaul pass:

- backend changes
- authorization model changes
- route security changes
- data model changes
- workflow changes
- new product capabilities that require fresh business logic

This plan is intentionally strict: preserve the product, replace the experience.
