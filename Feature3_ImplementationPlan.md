## Feature 3 Implementation Plan

### Feature name
**Secure messaging starter**

### Scope for this plan
This plan is for **Server** and **Client/web** only.

### Feature intent
Feature 3 is not just “send a message.” It is the end-to-end work required to make messaging in this repo become a **single reliable, role-safe, HIPAA-aligned MVP messaging system** instead of several partially overlapping implementations.

### Out of scope for this implementation plan
- `Client/mobile/*`
- AI-assisted replies / smart suggestions
- external chat integrations
- real-time websocket chat unless explicitly approved
- true file-attachment expansion beyond current MVP need
- end-to-end encryption redesign
- FHIR / EMR messaging integration

---

## 1. Why this feature is third

Messaging is a central product promise in the original concept documents:
- secure, HIPAA-compliant communication between patients, families, clinicians, and agencies
- fewer fragmented calls/texts
- better accountability and visibility

The repo already has significant messaging functionality, but it is architecturally inconsistent.

### Current state in one sentence
There are **multiple messaging implementations** in the server and multiple role-specific messaging UIs in the web app, but no single canonical end-to-end messaging system.

This means Feature 3 is primarily a **consolidation, hardening, and productization effort**, not a greenfield messaging build.

---

## 2. Desired end state for Feature 3

At the end of this feature, the app should have one clearly defined MVP messaging experience.

### 2.1 Product behavior target

#### Patient
- can message only assigned clinicians
- can view inbox, sent, and conversation thread reliably
- can read/unread/star conversations consistently
- can create new messages and reply in-thread

#### Caregiver / MPOA
- can message clinicians linked to their patient(s)
- can view inbox, sent, and conversation thread reliably
- can switch context safely without cross-patient leakage
- can use same message-center mental model as patient

#### Clinician
- can message assigned patients
- can view inbox, sent, and full thread reliably
- can filter / star conversations if retained in scope
- can handle unread state consistently

#### Admin
- can inspect system messages operationally
- can filter/search messages by sender/recipient role/user
- can perform admin-only moderation actions if retained in scope
- can broadcast if this remains part of MVP messaging governance

### 2.2 Technical outcome target
- one **canonical server messaging API surface** is chosen and documented
- one **canonical conversation/thread model** drives all web message centers
- unread count semantics are consistent
- starring semantics are consistent
- role gates are consistent and auditable
- notification bell integration works without duplicated logic or route confusion

---

## 3. Mandatory current-state audit before implementation

Before changing anything, the Feature 3 owner/agent must audit all current messaging paths so they do not build yet another parallel implementation.

This audit is **required**.

---

## 4. Current-state audit checklist

---

## 4.1 Server messaging route audit

### File: `Server/src/index.ts`
Audit route registration order and current route surface.

Important existing mounts:
- `app.use("/api/messages", messagesRoutes);` where `messagesRoutes` = `./routes/messages_fixed`
- `app.use("/api/simple-messages", simpleMessagesRoutes);`
- `app.use("/api/messages-v2", messageUpgradeRoutes);`

### Critical current-state conclusion
The server already exposes **three different messaging-related route families**:
1. `/api/messages` → `messages_fixed.ts`
2. `/api/simple-messages` → `simpleMessages.ts`
3. `/api/messages-v2` → `messageUpgrades.ts`

Feature 3 **must not** add a fourth parallel messaging API.

---

## 4.2 Audit `Server/src/routes/simpleMessages.ts`

This is currently the most important route family because it is the one heavily consumed by the web dashboards.

### Existing behavior already present
- assigned-clinicians listing for patient/caregiver
- assigned-patients listing for clinician
- `POST /send`
- inbox list
- sent list
- full conversation fetch
- reply endpoint
- mark-read endpoint
- unread notification summary
- conversation starring and role filters
- caregiver-aware clinician gating
- audit logging for sent messages and conversation creation

### Important design choices already baked in
- message content stores a synthetic subject/body format using:
  - `**Subject:** <subject>\n\n<body>`
- inbox/sent are presented as flattened list items rather than purely normalized threads
- unread state uses both:
  - `Message.isRead`
  - `ConversationParticipant.unreadCount`

