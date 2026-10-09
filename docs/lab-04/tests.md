# Lab 4 Test Plan and Results

## 1. Test Strategy

Tests are planned from `specification.md` before implementation (Test DD)
and the business rules are driven test-first (TDD): each rule in
Section 5 of the specification gets a failing unit or API test before its
code is written. Authorization, workflow, and stale-update tests are
first-class. All Lab 1–3 automated tests stay in the suite as regression
coverage, and the backend and E2E suites re-seed the dev users before
running so they are repeatable.

Levels:
- **Unit** — pure rule functions (transition matrix with roles, resolution
  gate, Action Taken validation, dashboard window helpers).
- **API / integration** — Supertest against the Express app and the
  PostgreSQL test database.
- **UI component** — Vitest + Testing Library with mocked `fetch`.
- **UI style / responsive / accessibility** — Playwright screenshots at three
  viewports, page-width overflow checks, keyboard checks, and the checklist
  in Section 4.
- **E2E** — Playwright through the real frontend and backend.
- **Performance smoke** — dashboard endpoints respond within a time budget on
  seeded data.

## 2. Planned Tests

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| UNIT-01 | Unit | BR-12, BR-13, BR-14 | Transition matrix by role | Every permitted (from, to, role) returns true; every other combination false; Cancelled has no exits | `server/src/validation/statusTransitions.test.ts` | Pending |
| UNIT-02 | Unit | BR-11 | Resolution gate function | Fails with the correct reasons for no owner / no completed action / planned actions remaining; passes when all met | `server/src/validation/resolutionGate.test.ts` | Pending |
| UNIT-03 | Unit | BR-06, BR-07, BR-08 | Action Taken validation | Required description, length limits, follow-up note required only when needed, date bounds | `server/src/validation/actionTaken.test.ts` | Pending |
| UNIT-04 | Unit | BR-18, BR-19 | ACTIVE status set and recent window helper | ACTIVE contains exactly 5 statuses; window boundary is 7 × 24 h | `server/src/validation/dashboardRules.test.ts` | Pending |
| API-01 | API | AC-01, FR-01, FR-02 | Create a valid Action Taken | 201; saved under the correct Ticket; `performedBy` = caller; status Planned | `server/tests/lab-04/actions-taken.api.test.ts` | Pending |
| API-02 | API | BR-04 | Client-supplied `performedById`/`ticketId` ignored | Saved with caller and path Ticket | `server/tests/lab-04/actions-taken.api.test.ts` | Pending |
| API-03 | API | AC-01, BR-02, BR-05 | Assignee defaults to creator; may be a different active staff member | 201 with the expected assignee | `server/tests/lab-04/actions-taken.api.test.ts` | Pending |
| API-04 | API | AC-04, BR-05 | Inactive or Requester assignee | 400 `VALIDATION`; nothing saved | `server/tests/lab-04/actions-taken.api.test.ts` | Pending |
| API-05 | API | AC-03, BR-07 | Follow-Up Required without note | 400 with `fields.followUpNote`; nothing saved | `server/tests/lab-04/actions-taken.api.test.ts` | Pending |
| API-06 | API | BR-06, BR-08 | Empty description, over-length fields, date before Ticket creation / in the future | 400 `VALIDATION` | `server/tests/lab-04/actions-taken.api.test.ts` | Pending |
| API-07 | API | FR-03 | List Actions Taken for a Ticket | Stable order by `actionAt`, then id; empty array for none | `server/tests/lab-04/actions-taken.api.test.ts` | Pending |
| API-08 | API | FR-04, BR-09 | Edit a Planned action, then complete it | 200; version increments; completing without result → 400 | `server/tests/lab-04/actions-taken.api.test.ts` | Pending |
| API-09 | API | BR-09 | Cancel an action; edit a Completed/Cancelled action | Cancel → 200; later edit → 400 | `server/tests/lab-04/actions-taken.api.test.ts` | Pending |
| API-10 | API | AC-10, BR-17 | Edit an action with an old `expectedVersion` | 409 `STALE_UPDATE`; stored data unchanged | `server/tests/lab-04/actions-taken.api.test.ts` | Pending |
| API-11 | API | BR-10 | Add/edit action on a Closed or Cancelled Ticket | 400 `TICKET_LOCKED` | `server/tests/lab-04/actions-taken.api.test.ts` | Pending |
| API-12 | API | BR-01 | Action id that belongs to another Ticket | 404 | `server/tests/lab-04/actions-taken.api.test.ts` | Pending |
| API-13 | API | BR-23 | Creating an action refreshes Ticket `updatedAt` | `updatedAt` is later than before | `server/tests/lab-04/actions-taken.api.test.ts` | Pending |
| SEC-01 | Security | AC-05, BR-03 | Requester calls create/edit action endpoints | 403; nothing saved | `server/tests/lab-04/actions-taken.api.test.ts` | Pending |
| SEC-02 | Security | AC-06, FR-05 | Requester reads actions of own vs. another Requester's Ticket | Own → 200 full list; other → 403 | `server/tests/lab-04/actions-taken.api.test.ts` | Pending |
| WF-01 | API | AC-07, FR-07, BR-11 | Resolve a Ticket failing the gate (no owner / no completed / planned remaining) | 400 `RESOLUTION_GATE` with reasons; status unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pending |
| WF-02 | API | AC-08, BR-11, BR-16 | Resolve a Ticket satisfying the gate | 200; status Resolved; one history entry | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pending |
| WF-03 | API | AC-09, BR-12 | Transitions outside the matrix (e.g. New → Closed, Cancelled → Open) | 400 `INVALID_TRANSITION`; status unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pending |
| WF-04 | API | AC-10, FR-10, BR-17 | Status change with an old `expectedVersion` | 409 `STALE_UPDATE`; status unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pending |
| WF-05 | API | AC-15, FR-08, BR-13 | Requester reopens own Resolved/Closed Ticket; tries another's; tries from Open | 200 Reopened / 403 / 400 | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pending |
| WF-06 | API | AC-11, FR-11, BR-15 | Requester marks "appears resolved" | Flag true, status unchanged; reopening clears the flag | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pending |
| WF-07 | API | AC-12, FR-09, BR-16 | History after several changes | Entries in time order with actor; no edit/delete route exists (404/405) | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pending |
| SEC-03 | Security | BR-13, AC-09 | Requester calls the staff status endpoint | 403 | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pending |
| DASH-01 | API | AC-02, BR-21 | Requester dashboard scope | Counts and list contain only the caller's Tickets | `server/tests/lab-04/requester-dashboard.api.test.ts` | Pending |
| DASH-02 | API | FR-12, BR-18, BR-19 | Requester metric calculations | Each metric equals an independent Prisma query | `server/tests/lab-04/requester-dashboard.api.test.ts` | Pending |
| DASH-03 | API | AC-14, BR-22 | Requester with no Tickets | All counts 0, list `[]`, 200 | `server/tests/lab-04/requester-dashboard.api.test.ts` | Pending |
| DASH-04 | API | AC-13, FR-13, BR-20 | Staff dashboard calculations | Every metric, `byStatus`, `byItPriority`, and list equals an independent Prisma query | `server/tests/lab-04/staff-dashboard.api.test.ts` | Pending |
| DASH-05 | API | AC-13, FR-15, FR-16 | Drill-down parity | Queue/My Tickets with the card's query parameters return the same count as the card | `server/tests/lab-04/staff-dashboard.api.test.ts` | Pending |
| DASH-06 | API | AC-14, BR-22, BR-24 | Staff user with no assignments; list limits | 0 / `[]` where expected; lists ≤ 5 items | `server/tests/lab-04/staff-dashboard.api.test.ts` | Pending |
| DASH-07 | API | FR-14 | Administrator gets `userCounts`; IT Staff does not | Present / absent | `server/tests/lab-04/staff-dashboard.api.test.ts` | Pending |
| SEC-04 | Security | AC-02, BR-21 | Wrong roles on dashboards | Requester → staff dashboard 403; staff → requester dashboard 403; no session → 401 | `server/tests/lab-04/staff-dashboard.api.test.ts` | Pending |
| PERF-01 | Perf-smoke | BR-20 | Dashboard response time on seeded data | Each dashboard endpoint < 500 ms | `server/tests/lab-04/staff-dashboard.api.test.ts` | Pending |
| MIG-01 | Migration | AC-16, BR-25 | Lab 4 migration preserves earlier data | All migrations applied; Users, Tickets, Attachments, Comments, Notes still linked; legacy Tickets have version 1 | `server/tests/lab-04/migration.api.test.ts` | Pending |
| MIG-02 | Migration | BR-25 | Seed is idempotent | Running the seed twice does not change row counts | `server/tests/lab-04/migration.api.test.ts` | Pending |
| REG-01 | Regression | AC-17, FR-17 | All Lab 1–3 backend tests | Pass unchanged | `server/tests/lab-01..03/*`, `server/src/**/*.test.ts` | Pending |
| REG-02 | Regression | AC-17, FR-17 | All Lab 1–3 frontend and E2E tests | Pass unchanged (updated only for the new Dashboard landing page) | `client/src/**/*.test.tsx`, `e2e/lab-02`, `e2e/lab-03` | Pending |
| UI-01 | UI | FR-13, FR-15 | Staff Dashboard renders metrics and links | Cards show values; each card links to the documented URL | `client/tests/lab-04/StaffDashboard.test.tsx` | Pending |
| UI-02 | UI | AC-14, FR-18 | Staff Dashboard loading / empty / error | Skeleton, zero values, empty messages, safe error with Retry | `client/tests/lab-04/StaffDashboard.test.tsx` | Pending |
| UI-03 | UI | FR-12, FR-15 | Requester Dashboard renders metrics and links | Cards and Recently Updated rows link correctly | `client/tests/lab-04/RequesterDashboard.test.tsx` | Pending |
| UI-04 | UI | AC-14 | Requester Dashboard empty state | "No ticket activity yet." and 0 values | `client/tests/lab-04/RequesterDashboard.test.tsx` | Pending |
| UI-05 | UI | FR-01, AC-03 | Actions Taken create form | Follow-up Note appears and is required only when checked; field error shown | `client/tests/lab-04/ActionsTaken.test.tsx` | Pending |
| UI-06 | UI | FR-04, BR-09 | Actions Taken view/edit modes | Planned editable with Complete/Cancel; Completed/Cancelled read-only | `client/tests/lab-04/ActionsTaken.test.tsx` | Pending |
| UI-07 | UI | AC-06, FR-05 | Requester read-only Actions list | List shown; no add/edit/complete/cancel controls rendered | `client/tests/lab-04/ActionsTaken.test.tsx` | Pending |
| UI-08 | UI | AC-19, FR-19 | Duplicate submit and failure recovery | Save disabled while pending (one request); entered values kept after a failed save | `client/tests/lab-04/ActionsTaken.test.tsx` | Pending |
| UI-09 | UI | FR-06, BR-13 | Status control options by role | Only permitted transitions listed with readable labels | `client/tests/lab-04/TicketWorkflow.test.tsx` | Pending |
| UI-10 | UI | AC-07 | Resolution gate message | Missing conditions shown; server `reasons` displayed on 400 | `client/tests/lab-04/TicketWorkflow.test.tsx` | Pending |
| UI-11 | UI | AC-10 | 409 conflict | Conflict banner with Reload; latest data fetched | `client/tests/lab-04/TicketWorkflow.test.tsx` | Pending |
| UI-12 | UI | FR-20 | Wrong-role route | Forbidden screen with "Go to Dashboard", not Login | `client/tests/lab-04/TicketWorkflow.test.tsx` | Pending |
| E2E-01 | E2E | AC-01, AC-06 | Two IT Staff record different actions on one Ticket; Requester sees both read-only | Both actions listed with correct Performed by; Requester has no edit controls | `e2e/lab-04/actions-taken-flow.spec.ts` | Pending |
| E2E-02 | E2E | AC-07, AC-08, AC-15 | Full lifecycle: create → claim → action → gate blocked → complete → Resolved → Closed → Requester reopens | Each step reflected in status badge and history | `e2e/lab-04/ticket-resolution.spec.ts` | Pending |
| E2E-03 | E2E | AC-02, AC-13 | Dashboards drill down | Clicking each card opens a filtered list with the same number of rows | `e2e/lab-04/dashboards.spec.ts` | Pending |
| RESP-01..09 | Responsive | AC-18 | Staff Dashboard, Requester Dashboard, Actions Taken at 1280 / 820 / 375 | No clipping, overlap, or horizontal scroll (page width = viewport) | `e2e/lab-04/visual-screenshots.spec.ts` → `artifacts/lab-04/screenshots/` | Pending |
| A11Y-01 | Accessibility | AC-18 | Keyboard and semantics on Lab 4 screens | Cards and controls reachable by Tab with visible focus; labels bound; `aria-current` on nav | `e2e/lab-04/dashboards.spec.ts` + checklist | Pending |

