# Lab 4 Sprint Engineering Specification

Sprint 4 engineering contract for TokTickIT. It extends
`docs/lab-03/specification.md`; every Lab 1–3 requirement, rule, and API
remains in force unless this document explicitly changes it. Full detail
lives in `api-spec.md` (REST contract), `ui-spec.md` (screens), and
`tests.md` (planned tests and traceability).

## 1. Sprint Goal

Complete the core service-desk workflow: IT Staff and Administrators record
the actual work on a Ticket as Actions Taken, the backend enforces the final
Ticket status rules (including a resolution gate and stale-update
protection), every role starts from a concise dashboard that links into the
detailed screens, and the whole application built in Labs 1–3 is hardened,
regression-tested, and ready for the final demonstration.

## 2. Stakeholder Request Interpretation

Tickets and conversations already work, but the service desk cannot see
what was actually done on a Ticket. Each Ticket therefore needs a list of
Actions Taken: when it happened, what was done, the result, who did it
(filled in automatically), whether follow-up is needed (with a note when it
is), and where related files can be found. The Ticket Owner still
coordinates the Ticket, but any IT Staff member may record an action on it.
A Requester saying "it looks fixed" is only a hint — IT Staff must review
the recorded work and formally resolve the Ticket. Dashboards should help
each role decide what to open next, not replace the queue or ticket lists.
Finally, the existing product must keep working and look like one coherent
Zen Green application.

## 3. Scope

### Included
- Actions Taken on a Ticket: list, create, view/edit, complete, cancel, with
  an assignee chosen from active IT Staff/Administrators
- Read-only Actions Taken for the Requester on their own Tickets
- Final Ticket status-transition matrix with authorized roles, a backend
  resolution gate, Requester reopen, and an append-only status history
- Stale-update (optimistic concurrency) protection for Ticket status changes
  and Action Taken edits
- Requester Dashboard and IT Staff Dashboard (Administrator reuses the IT
  Staff Dashboard plus user-account counts), each metric drilling down to a
  filtered list or Ticket Detail
- Dashboard as the landing page and first navigation item for every role
- Prisma migration, backfill decisions, and an idempotent Lab 4 seed
- Final hardening: regression of Labs 1–3, consistent feedback states,
  duplicate-submit prevention, accessibility, responsive layout, removal of
  leftover UI, current README

### Excluded
- Automatic SLA clocks, escalation engines, on-call scheduling, breach
  notifications
- Email, SMS, LINE, push, or any external notification service
- Inventory, spare parts, purchasing, cost accounting, time-sheet billing,
  payroll, labor-cost calculation
- Multi-level approvals and electronic signatures
- BI tools, custom report builders, export warehouses, charts beyond simple
  counts
- Multi-tenant organizations and production-scale cloud operations
- Deleting Actions Taken or status history entries; editing Public
  Comments or Internal Notes (still append-only from Lab 3)
- Any feature not listed in this contract

## 4. Functional Requirements

### Actions Taken
- FR-01: The system shall allow IT Staff and Administrators to create an
  Action Taken on any Ticket with Action Date/Time, Action Description,
  Result, Follow-Up Required, Follow-up Note, Attachment Notes, and an
  assignee.
- FR-02: The system shall record the authenticated user as "Performed by"
  automatically; the client cannot supply or change it.
- FR-03: The system shall list all Actions Taken of a Ticket in a stable
  chronological order to IT Staff and Administrators.
- FR-04: The system shall allow IT Staff and Administrators to edit a
  Planned Action Taken and to mark it Completed or Cancelled.
- FR-05: The system shall show a Requester all Actions Taken on Tickets
  they own, read-only.

### Ticket workflow
- FR-06: The system shall change a Ticket's status only along the permitted
  transition matrix and only for the roles authorized for that transition.
- FR-07: The system shall reject a change to Resolved unless the resolution
  gate (BR-11) is satisfied, even when the normal screen is bypassed.
- FR-08: The system shall allow a Requester to reopen their own Resolved or
  Closed Ticket.
- FR-09: The system shall append a status-history entry for every
  successful status change and show the history in a stable order.
- FR-10: The system shall detect stale Ticket status changes and stale
  Action Taken edits and reject them with a conflict response instead of
  overwriting newer data.
- FR-11: The Requester "problem appears resolved" indication shall remain
  advisory and shall not change the Ticket status.

### Dashboards
- FR-12: The system shall provide a Requester Dashboard summarizing only
  the authenticated Requester's Tickets.
