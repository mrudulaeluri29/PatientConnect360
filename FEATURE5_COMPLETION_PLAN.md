# Feature 5 Completion Plan
**Goal:** Complete all missing pieces from Feature 5 implementation  
**Branch:** F2F5-working-kaush  
**Constraint:** NO FAKE/PLACEHOLDER DATA - All seeded data must create real database relationships

---

## Phase F0: Audit Event Emission - Login & Auth (30 min)
**Status:** TODO  
**Priority:** CRITICAL

### Objective
Emit audit events for login success/failure in auth routes

### Tasks
1. Update `Server/src/auth.ts` POST /login endpoint
   - After successful login: emit `LOGIN` audit event with actorId, actorRole
   - After failed login: emit audit event with email in metadata (no actorId since auth failed)

2. Update `AuditActionType` enum if needed
   - Verify `LOGIN` exists (it does)
   - Add `LOGIN_FAILURE` if you want to distinguish

### Files to Edit
- `Server/src/auth.ts`
- `Server/src/lib/audit.ts` (verify helper works for failed auth with no actorId)

### Testing
- Login as patient → check audit log shows LOGIN event
- Login with wrong password → check audit log shows failure event
- Verify actorRole is captured correctly

---

## Phase F1: Audit Event Emission - Messaging (45 min)
**Status:** TODO  
**Priority:** HIGH

### Objective
Emit audit events when messages are sent

### Tasks
1. Add `MESSAGE_SENT` to `AuditActionType` enum in schema
2. Update `Server/src/routes/simpleMessages.ts` POST /conversations/:id/messages
   - After message creation: emit audit event with senderId, conversationId, messageId
3. Optional: Add `CONVERSATION_CREATED` event

### Files to Edit
- `Server/prisma/schema.prisma` (add enum value)
- `Server/src/routes/simpleMessages.ts`
- Run `npx prisma generate` after schema change

### Testing
- Send message as patient → check audit log
- Send message as clinician → check audit log
- Verify metadata includes conversationId and messageId

---

## Phase F2: Audit Event Emission - Caregiver Workflow (30 min)
**Status:** TODO  
**Priority:** MEDIUM

### Objective
Track caregiver invitation and linking events

### Tasks
1. Add to `AuditActionType` enum:
   - `CAREGIVER_INVITATION_CREATED`
   - `CAREGIVER_INVITATION_USED`
   - `CAREGIVER_LINK_REMOVED`

2. Update `Server/src/routes/caregiverInvitations.ts`
   - POST /invitations → emit CAREGIVER_INVITATION_CREATED
   - POST /invitations/:code/use → emit CAREGIVER_INVITATION_USED

3. Update `Server/src/routes/caregiverLinks.ts`
   - DELETE /:id → emit CAREGIVER_LINK_REMOVED
   - POST /use-code → emit CAREGIVER_INVITATION_USED (if not already in invitations route)

### Files to Edit
- `Server/prisma/schema.prisma`
- `Server/src/routes/caregiverInvitations.ts`
- `Server/src/routes/caregiverLinks.ts`

### Testing
- Patient creates invitation → check audit log
- MPOA uses code → check audit log
- Patient removes caregiver link → check audit log

---

## Phase F3: Activity-Based DAU Implementation (1.5 hours)
**Status:** TODO  
**Priority:** HIGH

### Objective
Add second line to DAU chart showing activity-based daily active users

### Tasks
1. Update `Server/src/routes/admin.ts` GET /api/admin/daily-analytics endpoint
   - Current: only calculates loginBasedDAU from User.lastLogin
   - Add: activityBasedDAU by counting distinct actorId per day from AuditLog
   - Filter audit events: exclude LOGIN events (to avoid double-counting)
   - Query: `SELECT DATE(createdAt) as date, COUNT(DISTINCT actorId) FROM AuditLog WHERE actionType != 'LOGIN' GROUP BY DATE(createdAt)`