### Important current-state issues to note
- some endpoints are broad and manually composed
- there is duplicated conversation-star logic here and in `messageUpgrades.ts`
- read-state logic is partly message-based and partly participant-based
- there are debug endpoints in the same production route file
- the subject/body storage pattern is practical but brittle

---

## 4.3 Audit `Server/src/routes/messages_fixed.ts`

This route family represents a second overlapping messaging model.

### Existing behavior already present
- conversations list
- conversation detail
- create conversation
- send message in conversation
- unread count
- notifications summary
- admin moderation actions on messages
- admin broadcast-like send endpoint

### Important current-state issues
- overlaps strongly with `simpleMessages.ts`
- contains duplicate or parallel route purposes
- includes debug/test routes mixed into the same file
- some gating assumptions differ from `simpleMessages.ts`
- some endpoints are likely not the ones the main role dashboards actually rely on

### Required conclusion for the owner
The owner must explicitly decide whether `messages_fixed.ts` remains:
- the canonical admin/low-level route family,
- or becomes legacy and is folded behind the `simpleMessages` model.

---

## 4.4 Audit `Server/src/routes/messageUpgrades.ts`

### Existing behavior already present
- conversation star / unstar
- conversation list with filters

### Important current-state issue
These capabilities are already duplicated inside `simpleMessages.ts`.

### Required conclusion
Feature 3 should consolidate starring/filter logic into one canonical route family. This file should either:
- be deprecated, or
- become a shared helper-backed route layer.

Do **not** leave star/filter behavior split between route families after the feature is done.

---

## 4.5 Data-model audit

### File: `Server/prisma/schema.prisma`
Audit these existing messaging-related models:
- `Conversation`
- `ConversationParticipant`
- `Message`
- `ConversationStar`

### Important current-state notes
- `ConversationParticipant.unreadCount` already exists
- `ConversationParticipant.lastReadAt` already exists
- `Message.isRead` also exists
- `ConversationStar` already exists

### Architectural implication
The repo currently maintains **two overlapping unread paradigms**:
1. per-message read flags
2. per-conversation unread counters / last-read state

Feature 3 must decide which is authoritative for MVP behavior.

### Recommended direction
Use `ConversationParticipant.unreadCount` + `lastReadAt` as the primary conversation-state model, and keep `Message.isRead` only if necessary for compatibility or admin moderation surfaces.

---

## 4.6 Web messaging audit

The current web app implements messaging separately inside multiple dashboard files.

### Patient messaging audit

#### File: `Client/web/src/pages/patient/PatientDashboard.tsx`
Audit the embedded `SimpleMessages(...)` implementation.

Important current-state behavior:
- uses `/api/simple-messages/*`
- loads inbox and sent separately
- supports starring via `/api/simple-messages/conversations/:id/star`
- supports unread marking via `/api/simple-messages/mark-read`
- compose modal sends via `/api/simple-messages/send`
- reply uses compose modal rather than inline thread composer
- message UI is embedded directly inside a very large dashboard file

### Clinician messaging audit

#### File: `Client/web/src/pages/clinician/ClinicianDashboard.tsx`
Audit the embedded `SimpleMessages(...)` implementation.

Important current-state behavior:
- also uses `/api/simple-messages/*`
- similar but not identical to patient implementation
- assigned-patient selection for compose
- similar unread/star/filter behavior, duplicated in code

### Caregiver messaging audit

#### File: `Client/web/src/pages/caregiver/CaregiverDashboard.tsx`
Audit the embedded `CaregiverMessages()` implementation.

Important current-state behavior:
- also uses `/api/simple-messages/*`
- similar inbox/sent/thread pattern
- compose targets clinicians only
- star support present

### Admin messaging audit

#### File: `Client/web/src/pages/admin/AdminDashboard.tsx`
Audit `AdminMessages()`.

Important current-state behavior:
- does **not** use the same UX model as patient/clinician/caregiver
- uses `/api/admin/messages`
- uses `/messages/:id/read`, `/messages/:id`, `/messages/send`-style admin actions
- includes broadcast flow

### Critical web conclusion
There are effectively **four message-center UIs** in the web app:
1. patient embedded message center
2. clinician embedded message center
3. caregiver embedded message center
4. admin operations message center

Feature 3 should reduce duplication by extracting shared message-center components for non-admin roles at minimum.

---