- FR-13: The system shall provide an IT Staff Dashboard summarizing the
  operational queue and the current user's open Actions Taken.
- FR-14: The system shall provide Administrators the IT Staff Dashboard
  plus concise user-account counts.
- FR-15: Every dashboard count or list item shall drill down to the Ticket
  Queue, My Tickets, or Ticket Detail with matching filters applied.
- FR-16: The My Tickets, Ticket Queue, and User Management screens shall
  accept their filters from URL query parameters so drill-down links open
  the filtered view.

### Hardening
- FR-17: All Lab 1–3 screens and APIs shall remain available to their
  permitted roles with unchanged behavior.
- FR-18: Every screen shall present consistent loading, validation,
  success, empty/no-results, forbidden, not-found, conflict, and safe
  failure feedback.
- FR-19: Repeated clicks or network retries shall not create duplicate
  records, and important forms shall keep entered data after a recoverable
  failure.
- FR-20: A signed-in user who opens a screen their role cannot use shall
  see a Forbidden screen rather than being sent to Login.

## 5. Business Rules

### Actions Taken
- BR-01: An Action Taken belongs to exactly one Ticket and cannot be moved
  to another Ticket.
- BR-02: The Ticket Owner coordinates the Ticket, but an Action Taken may
  be performed by, and assigned to, a different IT Staff member.
- BR-03: Only IT Staff and Administrators may create or change Actions
  Taken. Requesters may only read Actions Taken on Tickets they own.
- BR-04: "Performed by" is the authenticated creator and never changes.
- BR-05: The assignee must be an active IT Staff or Administrator user; it
  defaults to the creator. An inactive or non-staff assignee is rejected.
- BR-06: Action Description is required (1–2000 characters after trimming).
  Result is optional while Planned (≤2000) and required to mark an action
  Completed. Attachment Notes are optional (≤500).
- BR-07: When Follow-Up Required is true, Follow-up Note is required
  (1–1000 characters). When it is false, any Follow-up Note is cleared.
- BR-08: Action Date/Time defaults to the current time, cannot be earlier
  than the Ticket's creation time, and cannot be more than 5 minutes in the
  future (clock-skew allowance).
- BR-09: Action status flows Planned → Completed or Planned → Cancelled.
  Completed and Cancelled actions are read-only and are never deleted.
- BR-10: Actions Taken cannot be added to or changed on a Closed or
  Cancelled Ticket.

### Ticket status and resolution
- BR-11 (resolution gate): A Ticket may move to Resolved only when it has a
  Ticket Owner, at least one Completed Action Taken, and no Planned Action
  Taken.
- BR-12: Ticket status transitions follow the matrix in Section 8; any
  other transition, or a permitted transition by an unauthorized role, is
  rejected and the status is unchanged.
- BR-13: A Requester may change status only from Resolved or Closed to
  Reopened, and only on a Ticket they own. All other transitions belong to
  IT Staff and Administrators.
- BR-14: Cancelled is terminal. Closed may only be reopened.
- BR-15: The Requester "problem appears resolved" flag is advisory: setting
  it never changes `currentStatus`. Reopening a Ticket clears the flag.
- BR-16: Every successful status change appends exactly one status-history
  entry (from, to, actor, time) in the same database transaction. History
  entries are never edited or deleted and are ordered by time, then id.
- BR-17: A status change or Action Taken edit must carry the version the
  client last saw. If the record has changed since, the request is rejected
  with 409 and nothing is written.

### Dashboards
- BR-18: "Active" means status New, Open, In Progress, Waiting for
  Requester, or Reopened.
- BR-19: "Recent" means within the last 7 × 24 hours of the request time.
  Timestamps are stored in UTC and displayed in Asia/Bangkok time.
- BR-20: Dashboard metrics are calculated by the backend from the database
  at request time; the frontend never derives counts from partial lists.
- BR-21: Requester metrics include only Tickets whose `requesterId` is the
  authenticated user.
- BR-22: A metric with no matching records returns 0 and a list with no
  matching records returns an empty array; neither is an error.
- BR-23: Creating or editing an Action Taken updates the parent Ticket's
  `updatedAt`, so the Ticket counts as recently updated.
- BR-24: Dashboard lists return at most 5 items each.

### Migration
- BR-25: The Lab 4 migration is additive only. All Users, Tickets,
  Attachments, Public Comments, and Internal Notes from earlier labs remain
  valid and unchanged. Legacy Tickets start with zero Actions Taken, version
  1, and no status history.

## 6. UI Specification Summary

