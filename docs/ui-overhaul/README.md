# PatientConnect360 UI Overhaul Guides

This folder expands `UIOVERHAUL.md` into implementation-ready phase guides.

Scope rules across all phase guides:

- UI and UX only; no logic, API, permission, validation, or workflow changes.
- Preserve every existing route, feature, tab destination, button, and critical action.
- Use the existing dashboard `activeTab` values and current route structure during the first rollout.
- Keep `Records`, `Safety`, `Access`, `Care records`, `Appointments`, `Availability`, and `Audit Log` explicit and easy to reach.

Documents:

- `docs/ui-overhaul/PHASE-1-DESIGN-FOUNDATIONS.md`
- `docs/ui-overhaul/PHASE-2-SHARED-APP-SHELL-AND-SIDEBAR.md`
- `docs/ui-overhaul/PHASE-3-PUBLIC-AND-AUTH-REFRESH.md`
- `docs/ui-overhaul/PHASE-4-PATIENT-AND-CAREGIVER-DASHBOARDS.md`
- `docs/ui-overhaul/PHASE-5-CLINICIAN-AND-ADMIN-DASHBOARDS.md`
- `docs/ui-overhaul/PHASE-6-SHARED-COMPLEX-SURFACES.md`
- `docs/ui-overhaul/PHASE-7-QA-ACCESSIBILITY-AND-ROLLOUT.md`

Recommended skill coverage by phase:

- Phase 1: `audit`, `distill`, `typeset`, `layout`, `colorize`, `quieter`, `clarify`, `polish`, `adapt`
- Phase 2: `layout`, `adapt`, `clarify`, `polish`, `audit`
- Phase 3: `typeset`, `clarify`, `layout`, `adapt`, `quieter`, `colorize`, `polish`
- Phase 4: `distill`, `layout`, `adapt`, `clarify`, `audit`, `polish`
- Phase 5: `layout`, `adapt`, `audit`, `clarify`, `typeset`, `polish`, `colorize`
- Phase 6: `adapt`, `audit`, `layout`, `animate`, `polish`, `clarify`
- Phase 7: `audit`, `adapt`, `critique`, `polish`, `distill`, `clarify`

Use these guides in order. Phase 1 and Phase 2 establish the foundation that all later phase docs assume.