## 4.7 Notification integration audit

### File: `Client/web/src/components/NotificationBell.tsx`
Audit how message notifications are currently derived.

Important current-state behavior:
- combines in-app `/api/notifications` with message-derived notifications from `/api/simple-messages/inbox`
- treats unread inbox rows as message notifications
- refreshes based on polling and custom `messageRead` events

### Architectural implication
Messaging feature changes must preserve NotificationBell behavior or replace it deliberately. Do not break unread count updates while consolidating messaging.

---

## 4.8 Existing testing audit

Search and audit any existing message-related tests or scripts before implementing.

### Current-state note
There appears to be little or no robust `__tests__` coverage directly targeting the active `/api/simple-messages` contract.

However, the server package scripts already reference audit/testing utilities such as:
- `scripts/testMessagingAudit.ts`

The owner must inspect those before creating parallel testing patterns.

---

## 5. Implementation strategy recommendation

### Core recommendation
Do **not** attempt to improve messaging by layering fixes across all three route families independently.

Instead, choose one canonical messaging model and align the web to it.

### Recommended canonical model for MVP
Use **`/api/simple-messages`** as the canonical route family for patient / clinician / caregiver messaging.

### Why
- it already contains the role-aware gating logic closest to the product needs
- it already supports patients, clinicians, and caregivers
- it already supports starring and unread updates
- it is what the main non-admin dashboards are already consuming

### Recommended admin strategy
Keep admin operational message management as a **separate admin-facing surface**, but refactor it to align structurally with the canonical conversation/message model rather than a different logical system.

---

## 6. Recommended file-level implementation plan

### 6.1 Existing files likely to be modified

#### Server
- `Server/src/index.ts`
- `Server/src/routes/simpleMessages.ts`
- `Server/src/routes/messages_fixed.ts`
- `Server/src/routes/messageUpgrades.ts`
- `Server/src/routes/admin.ts`
- `Server/src/lib/audit.ts` *(if audit coverage expands)*

#### Client/web
- `Client/web/src/components/NotificationBell.tsx`
- `Client/web/src/pages/patient/PatientDashboard.tsx`
- `Client/web/src/pages/clinician/ClinicianDashboard.tsx`
- `Client/web/src/pages/caregiver/CaregiverDashboard.tsx`
- `Client/web/src/pages/admin/AdminDashboard.tsx`

### 6.2 New files likely to be added

#### Server
- `Server/src/lib/messages.ts`
- `Server/src/__tests__/feature3.messaging.test.ts`
- `Server/src/__tests__/feature3.roleGating.test.ts`
- `Server/src/__tests__/feature3.unreadState.test.ts`
- `Server/src/scripts/smokeFeature3Messaging.ts`

#### Client/web
- `Client/web/src/api/messages.ts`
- `Client/web/src/components/messages/MessageCenter.tsx`
- `Client/web/src/components/messages/MessageCenter.css`
- `Client/web/src/components/messages/ConversationList.tsx`
- `Client/web/src/components/messages/ConversationThread.tsx`
- `Client/web/src/components/messages/ComposeMessageModal.tsx`
- `Client/web/src/components/messages/MessageFilters.tsx`
- `Client/web/src/components/messages/messageTypes.ts`
- `Client/web/src/components/messages/messageAdapters.ts`

Optional if admin needs separate shared ops components:
- `Client/web/src/components/messages/AdminMessageTable.tsx`
- `Client/web/src/components/messages/BroadcastComposer.tsx`

---

## 7. Phased execution plan for AI agents / feature owner

The steps below are intentionally sequential and should be followed in order.

---

## Phase 0 — Audit and canonical-route decision

### Goal
Decide exactly which route family and unread model will be canonical.

### Tasks
1. Complete the audit in Sections 4.1–4.8.
2. Write down:
   - which route family is canonical for non-admin messaging
   - what parts of `messages_fixed.ts` remain necessary
   - whether `messageUpgrades.ts` is deprecated or absorbed
   - what unread-state model is authoritative
3. Freeze the contract before touching UI.

### Required output of Phase 0
- canonical messaging architecture note
- list of route families to preserve / deprecate

### Do not proceed until
- the owner can explain how non-admin messaging works today and which server API the web should standardize on

---

## Phase 1 — Server messaging service extraction