## 3. Acceptance-Criterion Traceability

| AC | Covered By |
|---|---|
| AC-01 | API-01, API-03, E2E-01 |
| AC-02 | DASH-01, SEC-04, E2E-03 |
| AC-03 | API-05, UI-05 |
| AC-04 | API-04 |
| AC-05 | SEC-01 |
| AC-06 | SEC-02, UI-07, E2E-01 |
| AC-07 | WF-01, UNIT-02, UI-10, E2E-02 |
| AC-08 | WF-02, E2E-02 |
| AC-09 | WF-03, SEC-03, UNIT-01 |
| AC-10 | API-10, WF-04, UI-11 |
| AC-11 | WF-06 |
| AC-12 | WF-07 |
| AC-13 | DASH-04, DASH-05, E2E-03 |
| AC-14 | DASH-03, DASH-06, UI-02, UI-04 |
| AC-15 | WF-05, E2E-02 |
| AC-16 | MIG-01 |
| AC-17 | REG-01, REG-02 |
| AC-18 | RESP-01..09, A11Y-01 |
| AC-19 | UI-08 |

## 4. Responsive, Visual, and Accessibility Checklist

- [ ] Zen Green tokens and badge styles are consistent across Dashboards,
      Queue, Ticket Detail, Actions Taken, and User Management