See `docs/lab-04/ui-spec.md` for full detail. Summary:
- **Shell:** "Dashboard" becomes the first navigation item for every role
  and the destination after login and for `/`. Active page stays
  highlighted. Wrong-role routes show a Forbidden screen.
- **Requester Dashboard:** three metric cards (Open, Waiting for Me,
  Recently Resolved) and a Recently Updated list; every card and row is a
  link.
- **IT Staff Dashboard:** metric cards (Unassigned, Assigned to Me, My Open
  Actions), counts by status and by IT Priority, Urgent and Recently
  Updated lists, My Open Actions list. Administrators also see user counts.
- **Actions Taken (IT Staff Ticket Detail):** table on desktop, cards on
  mobile; Create mode and View/Edit mode in an inline panel; Follow-up Note
  appears and becomes required only when Follow-Up Required is checked;
  Complete and Cancel actions; Completed/Cancelled rows are read-only.
- **Actions Taken (Requester Ticket Detail):** the same list, read-only,
  with no controls. Internal Notes stay hidden.
- **Workflow:** the Status control lists only transitions the current role
  may make, with readable labels. Gate failures and 409 conflicts show a
  clear message; a conflict reloads the latest data. A Status History list
  shows the append-only history. Requesters get a "Reopen Ticket" button on
  Resolved/Closed Tickets.
- **Feedback and responsiveness:** shared loading, empty, error, conflict,
  forbidden, and not-found states; buttons are disabled while saving;
  layouts work at 1280, 820, and 375 px without horizontal scrolling.

## 7. Data Changes

### New and changed models

**`ActionTaken`** (new)

| Field | Type | Notes |
|---|---|---|
| id | Int, PK | |
| ticketId | Int, FK → Ticket | BR-01 |
| performedById | Int, FK → User | set from session (BR-04) |
| assigneeId | Int, FK → User | active IT Staff/Administrator (BR-05) |
| actionAt | DateTime | BR-08 |
| description | String | BR-06 |
| result | String? | BR-06 |
| followUpRequired | Boolean, default false | BR-07 |
| followUpNote | String? | BR-07 |
| attachmentNotes | String? | BR-06 |
| status | enum `ActionStatus` (`PLANNED`, `COMPLETED`, `CANCELLED`), default `PLANNED` | BR-09 |
| version | Int, default 1 | BR-17 |
| createdAt, updatedAt | DateTime | |

Indexes: `(ticketId, actionAt)` for the Ticket Detail list,
`(assigneeId, status)` for "My Open Actions".

**`TicketStatusHistory`** (new): id, ticketId (FK), fromStatus
(`TicketStatus`), toStatus (`TicketStatus`), changedById (FK → User),
changedAt (default now). Index `(ticketId, changedAt)` and
`(toStatus, changedAt)` for "Recently Resolved".

**`Ticket`** (changed): add `version Int @default(1)`; add relations
`actionsTaken` and `statusHistory`.

**`User`** (changed): add back-relations for performed actions, assigned
actions, and status changes.

### Database design decisions
1. **Integer `version` for stale-update detection** instead of comparing
   `updatedAt`. An integer compares exactly, is cheap to send to the client,
   and avoids timestamp-precision and clock issues. The update uses
   `WHERE id = ? AND version = ?` and increments `version`; zero updated rows
   means a conflict (409).
2. **Separate append-only `TicketStatusHistory` table** instead of storing
   only `currentStatus` (and perhaps a `resolvedAt` column) on Ticket. It
   gives an auditable, ordered record of every change, supports "Recently
   Resolved" without extra Ticket columns, and is naturally append-only
   because no update/delete endpoint exists.
3. **Enum for `ActionStatus`** instead of a reference table. The three
   values are fixed and tied to business rules in code, so a table would add
   joins without adding flexibility.

### Migration and backfill
- One Prisma migration (`add_actions_taken_and_status_history`) that only
  creates the new enum and tables, adds `Ticket.version` with default 1, and
  adds indexes. No existing column is renamed, retyped, or dropped.
- Legacy Tickets: zero Actions Taken, `version = 1`, no history. Dashboard
  "Recently Resolved" therefore counts only resolutions made after the
  migration; other metrics use `currentStatus` and `updatedAt`, which legacy
  Tickets already have.
- A legacy Ticket already in Resolved/Closed stays as it is; the gate
  applies only to new transitions into Resolved.
- Recovery: take `pg_dump` before running the migration; to roll back,
  restore the dump. Verified by MIG-01 (counts and links of existing rows
  unchanged after migration).