2. Update response type to include both metrics
   ```typescript
   {
     date: string;
     loginBasedDAU: number;
     activityBasedDAU: number;
     // ... other fields
   }
   ```

3. Update `Client/web/src/pages/admin/AdminDashboard.tsx`
   - AdminOverview component already has DAU chart with Recharts
   - Verify it shows both lines (it should already have activityBasedDAU line)
   - If missing, add second <Line> component for activityBasedDAU

### Files to Edit
- `Server/src/routes/admin.ts` (or wherever daily-analytics endpoint lives)
- `Client/web/src/api/admin.ts` (type definitions)
- `Client/web/src/pages/admin/AdminDashboard.tsx` (verify chart)

### Testing
- Generate some audit events (send messages, create visits, etc.)
- Check admin dashboard DAU chart shows two lines
- Verify activity-based DAU >= login-based DAU (since activity includes more actions)
- Check different dates show different values

---

## Phase F4: Audit Log Pagination (1 hour)
**Status:** TODO  
**Priority:** MEDIUM

### Objective
Add pagination to audit log viewer to handle large datasets

### Tasks
1. Update `Server/src/routes/admin.ts` GET /api/admin/audit endpoint
   - Add query params: `limit` (default 50, max 200), `offset` (default 0)
   - Add total count to response
   ```typescript
   {
     logs: AuditLog[];
     total: number;
     limit: number;
     offset: number;
   }
   ```

2. Update `Client/web/src/pages/admin/AdminDashboard.tsx` AuditLogPanel component
   - Add pagination state: `const [page, setPage] = useState(1)`
   - Add pagination controls below table
   - Calculate offset: `(page - 1) * limit`
   - Show: "Showing X-Y of Z entries"
   - Add Previous/Next buttons

### Files to Edit
- `Server/src/routes/admin.ts`
- `Client/web/src/api/admin.ts`
- `Client/web/src/pages/admin/AdminDashboard.tsx`
- `Client/web/src/pages/admin/AdminDashboard.css` (pagination styles)

### Testing
- Create 100+ audit events (via script or manual actions)
- Navigate through pages
- Verify counts are accurate
- Test filters work with pagination

---

## Phase F5: Audit Log Date Range Filter UI (45 min)
**Status:** TODO  
**Priority:** LOW

### Objective
Add date range picker to audit log viewer

### Tasks
1. Update `Client/web/src/pages/admin/AdminDashboard.tsx` AuditLogPanel
   - Add state: `const [fromDate, setFromDate] = useState("")`
   - Add state: `const [toDate, setToDate] = useState("")`
   - Add date inputs to filter row
   - Pass to API call: `getAuditLogs({ from: fromDate, to: toDate, ... })`

2. Backend already supports `from` and `to` params (verify in admin.ts)

### Files to Edit
- `Client/web/src/pages/admin/AdminDashboard.tsx`

### Testing
- Filter audit log by last 7 days
- Filter by specific date range
- Verify results match date range
- Test edge cases (from > to, invalid dates)

---

## Phase F6: Primary Color CSS Variables (1 hour)
**Status:** TODO  
**Priority:** LOW

### Objective
Apply agency primary color to UI theme

### Tasks
1. Update `Client/web/src/branding/AgencyBranding.tsx`
   - In useEffect, when settings load, apply CSS variable:
   ```typescript
   document.documentElement.style.setProperty('--primary-color', settings.primaryColor);
   ```

2. Update CSS files to use variable
   - Replace hardcoded colors with `var(--primary-color)`
   - Target: buttons, badges, active states, links
   - Files: `AdminDashboard.css`, `PatientDashboard.css`, etc.

3. Add default in `index.css`:
   ```css
   :root {
     --primary-color: #6E5B9A;
   }
   ```

### Files to Edit
- `Client/web/src/branding/AgencyBranding.tsx`
- `Client/web/src/index.css`
- `Client/web/src/pages/admin/AdminDashboard.css`
- Other dashboard CSS files (optional, can be incremental)