- [ ] Status, priority, role, action-status, and follow-up badges always
      include a text label (no color-only meaning)
- [ ] Dashboard cards show label + value + accessible drill-down link
- [ ] Actions Taken switches table → cards below 768 px with no lost fields
- [ ] Editable vs. read-only field styling matches Lab 2/3 (Completed and
      Cancelled actions use read-only style)
- [ ] Validation messages sit directly under their fields and never overlap
- [ ] Visible keyboard focus on every interactive element; logical tab order
- [ ] No clipped labels or text at any viewport
- [ ] No overlapping controls at any viewport
- [ ] No horizontal page scrolling at 375 px
- [ ] Public Comments and Internal Notes remain visually distinct
- [ ] Role navigation shows only permitted destinations; Dashboard is first
- [ ] No console errors, placeholder text, or leftover/duplicate UI elements

## 5. Test Commands

```powershell
# Backend (unit + API + regression)
cd server
npm run test

# Frontend (component tests)
cd client
npm run test

# End-to-end + responsive screenshots (from the repository root)
npx playwright test
```

## 6. Final Results

_Fill in after running all tests on the final `main` branch:_
```
Backend:  X/X passing
Frontend: X/X passing
E2E:      X/X passing
```

## 7. Known Limitations or Deferred Tests

- Load testing beyond the PERF-01 smoke budget is out of scope.
- Notification, SLA, and escalation behavior are excluded from Lab 4 and
  therefore untested.
- "Recently Resolved" counts only resolutions recorded after the Lab 4
  migration, because legacy Tickets have no status history.