### Seed (idempotent)
- Upserts keyed by stable values (email, Ticket summary prefix `SEED-L4-`),
  safe to run repeatedly without duplicating rows.
- Tickets covering all 8 statuses, all 3 IT Priorities, assigned and
  unassigned ownership.
- Tickets with zero, one, and several Actions Taken, including one Ticket
  whose actions were performed by different IT Staff members.
- One Requester with no Tickets and one IT Staff user with no assignments,
  to demonstrate zero metrics and empty states.

## 8. API Contract

See `docs/lab-04/api-spec.md` for request/response shapes. New and changed
endpoints:
- `GET /api/staff/tickets/:id/actions`, `POST /api/staff/tickets/:id/actions`,
  `PATCH /api/staff/tickets/:id/actions/:actionId`
- `GET /api/tickets/:id/actions` (Requester, own Tickets, read-only)
- `PATCH /api/staff/tickets/:id/status` — **changed**: requires
  `expectedVersion`, enforces role matrix and resolution gate, writes history
- `PATCH /api/tickets/:id/reopen` (Requester, own Tickets)
- `GET /api/staff/tickets/:id/history`, `GET /api/tickets/:id/history`
- `GET /api/dashboard/requester`, `GET /api/dashboard/staff`
- `GET /api/tickets` and `GET /api/staff/tickets` — **changed**: accept a
  `status` filter including the value `ACTIVE` (BR-18) for drill-down
- `GET /api/staff/tickets/:id` and `GET /api/tickets/:id` — **changed**:
  include `version`

Error codes used across Lab 4: 400 validation (`VALIDATION`), 400 invalid
transition (`INVALID_TRANSITION`), 400 resolution gate (`RESOLUTION_GATE`),
401, 403, 404, 409 stale update (`STALE_UPDATE`).

### Ticket Status Transition Matrix

| From | To | Who may perform it |
|---|---|---|
| New | Open, In Progress, Cancelled | IT Staff, Administrator |
| Open | In Progress, Waiting for Requester, Cancelled | IT Staff, Administrator |
| In Progress | Open, Waiting for Requester, Resolved (gate BR-11), Cancelled | IT Staff, Administrator |
| Waiting for Requester | Open, In Progress, Cancelled | IT Staff, Administrator |
| Resolved | In Progress, Closed | IT Staff, Administrator |
| Resolved | Reopened | IT Staff, Administrator, owning Requester |
| Closed | Reopened | IT Staff, Administrator, owning Requester |
| Reopened | Open, In Progress, Cancelled | IT Staff, Administrator |
| Cancelled | — (terminal) | — |

### Authorization Matrix (Lab 4 additions)

| Endpoint | Requester | IT Staff | Administrator |
|---|---|---|---|
| GET /api/staff/tickets/:id/actions | ❌ | ✅ | ✅ |
| POST /api/staff/tickets/:id/actions | ❌ | ✅ | ✅ |
| PATCH /api/staff/tickets/:id/actions/:actionId | ❌ | ✅ | ✅ |
| GET /api/tickets/:id/actions | ✅ (own) | ❌ | ❌ |
| PATCH /api/staff/tickets/:id/status | ❌ | ✅ | ✅ |
| PATCH /api/tickets/:id/reopen | ✅ (own) | ❌ | ❌ |
| GET /api/staff/tickets/:id/history | ❌ | ✅ | ✅ |
| GET /api/tickets/:id/history | ✅ (own) | ❌ | ❌ |
| GET /api/dashboard/requester | ✅ | ❌ | ❌ |
| GET /api/dashboard/staff | ❌ | ✅ | ✅ (+ user counts) |

All Lab 3 authorization rules remain unchanged.

## 9. Acceptance Criteria

- AC-01: Given a permitted IT Staff user and valid data, when an Action
  Taken is created, then it is saved under the correct Ticket with the
  authenticated user as Performed by and the approved assignee.
- AC-02: Given an authenticated Requester, when dashboard data is
  retrieved, then only metrics and recent Tickets owned by that Requester
  are returned.
- AC-03: Given Follow-Up Required is checked, when an Action Taken is saved
  without a Follow-up Note, then it is rejected with a field error and not
  saved.
- AC-04: Given an inactive or non-staff assignee, when an Action Taken is
  created or edited, then it is rejected and not saved.
- AC-05: Given a Requester, when they call any Action Taken create or edit
  endpoint directly, then the request is rejected with 403.
- AC-06: Given a Requester, when they view their own Ticket, then all of its
  Actions Taken are shown read-only; when they request another Requester's
  Actions Taken, then the request is rejected with 403.