### Testing
- Change primary color in admin settings
- Verify buttons/badges update color
- Test with different colors (red, blue, green)
- Verify default color works on fresh load

---

## Phase F7: Login Page Branding (1 hour)
**Status:** TODO  
**Priority:** LOW

### Objective
Show agency branding on login page

### Tasks
1. Update `Client/web/src/pages/Login.tsx`
   - Import useAgencyBranding hook
   - Show logo if logoUrl exists
   - Show portalName instead of hardcoded "MediHealth"
   - Show support contact info at bottom

2. Update login page CSS for branding elements

### Files to Edit
- `Client/web/src/pages/Login.tsx`
- `Client/web/src/pages/Login.css` (if exists)

### Testing
- Set logo and portal name in admin settings
- Logout and view login page
- Verify branding appears
- Test with and without logo

---

## Phase F8: Real Data Seed Script (2-3 hours)
**Status:** TODO  
**Priority:** MEDIUM

### Objective
Create comprehensive seed script that generates REAL database relationships for demo/testing

### Constraints (CRITICAL)
- NO FAKE/PLACEHOLDER DATA
- All seeded data must create actual database records
- All relationships must be valid (patient-clinician assignments, etc.)
- All workflows must be complete (if appointment is COMPLETED, it went through full lifecycle)
- Data must appear correctly in ALL relevant dashboards

### Tasks
1. Create `Server/scripts/seedComprehensive.ts`

2. Seed structure (in order):
   ```typescript
   // 1. Verify test accounts exist (don't create duplicates)
   // 2. Create patient-clinician assignments
   // 3. Create historical availability (approved)
   // 4. Create historical visits with full lifecycle:
   //    - Some COMPLETED (with completedAt timestamps)
   //    - Some CANCELLED (with cancelledAt, cancelReason)
   //    - Some CONFIRMED (upcoming)
   //    - Some REQUESTED (pending)
   // 5. Create medications for patients
   // 6. Create vitals for patients (linked to visits)
   // 7. Create messages/conversations
   // 8. Create caregiver invitations and links
   // 9. Create family feedback entries
   // 10. Simulate logins by updating User.lastLogin for past dates
   // 11. Create audit log entries for all above actions
   ```

3. Date distribution:
   - Spread data over last 30 days
   - More recent data = more entries (realistic pattern)
   - Include weekends and weekdays

4. Quantities (realistic):
   - 5-10 completed visits per patient
   - 2-3 upcoming visits per patient
   - 3-5 medications per patient
   - 10-15 vitals per patient
   - 5-10 messages per conversation
   - 3-5 audit events per day per user

### Files to Create
- `Server/scripts/seedComprehensive.ts`

### Files to Edit
- `Server/package.json` (add script: "seed:comprehensive")

### Testing
- Run seed script
- Check patient dashboard: sees their visits, meds, vitals
- Check clinician dashboard: sees assigned patients, visits
- Check admin dashboard: KPI charts populated, audit log has entries
- Check caregiver dashboard: sees linked patient data
- Verify all relationships are valid (no orphaned records)
- Verify dates are realistic (past 30 days)

---

## Phase F9: Additional Audit Event Types (30 min)
**Status:** TODO  
**Priority:** LOW

### Objective
Add granular audit events for better tracking

