# Lab 2 Test Plan and Results

## 1. Test Strategy

Tests are planned from `specification.md` before implementation, following
Test-Driven Development for API and unit-level logic: write the failing test
first, implement the minimum code to pass it, then refactor. UI, responsive,
and E2E tests are added alongside each screen's implementation and verified
against `ui-spec.md`, not personal memory of the design.

## 2. Planned Tests

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| UNIT-01 | Unit | BR-01 | Ticket Number generator format | Returns `TKT-YYYY-NNNNNN` | `server/src/utils/ticketNumber.test.ts` | Pending |
| API-01 | API | AC-01 | Create valid ticket | 201; ticket saved; number returned | `server/tests/lab-02/create-ticket.api.test.ts` | Pending |
| API-02 | API | AC-04, BR-06 | Create ticket with empty Summary | 400; field error; no ticket saved | `server/tests/lab-02/create-ticket.api.test.ts` | Pending |
| API-03 | API | BR-08 | Create ticket with invalid priority | 400; field error | `server/tests/lab-02/create-ticket.api.test.ts` | Pending |
| API-04 | API | AC-03, BR-05 | Requester B fetches Requester A's ticket | 403/404; no data returned | `server/tests/lab-02/ticket-detail.api.test.ts` | Pending |
| API-05 | API | FR-04, FR-05 | List tickets filtered by search term | Only matching tickets returned | `server/tests/lab-02/my-tickets.api.test.ts` | Pending |
| API-06 | API | FR-08 | List tickets pagination | Correct page size and total count | `server/tests/lab-02/my-tickets.api.test.ts` | Pending |
| API-07 | API | AC-08, BR-12 | Upload 6th attachment to a ticket with 5 active | 400; rejection message | `server/tests/lab-02/attachments.api.test.ts` | Pending |
| API-08 | API | AC-10, BR-13 | Upload unsupported file type | 400; no file stored | `server/tests/lab-02/attachments.api.test.ts` | Pending |
| API-09 | API | AC-09, BR-14 | Download a soft-removed attachment | 404; file not served | `server/tests/lab-02/attachments.api.test.ts` | Pending |
| API-10 | API | FR-12, BR-14 | Soft-remove an attachment with reason | 200; isRemoved true; reason stored | `server/tests/lab-02/attachments.api.test.ts` | Pending |
| API-11 | API | BR-04 | List active Development Requesters | Inactive requester excluded | `server/tests/lab-02/requesters.api.test.ts` | Pending |
| UI-01 | UI | AC-11 | Requester Selection loading state | Loading indicator shown before data | `client/src/.../RequesterSelection.test.tsx` | Pending |
| UI-02 | UI | AC-12 | Requester Selection with only inactive requester | Empty-state message shown | `client/src/.../RequesterSelection.test.tsx` | Pending |
| UI-03 | UI | AC-04 | Submit Create Ticket without Summary | Field message shown; API not called | `client/src/.../CreateTicket.test.tsx` | Pending |
| UI-04 | UI | AC-01 | Submit valid Create Ticket | Success state shows Ticket Number | `client/src/.../CreateTicket.test.tsx` | Pending |
| UI-05 | UI | AC-05 | Submit Create Ticket during backend failure | Safe error; form values preserved | `client/src/.../CreateTicket.test.tsx` | Pending |
| UI-10 | UI | AC-14, BR-2A | Double-click Submit on valid form | Only one POST /api/tickets call is made | `client/src/.../CreateTicket.test.tsx` | Pending |
| UI-06 | UI | AC-06 | My Tickets with zero tickets | Empty state shown | `client/src/.../MyTickets.test.tsx` | Pending |
| UI-07 | UI | AC-07 | My Tickets search with no matches | No-results state shown | `client/src/.../MyTickets.test.tsx` | Pending |
| UI-08 | UI | FR-09 | Ticket Detail read-only rendering | Fields render as non-editable | `client/src/.../RequesterTicketDetail.test.tsx` | Pending |
| UI-09 | UI | AC-09 | Attachment section shows removed state | Removed attachment has no download control | `client/src/.../AttachmentSection.test.tsx` | Pending |
| RESP-01 | Responsive | AC-13 | Create Ticket at mobile viewport | Fields stack; no horizontal scroll | Playwright screenshot: `create-ticket/mobile.png` | Pending |
| RESP-02 | Responsive | Section 8.7 | My Tickets at tablet viewport | Two-column layout; usable filters | Playwright screenshot: `my-tickets/tablet.png` | Pending |
| RESP-03 | Responsive | Section 8.7 | Ticket Detail at desktop viewport | Multi-column layout; centered content | Playwright screenshot: `ticket-detail/desktop.png` | Pending |
| E2E-01 | E2E | AC-01, FR-04 | Complete responsive submission flow | Confirmation shows official number; ticket appears in My Tickets | `e2e/lab-02/requester-ticket-flow.spec.ts` | Pending |
| E2E-02 | E2E | AC-03 | Switch Requester and verify isolation | Requester A's tickets disappear when Requester B is active | `e2e/lab-02/requester-ticket-flow.spec.ts` | Pending |

## 3. Acceptance-Criterion Traceability

| AC | Covered By |
|---|---|
| AC-01 | API-01, UI-04, E2E-01 |
| AC-02 | (frontend routing guard — add test file when implemented) |
| AC-03 | API-04, E2E-02 |
| AC-04 | API-02, UI-03 |
| AC-05 | UI-05 |
| AC-06 | UI-06 |
| AC-07 | UI-07 |
| AC-08 | API-07 |
| AC-09 | API-09, UI-09 |
| AC-10 | API-08 |
| AC-11 | UI-01 |
| AC-12 | UI-02, API-11 |
| AC-13 | RESP-01 |
| AC-14 | UI-10 |

## 4. Responsive and Visual Checklist

- [ ] No clipped labels at any viewport
- [ ] No overlapping validation messages
- [ ] No unintended horizontal scrolling at mobile width
- [ ] Editable vs. read-only field styling is visually consistent across screens
- [ ] Priority and status badges use consistent colors/shapes across My Tickets and Ticket Detail
- [ ] Filters, pagination, and attachment controls remain usable at all three viewports
- [ ] Screenshots compared against `ui-spec.md`, not personal memory

## 5. Test Commands

```powershell
# Backend (Supertest + unit)
cd server
npm run test

# Frontend (Vitest)
cd client
npm run test

# End-to-end + responsive screenshots (Playwright)
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

- Concurrency testing of Ticket Number generation under simultaneous requests
  is deferred; current implementation uses a simple count-based sequence
  (see `specification.md` Section 11).
- Load/performance testing of pagination with large datasets is out of scope
  for Lab 2.