### Goal
Reduce route-level duplication and establish a reusable server-side messaging helper layer.

### Recommended new file
- `Server/src/lib/messages.ts`

### Suggested responsibilities
- find-or-create canonical two-party conversation
- create message with normalized payload handling
- increment unread counts consistently
- mark messages read consistently
- compute inbox/sent projections
- fetch conversation summary list
- fetch thread detail safely

### Why this matters
Right now a lot of logic is embedded directly in route files. Extracting message-domain helpers makes consolidation possible without changing behavior blindly.

---

## Phase 2 — Canonicalize server route surface

### Goal
Make `/api/simple-messages` the primary non-admin messaging API.

### Recommended implementation direction

#### `Server/src/routes/simpleMessages.ts`
Refactor and preserve as canonical.

Target responsibilities:
- assigned counterpart listing (`assigned-clinicians`, `assigned-patients`)
- send new message
- inbox list
- sent list
- conversation detail
- reply
- mark-read
- conversation list + stars + filters

#### `Server/src/routes/messageUpgrades.ts`
Deprecate or reduce to thin wrappers delegating to the canonical logic.

#### `Server/src/routes/messages_fixed.ts`
Decide on one of these approaches:

##### Option A — Preferred
Restrict to admin-specific / legacy compatibility endpoints only, and document it as non-canonical for normal product messaging.

##### Option B
Refactor into a wrapper over shared helpers and align it structurally with `simpleMessages`.

### Important instruction
Do not leave conversation starring and filtering implemented independently in both `simpleMessages.ts` and `messageUpgrades.ts` when the feature is finished.

---

## Phase 3 — Unread/read-state consolidation

### Goal
Make unread behavior predictable and consistent.

### Existing issue
Unread is currently represented by both:
- `Message.isRead`
- `ConversationParticipant.unreadCount`

### Recommended MVP rule
Use `ConversationParticipant.unreadCount` as the primary UX source of truth for inbox badge/count behavior.

Use `Message.isRead` only when needed for:
- admin inspection
- per-message highlighting compatibility

### Specific implementation tasks
- normalize mark-read flows so unread counters never drift
- ensure opening a conversation does not unexpectedly clear more read state than intended
- ensure thread-level “mark all read” is deterministic

### Files likely touched
- `Server/src/routes/simpleMessages.ts`
- `Server/src/routes/messages_fixed.ts`
- `Server/src/lib/messages.ts`

---

## Phase 4 — Role-gating hardening

### Goal
Ensure that only permitted communication paths exist.

### Required role rules to validate and encode clearly

#### Patient
- may message only assigned clinicians

#### Clinician
- may message only assigned patients

#### Caregiver / MPOA
- may message only clinicians associated with linked patient(s)

#### Admin
- may inspect messages operationally
- may broadcast only according to final MVP policy

### Important instruction
Before changing any gating logic, audit how assignment and caregiver-link checks already work in:
- `Server/src/routes/simpleMessages.ts`
- `Server/src/routes/messages_fixed.ts`
- `Server/src/lib/patientAccess.ts` *(for awareness; may not need change)*

Do not create looser message permissions than the current data-access model.

---

## Phase 5 — Shared Client/web message center extraction

### Goal
Stop maintaining three near-duplicate non-admin message centers in giant dashboard files.

### Recommended new shared component structure
- `Client/web/src/components/messages/MessageCenter.tsx`
- `Client/web/src/components/messages/ConversationList.tsx`
- `Client/web/src/components/messages/ConversationThread.tsx`
- `Client/web/src/components/messages/ComposeMessageModal.tsx`
- `Client/web/src/components/messages/MessageFilters.tsx`
- `Client/web/src/components/messages/messageTypes.ts`
- `Client/web/src/components/messages/messageAdapters.ts`

### Suggested responsibilities

#### `MessageCenter.tsx`
- orchestrates inbox/sent/thread state
- consumes canonical `/api/simple-messages` APIs
- supports configuration by role

#### `ConversationList.tsx`
- inbox/sent list rendering
- star/unread indicators
- filter handling

#### `ConversationThread.tsx`
- thread rendering
- mark-read actions
- reply trigger

#### `ComposeMessageModal.tsx`
- recipient select
- subject/body compose
- submit new message