### Tasks
1. Add to `AuditActionType` enum:
   - `VISIT_RESCHEDULE_REQUESTED`
   - `VISIT_RESCHEDULE_APPROVED`
   - `AVAILABILITY_SUBMITTED`
   - `BRANDING_UPDATED` (verify it's emitted)

2. Update relevant routes to emit these events:
   - `visits.ts` POST /:id/reschedule-request → VISIT_RESCHEDULE_REQUESTED
   - `visits.ts` POST /:id/review (for reschedule) → VISIT_RESCHEDULE_APPROVED
   - `availability.ts` POST /batch → AVAILABILITY_SUBMITTED
   - `admin.ts` PATCH /agency-settings → BRANDING_UPDATED (verify)

### Files to Edit
- `Server/prisma/schema.prisma`
- `Server/src/routes/visits.ts`
- `Server/src/routes/availability.ts`
- `Server/src/routes/admin.ts`

### Testing
- Perform each action
- Verify audit log captures event
- Check metadata includes relevant IDs

---

## Implementation Order (Recommended)

### Sprint 1: Critical Functionality (3-4 hours)
1. **Phase F0** - Login audit events (30 min)
2. **Phase F1** - Messaging audit events (45 min)
3. **Phase F3** - Activity-based DAU (1.5 hours)
4. **Phase F4** - Audit pagination (1 hour)

### Sprint 2: Data & Polish (3-4 hours)
5. **Phase F8** - Real data seed script (2-3 hours)
6. **Phase F2** - Caregiver audit events (30 min)
7. **Phase F5** - Date range filter UI (45 min)

### Sprint 3: Nice-to-Have (2-3 hours)
8. **Phase F6** - Primary color CSS (1 hour)
9. **Phase F7** - Login page branding (1 hour)
10. **Phase F9** - Additional audit types (30 min)

---

## Testing Checklist (After All Phases)

### Audit Events Coverage
- [ ] Login success creates audit event
- [ ] Login failure creates audit event
- [ ] Message sent creates audit event
- [ ] Visit created creates audit event
- [ ] Visit approved creates audit event
- [ ] Visit cancelled creates audit event
- [ ] Visit rescheduled creates audit event
- [ ] Medication changed creates audit event
- [ ] Availability submitted creates audit event
- [ ] Availability reviewed creates audit event
- [ ] Caregiver invited creates audit event
- [ ] Caregiver linked creates audit event
- [ ] Caregiver removed creates audit event
- [ ] Settings updated creates audit event

### DAU Chart
- [ ] Login-based DAU line shows data
- [ ] Activity-based DAU line shows data
- [ ] Activity-based >= Login-based (always true)
- [ ] Chart shows last 30 days
- [ ] Dates are formatted correctly

### Audit Log Viewer
- [ ] Pagination works (50 per page)
- [ ] Previous/Next buttons work
- [ ] Total count is accurate
- [ ] Date range filter works
- [ ] Action type filter works
- [ ] Actor role filter works
- [ ] Search filter works
- [ ] No edit/delete buttons (read-only)

### Branding
- [ ] Primary color applies to buttons
- [ ] Primary color applies to badges
- [ ] Logo shows in header
- [ ] Portal name shows in header
- [ ] Login page shows branding
- [ ] Settings update triggers audit event

### Seed Data Quality
- [ ] All visits have valid patient-clinician assignments
- [ ] Completed visits have completedAt timestamps
- [ ] Cancelled visits have cancelReason
- [ ] Medications belong to real patients
- [ ] Vitals linked to real visits
- [ ] Messages in real conversations
- [ ] Caregiver links are active
- [ ] Audit events match seeded actions
- [ ] Dates distributed over 30 days
- [ ] Data appears in all relevant dashboards

---

## Success Criteria

Feature 5 is 100% complete when:
1. ✅ All audit event types are emitted correctly
2. ✅ DAU chart shows both login-based and activity-based lines
3. ✅ Audit log has pagination and date filtering
4. ✅ Primary color theme is applied
5. ✅ Login page shows agency branding
6. ✅ Seed script creates realistic, relationship-valid data
7. ✅ All testing checklist items pass
8. ✅ No placeholder/fake data anywhere in the system

---

## Notes

- Run `npx prisma generate` after any schema changes
- Run `npx prisma migrate dev` to apply migrations
- Test each phase independently before moving to next
- Commit after each phase with descriptive message
- Update this document with actual time taken per phase

---

**Created:** April 1, 2026  
**Owner:** Development Team  
**Estimated Total Time:** 8-11 hours
