# Phase 1 - Design Foundations

## Purpose

Create one visual system before touching page layouts or navigation structure.

This phase exists to make the rest of the overhaul safe. It should introduce shared tokens, type rules, spacing rules, surface rules, and UI primitives that later phases can consume without changing any business logic.

## Non-Negotiables

- Do not change routes in `Client/web/src/App.tsx`
- Do not change dashboard `activeTab` values or render branches
- Do not change auth, OTP, notification, records, scheduling, or messaging logic
- Do not change permissions, privacy workflows, or request payloads
- Do not use this phase to redesign page IA; this is a foundation phase only

## Main Repository Touchpoints

- `Client/web/src/index.css`
- `Client/web/src/App.css`
- `Client/web/src/styles/`
- `Client/web/src/pages/Homepage.css`
- `Client/web/src/pages/Login.css`
- `Client/web/src/pages/Signup.css`
- `Client/web/src/pages/patient/PatientDashboard.css`
- `Client/web/src/pages/clinician/ClinicianDashboard.css`
- `Client/web/src/pages/caregiver/CaregiverDashboard.css`
- `Client/web/src/pages/admin/AdminDashboard.css`
- `Client/web/src/components/NotificationBell.tsx`
- `Client/web/src/components/notifications/NotificationCenter.tsx`
- `Client/web/src/components/ConsentSection.tsx`
- `Client/web/src/components/CommPreferences.tsx`
- `Client/web/src/components/FileUpload.tsx`
- `Client/web/src/components/AddressAutocomplete.tsx`

## Target File Structure

Create a shared foundation layer under `Client/web/src/styles/foundation/`:

```text
Client/web/src/styles/foundation/
  tokens.css
  typography.css
  elevation.css
  motion.css
  breakpoints.css
  focus.css
  utilities.css
  theme.css
  index.css
```

Create shared UI primitives under `Client/web/src/components/ui/`:

```text
Client/web/src/components/ui/
  Button.tsx
  Button.css
  Card.tsx
  Card.css
  Badge.tsx
  Badge.css
  Field.tsx
  Field.css
  SectionHeader.tsx
  SectionHeader.css
  EmptyState.tsx
  EmptyState.css
  FilterBar.tsx
  FilterBar.css
  ModalShell.tsx
  ModalShell.css
  DrawerShell.tsx
  DrawerShell.css
  StatusMessage.tsx
  StatusMessage.css
```

## Implementation Scope

### 1. Token Layer

Add semantic tokens for:

- app backgrounds and raised surfaces
- borders and dividers
- primary text, muted text, inverse text
- accent color and soft accent variants
- success, warning, danger, info states
- spacing scale: `4, 8, 12, 16, 24, 32, 48, 64, 96`
- radius scale: small, medium, large, extra-large
- elevation scale: low, medium, overlay
- motion timings and reduced-motion handling
- responsive breakpoints matching `UIOVERHAUL.md`

### 2. Typography System

Adopt the type model defined in `UIOVERHAUL.md`:

- UI/body font: `Manrope`
- display/public font: `Source Serif 4`
- fixed rem-based type scale for product UI
- tighter heading/body/helper/label hierarchy

Apply the typography system first in:

- global defaults in `Client/web/src/index.css`
- auth/public pages
- section titles, helper text, pills, callouts, and filter bars

### 3. Surface and Elevation Rules

Replace ad hoc white-card styling and inconsistent shadows with shared surface primitives:

- default surface
- muted surface
- raised surface
- overlay surface
- alert/callout surface

Remove decorative accent-strip patterns where they only exist for decoration.

### 4. Shared UI Primitives

Create reusable primitives for:

- buttons: primary, secondary, quiet, danger, icon-only, loading, disabled
- cards: neutral, elevated, selectable, muted
- badges/pills: status, role, selected, warning, unread
- field wrappers: label, helper, error, required, suffix/prefix
- section headers: title, helper text, actions slot
- empty states: title, copy, action row
- filter bars and chip rows
- modal and drawer shells
- status banners for info, success, warning, error

### 5. Interaction State Normalization

Standardize:

- hover
- focus-visible
- selected
- disabled
- loading
- unread
- validation error
- success confirmation

This work must be global and reusable, not role-specific.

## Workstreams

### Workstream A - Inventory And Mapping

- inventory duplicated colors, radii, shadows, and spacing across public/auth/dashboard CSS
- map those raw values into semantic tokens
- identify high-churn inline-style surfaces to migrate first

### Workstream B - Foundation CSS

- add `foundation/index.css` and import it globally
- replace the current system-stack default in `Client/web/src/index.css`
- define theme-safe CSS variable naming that can still derive from agency branding

### Workstream C - Primitive Components

- create `Button`, `Card`, `Field`, `SectionHeader`, `EmptyState`, `FilterBar`, `ModalShell`, and `DrawerShell`
- use class-driven styling, not new logic-driven abstractions
- preserve existing component APIs unless a wrapper is purely presentational

### Workstream D - Shared Component Adoption

Apply the new primitives to:

- `NotificationBell`
- `NotificationCenter`
- `ConsentSection`
- `CommPreferences`
- `FileUpload`
- `AddressAutocomplete`

### Workstream E - Low-Risk Page Adoption

Start token adoption on:

- `Homepage.css`
- `Login.css`
- `Signup.css`
- dashboard buttons, cards, modals, badges, and form controls

Do not change dashboard IA or shell structure yet.

## Skills To Use

- `audit` - inventory duplication, anti-patterns, and responsive risk before extraction
- `distill` - compress many one-off styles into a compact token set
- `typeset` - define the actual type hierarchy and font usage rules
- `layout` - establish spacing rhythm and container behavior
- `colorize` - build a restrained but stronger semantic color system
- `quieter` - tone down noisy gradients and heavy visual treatment
- `clarify` - improve hierarchy for labels, helpers, banners, and section headers
- `polish` - normalize states and micro-details after the primitives land
- `adapt` - make sure the primitives themselves are responsive before page adoption

## Validation Checklist

- global token layer loads without breaking existing routes or rendering
- `Client/web/src/index.css` no longer relies on the generic system stack as the core UI identity
- agency branding still drives accent color correctly
- shared components listed above render with the new primitive system and unchanged behavior
- all common states are visible and consistent
- no existing dashboard tab content disappears
- no critical consent/privacy/audit actions become visually hidden
- tokenized styles hold up at `320`, `375`, `768`, `1024`, `1280`, and `1440`

## Risks And Dependencies

- Phase 1 must finish before Phase 2 shell work begins
- do not let token work drift into route restructuring or shell redesign
- do not partially migrate shared components in a way that leaves two competing design systems in the repo
- do not hard-code colors that should remain agency-driven

## Exit Criteria

Phase 1 is complete when:

- the token layer exists and is globally wired
- the type system, spacing system, and elevation system are documented in code
- shared UI primitives exist and are being used by common components
- duplicated button/input/modal styling starts to shrink across the app
- the project is ready for shell and sidebar implementation without inventing a second styling system