#### `MessageFilters.tsx`
- inbox/sent toggle
- starred toggle
- role filter where applicable

### Important instruction
Extract shared functionality first, then rewire dashboards to use it. Do not continue editing each dashboard’s embedded messaging implementation separately.

---

## Phase 6 — Integrate patient, clinician, and caregiver dashboards

### Goal
Replace embedded messaging implementations with shared components.

### Existing files to modify
- `Client/web/src/pages/patient/PatientDashboard.tsx`
- `Client/web/src/pages/clinician/ClinicianDashboard.tsx`
- `Client/web/src/pages/caregiver/CaregiverDashboard.tsx`

### Recommended direction

#### Patient dashboard
Replace embedded `SimpleMessages(...)` with shared `MessageCenter` configured for patient context.

#### Clinician dashboard
Replace embedded `SimpleMessages(...)` with shared `MessageCenter` configured for clinician context.

#### Caregiver dashboard
Replace `CaregiverMessages()` logic with shared `MessageCenter` configured for caregiver context.

### Keep existing behavior where possible
- notification deep-link support via pending conversation IDs
- star toggles
- inbox/sent switching
- compose modal role-specific recipient options

---

## Phase 7 — Admin messaging operations alignment

### Goal
Keep admin messaging operationally useful without forcing admin UX into the exact same shape as end-user messaging.

### Existing file
- `Client/web/src/pages/admin/AdminDashboard.tsx`

### Recommended implementation direction

#### Keep admin as a distinct operational surface
Admin needs:
- system-wide message visibility
- role/user filtering
- moderation controls
- broadcast composer

This should remain distinct from the patient/clinician/caregiver message center.

#### But align it structurally
It should still read from the same conversation/message data model and not depend on a logically separate messaging stack.

### Important instruction
Do not leave admin actions calling malformed or inconsistent endpoints. Audit and fix endpoint usage so admin tooling maps cleanly to the chosen canonical server architecture.

---

## Phase 8 — Notification bell and unread integration

### Goal
Make unread message state update correctly and predictably across the app.

### Existing file
- `Client/web/src/components/NotificationBell.tsx`

### Current-state behavior to preserve or improve
- notification bell counts unread in-app notifications and message-derived unread entries
- custom `messageRead` events trigger refresh behavior

### Recommended work
- ensure message-center refactor still emits refresh/read events appropriately
- reduce redundant inbox re-fetching where possible
- ensure NotificationBell derives unread state from the canonical message contract

---

## Phase 9 — UX polish and MVP constraints

### Goal
Make messaging feel production-minded while staying MVP-sized.

### Required UX expectations
- clean inbox/sent/thread transitions
- clear unread state
- obvious permitted recipients
- no confusing duplicate subject/body parsing quirks exposed in UI
- good empty states
- good error states

### Recommended MVP restraint
- keep attachments out if they destabilize the sprint
- keep broadcast limited to admin if retained
- avoid realtime socket infrastructure unless explicitly approved

---

## 10. Testing plan

Feature 3 must include automated and browser/manual validation.

---

## 10.1 Server automated testing

### Recommended new tests

#### File: `Server/src/__tests__/feature3.messaging.test.ts`
Cover:
- patient creates conversation with assigned clinician
- clinician creates message to assigned patient
- caregiver sends message to allowed clinician
- unauthorized role combinations are rejected
- reply flow updates conversation timestamp

#### File: `Server/src/__tests__/feature3.roleGating.test.ts`
Cover:
- patient cannot message unassigned clinician
- clinician cannot message unassigned patient
- caregiver cannot message clinician unrelated to linked patients
- non-participant cannot fetch conversation detail

#### File: `Server/src/__tests__/feature3.unreadState.test.ts`
Cover:
- sending increments recipient unread count
- mark-read decrements conversation unread count correctly
- starring/un-starring works only for participants
- conversation list unread counts reflect updates accurately

### Existing references to audit before writing tests
- `Server/src/scripts/testMessagingAudit.ts`
- any audit-related scripts already in `Server/scripts/*`

---

## 10.2 Server smoke script

### Recommended new script
Create:
- `Server/src/scripts/smokeFeature3Messaging.ts`