- AC-07: Given a Ticket that fails the resolution gate, when IT Staff sets
  it to Resolved (through the UI or directly through the API), then the
  request is rejected and the status is unchanged.
- AC-08: Given a Ticket that satisfies the resolution gate, when IT Staff
  sets it to Resolved, then the status changes and one history entry is
  recorded.
- AC-09: Given a transition outside the matrix or by an unauthorized role,
  when it is attempted, then it is rejected and the status is unchanged.
- AC-10: Given two users viewing the same Ticket or Action Taken, when the
  second user saves using an older version, then the save is rejected with
  409 and the first user's change is preserved.
- AC-11: Given a Requester marks the problem as appearing resolved, when the
  Ticket is read again, then its status is unchanged.
- AC-12: Given several status changes on a Ticket, when the history is
  requested, then entries are returned in stable time order and no endpoint
  can edit or delete them.
- AC-13: Given seeded data, when the IT Staff Dashboard is retrieved, then
  every count equals the matching database query and each card links to a
  list showing the same records.
- AC-14: Given a user with no matching records, when a dashboard is opened,
  then counts show 0 and lists show an empty-state message without errors.
- AC-15: Given a Requester with Resolved or Closed Tickets, when they reopen
  one of their own Tickets, then its status becomes Reopened; reopening
  someone else's Ticket is rejected with 403.
- AC-16: Given existing Lab 1–3 data, when the Lab 4 migration runs, then
  all earlier records remain present and linked.
- AC-17: Given the final `main` branch, when all Lab 1–3 automated tests
  run, then they pass.
- AC-18: Given the Lab 4 screens at desktop, tablet, and mobile widths, when
  inspected, then there is no clipping, overlap, or horizontal scrolling,
  focus is visible, controls work by keyboard, and status is not conveyed by
  color alone.
- AC-19: Given a user double-clicks Save or the network fails, when an
  Action Taken is submitted, then at most one record is created and entered
  data is kept after a recoverable failure.

## 10. Definition of Done

- Every FR, BR, and AC above is implemented and traced to at least one
  passing test in `tests.md`; every planned test is marked Pass.
- Backend, frontend, and E2E suites pass on the final `main` branch, and
  the full output is captured as evidence.
- Every write operation is enforced by the backend; no rule relies on hiding
  a control in the UI.
- The Lab 4 migration runs on a database containing Lab 3 data without data
  loss; the seed is idempotent.
- Desktop, tablet, and mobile screenshots exist for every new Lab 4 screen,
  and the visual/accessibility checklist in `tests.md` is complete.
- No console errors, broken links, placeholder text, unfinished controls, or
  duplicated/obsolete UI from earlier labs remain.
- README covers setup, migration, seed, test commands, and demo accounts.
- Each Issue was merged through a peer-reviewed PR into `lab4-staging`,
  then released to `main` through one release PR; `reviewer.md` and
  `ai-use.md` are complete and all Issues are Done on the project board.

## 11. Assumptions and Decisions

- **Assignee and action status:** the handout's field list does not name
  an assignee or an action status, but its acceptance example ("approved
  assignee") and the Part 6 evidence ("assign, complete, cancel,
  inactive-assignee rejection") require them. Lab 4 therefore adds
  `assigneeId` and `ActionStatus`.
- **Resolution gate content:** "at least one Completed action, no Planned
  action, and an owner" was chosen because it proves recorded work exists
  and nothing is still pending, without blocking on follow-up notes (a
  completed action may legitimately recommend follow-up later).
- **No deletion:** Actions Taken are cancelled rather than deleted so the
  work record stays auditable, matching the append-only treatment of
  comments, notes, and status history.
- **Requester reopen:** Requesters may reopen their own Resolved/Closed
  Tickets because the stakeholder wants IT Staff to formally update
  Tickets, but a Requester must be able to say the problem came back.
  Requesters still cannot resolve, close, or cancel.
- **Recent window:** a rolling 7 × 24-hour window avoids time-zone
  boundary ambiguity; display uses Asia/Bangkok.
- **Conflict scope:** stale-update checks cover Ticket status changes and
  Action Taken edits, where silent overwrites would lose workflow decisions.
  Owner and IT Priority changes keep last-write-wins behavior from Lab 3.
- **Forbidden screen:** a signed-in user on a wrong-role route sees a
  Forbidden screen instead of the Login redirect used in Lab 3, so they are
  not misled into thinking they were signed out.