### Suggested smoke coverage
1. log in as patient and clinician
2. create or find assigned relationship
3. send patient → clinician message
4. fetch clinician inbox
5. open conversation
6. reply clinician → patient
7. mark messages as read
8. verify conversation starring works
9. verify audit events exist if included in smoke output

### Package script
Update `Server/package.json` with something like:
- `smoke:feature3:messaging`

---

## 10.3 Browser/manual validation plan

If browser tools are available, run these end-to-end.

### Environment
- backend: `npm run dev --prefix Server`
- web: `npm run dev --prefix Client/web`

### Browser validation matrix

#### Flow A — Patient messaging
1. sign in as patient
2. open messages tab
3. verify assigned clinicians populate compose modal
4. send new message
5. verify it appears in sent view
6. verify reply thread works after clinician responds
7. verify starring works
8. verify unread counts clear correctly

#### Flow B — Clinician messaging
1. sign in as clinician
2. open messages tab
3. verify assigned patients populate compose modal
4. open unread patient message
5. verify thread renders correctly
6. verify mark-read behavior updates inbox and bell count

#### Flow C — Caregiver messaging
1. sign in as caregiver linked to a patient
2. open messages tab
3. verify only allowed clinicians are available
4. send message
5. open thread and verify reply behavior
6. verify no unrelated patient context leaks into the UI

#### Flow D — Admin messaging operations
1. sign in as admin
2. open admin messages panel
3. filter by sender role and recipient role
4. open a message detail
5. mark read / delete if these actions remain in scope
6. send broadcast if retained

#### Flow E — Notification bell integration
1. send a new unread message to another user
2. verify NotificationBell unread count increases
3. open message from bell/deep-link path
4. verify unread count updates after read action

### Browser-tool evidence the owner should capture
- patient inbox screenshot
- clinician thread screenshot
- caregiver compose flow screenshot
- admin filtered message table screenshot
- notification bell unread update screenshot

---

## 11. Definition of done for Feature 3

Feature 3 is done only when all of the following are true.

### Product criteria
- patient, clinician, and caregiver all use one consistent messaging model
- recipient restrictions reflect assignments/links correctly
- inbox/sent/thread/star/unread flows work reliably
- admin operational message tooling remains usable

### Server criteria
- canonical non-admin messaging route family is chosen and documented
- duplicate star/filter logic is consolidated
- unread-state behavior is consistent
- route-level duplication is reduced through shared helper logic

### Web criteria
- shared message-center components exist
- patient/clinician/caregiver no longer maintain large duplicated message implementations
- notification bell integration still works
- compose/reply flows are stable and clear

### Testing criteria
- new server tests added and passing
- smoke script added and runnable
- browser/manual validation completed across patient, clinician, caregiver, and admin paths

---

## 12. Implementation cautions and anti-patterns

### Do not:
- add another messaging route family
- leave three route families all partially active with overlapping responsibilities
- keep copying embedded message-center logic between dashboards
- change unread semantics in the UI without aligning server updates
- loosen role-based messaging permissions for convenience
- leave debug/test endpoints mixed into the canonical production route without deliberate review

### Do instead:
- choose one canonical messaging contract
- centralize shared server helpers
- centralize shared client components
- preserve admin operational needs separately but consistently

---

## 13. Suggested task order for the Feature 3 owner

If another AI agent or engineer owns this feature, they should work in this order:

1. **Audit all messaging route families and web consumers**
2. **Choose canonical route family and unread model**
3. **Extract shared server messaging helpers**
4. **Consolidate route behavior**
5. **Extract shared Client/web message-center components**
6. **Integrate patient messaging**
7. **Integrate clinician messaging**
8. **Integrate caregiver messaging**
9. **Align admin operational messaging**
10. **Polish unread/bell integration and run tests**

This order is important. Do not start by rewriting UI before choosing the canonical server contract.

---

## 14. Final recommendation to the implementing agent

Feature 3 should be treated as a **messaging consolidation and reliability effort**.

The repo already has:
- conversation models
- message models
- unread tracking
- role-aware message gating
- starring support
- notification integration

What it lacks is a single coherent messaging architecture and a shared web message-center implementation.

The owner’s real job is to:
1. audit what already exists,
2. choose the canonical path,
3. consolidate the server,
4. extract reusable web messaging UI,
5. and leave the repo with one clear secure messaging story for the MVP.
