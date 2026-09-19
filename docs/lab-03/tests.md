# Lab 3 Test Plan and Results

## 1. Test Strategy

Tests are planned from `specification.md` before implementation. Authorization
tests are treated as first-class alongside functional tests, since the
handout's central requirement is that every protected operation is enforced
server-side. Migration/regression tests confirm Lab 2 data and behavior
survive the Lab 3 changes untouched.

## 2. Planned Tests

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| API-01 | API | AC-01 | Valid login | Authenticated response; safe user data | `server/tests/lab-03/auth.api.test.ts` | Pass |
| API-02 | API | AC-05 | Invalid password login | Generic "Invalid email or password" | `server/tests/lab-03/auth.api.test.ts` | Pass |
| API-03 | API | AC-05, BR-06 | Login with unknown email | Same generic message as API-02 | `server/tests/lab-03/auth.api.test.ts` | Pass |
| API-04 | API | AC-06 | Login to inactive account | Same generic message; access denied | `server/tests/lab-03/auth.api.test.ts` | Pass |
| API-05 | API | FR-05 | Logout | Session cookie cleared; protected route then returns 401 | `server/tests/lab-03/auth.api.test.ts` | Pass |
| API-06 | API | AC-07 | Access protected route with no session | 401 returned | `server/tests/lab-03/auth.api.test.ts` | Pass |
| API-07 | API | FR-04 | GET /api/auth/me while authenticated | Returns correct identity and role | `server/tests/lab-03/auth.api.test.ts` | Pass |
| API-08 | API | AC-02, BR-02 | Access any screen before password change | Redirect to Change Password until a valid change is saved (enforced by the frontend per `api-spec.md`) | `client/src/components/ProtectedRoute.test.tsx`, `e2e/lab-03/first-login.spec.ts` | Pass |
| API-09 | API | BR-08 | Change password with weak new password | 400; password-rule error | `server/tests/lab-03/auth.api.test.ts` | Pass |
| SEC-01 | Security | AC-03, BR-03 | Requester supplies another requesterId | Backend ignores it; own data only | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| SEC-02 | Security | AC-04, BR-16 | Requester requests Internal Notes | 403; no note content returned | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| SEC-03 | Security | FR-09 | Requester calls GET /api/staff/tickets | 403 | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| SEC-04 | Security | AC-13 | Non-Administrator calls /api/admin/users | 403 on every admin endpoint | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| SEC-05 | Security | FR-10-12 | IT Staff-only endpoints called by Requester | 403 on owner/priority/status changes | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| API-10 | API | FR-09 | Staff queue search/filter/sort/pagination | Correct filtered, paginated result | `server/tests/lab-03/staff-queue.api.test.ts` | Pass |
| API-11 | API | AC-08 | IT Staff claims unassigned ticket | ticketOwnerId set to claimer | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| API-12 | API | BR-12 | IT Staff sets IT Priority | itPriority updated; requestedPriority unchanged | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| API-13 | API | AC-09, BR-13 | Invalid status transition (New→Closed) | 400; status unchanged | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| API-14 | API | BR-13 | Valid status transition (New→Open) | 200; status updated | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| API-15 | API | FR-13, BR-15 | Empty Internal Note content | 400; not saved | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| API-16 | API | FR-07, BR-04 | Public Comment visible to Requester and Staff | 200; comment retrievable by both roles | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| API-17 | API | FR-08, BR-05 | Requester marks problem resolved | Flag set; currentStatus unchanged | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| API-18 | API | FR-14 | Admin lists/searches users | Correct filtered list | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| API-19 | API | AC-12, BR-10 | Create user with duplicate email | 400; field error | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| API-20 | API | FR-17 | Reset user's initial password | mustChangePassword becomes true | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| API-21 | API | AC-10, BR-17 | Admin deactivates own account | 400; rejected | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| API-22 | API | AC-11, BR-18 | Deactivate the last active Administrator | 400; rejected | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| MIG-01 | Migration | AC-14, BR-20 | Run Lab 3 migration against Lab 2 seed data | All migrations applied; Ticket and Attachment rows still linked to their Requester/ticket | `server/tests/lab-03/migration.api.test.ts` | Pass |
| REG-01 | Regression | FR-06 | Lab 2 Create Ticket flow under real auth | Ticket created with authenticated owner | `server/tests/lab-02/create-ticket.api.test.ts`, `server/tests/lab-03/authorization.api.test.ts` | Pass |
| REG-02 | Regression | FR-06 | Lab 2 My Tickets under real auth | Only authenticated Requester's tickets returned | `server/tests/lab-02/my-tickets.api.test.ts` | Pass |
| UI-01 | UI | AC-05 | Login form shows generic error | Error message rendered; password preserved cleared per UX norm | `client/src/pages/Login.test.tsx` | Pass |
| UI-02 | UI | AC-02 | Change Password screen blocks navigation | Redirect back until valid change saved | `client/src/components/ProtectedRoute.test.tsx`, `client/src/pages/ChangePassword.test.tsx` | Pass |
| UI-03 | UI | FR-09 | Staff Queue renders with badges | Status/priority/owner badges render correctly | `client/src/pages/StaffTicketQueue.test.tsx` | Pass |
| UI-04 | UI | BR-04 | Internal Notes tab visually distinct | Amber "Staff only" styling present, separate from comments | `client/src/pages/StaffTicketDetail.test.tsx` | Pass |
| UI-05 | UI | AC-12 | User Management shows duplicate-email error | Field error rendered; user not created | `client/src/pages/UserManagement.test.tsx` | Pass |
| E2E-01 | E2E | AC-01, AC-07 | Login → use app → logout → direct access blocked | Redirected to Login after logout | `e2e/lab-03/authentication.spec.ts` | Pass |
| E2E-02 | E2E | AC-02 | Initial password login and change | Normal app opens only after valid change | `e2e/lab-03/first-login.spec.ts` | Pass |
| E2E-03 | E2E | AC-08 | IT Staff claims and resolves a ticket end-to-end | Queue → Detail → claim → status change reflected | `e2e/lab-03/staff-ticket-flow.spec.ts` | Pass |
| E2E-04 | E2E | FR-15-17 | Admin creates and edits a user | New user appears in list with correct role | `e2e/lab-03/user-administration.spec.ts` | Pass |
| RESP-01..09 | Responsive | Section 8.7 | Login, Staff Queue, Staff Detail, User Mgmt at 3 viewports | No clipping/overlap/horizontal scroll | Playwright screenshots under `artifacts/lab-03/screenshots/` | Pass |

## 3. Acceptance-Criterion Traceability

| AC | Covered By |
|---|---|
| AC-01 | API-01, E2E-01 |
| AC-02 | API-08, UI-02, E2E-02 |
| AC-03 | SEC-01 |
| AC-04 | SEC-02 |
| AC-05 | API-02, API-03, UI-01 |
| AC-06 | API-04 |
| AC-07 | API-06, E2E-01 |
| AC-08 | API-11, E2E-03 |
| AC-09 | API-13 |
| AC-10 | API-21 |
| AC-11 | API-22 |
| AC-12 | API-19, UI-05 |
| AC-13 | SEC-04 |
| AC-14 | MIG-01 |

## 4. Responsive and Visual Checklist

- [x] No clipped labels at any viewport across all Lab 3 screens
- [ ] No overlapping validation messages
- [x] No unintended horizontal scrolling at mobile width
- [x] Role-based navigation never shows a destination the current role
      cannot access
- [x] Status / Requested Priority / IT Priority / Role badges are visually
      consistent across Queue, Ticket Detail, and User Management
- [x] Public Comments and Internal Notes remain visually distinguishable at
      every viewport
- [x] Editable vs. read-only field styling stays consistent with Lab 2

## 5. Test Commands

```powershell
# Backend
cd server
npm run test

# Frontend
cd client
npm run test

# End-to-end + responsive screenshots
npx playwright test
```

## 6. Final Results

Run on branch `feature/7-responsive-e2eLab3` (2026-09-19):

```
Backend:  89/89 passing  (18 files)
Frontend: 31/31 passing  (10 files)
E2E:      34/34 passing  (23 Lab 3 specs + 11 Lab 2 regression specs, incl. 12 Lab 3 screenshots)
```

Responsive review (RESP-01..09): all 12 screenshots opened and compared at 1280 / 820 / 375 px.
Page width equals the viewport width in all 12, so there is no horizontal scroll. Issues found and fixed
during the review:

- Staff Queue overflowed at 820 px (9-column table) and its filter labels were clipped; the table now
  shows from 992 px up and the card layout is used below it.
- User Management overflowed at 375 px (long emails); the table is scrollable and emails wrap.
- Shell navigation showed "My Tickets / Create Ticket" to IT Staff and Administrators; each role now
  sees only its own links.

Not verified: "No overlapping validation messages" is left unchecked because the screenshots do not
capture error states (validation messages are asserted by unit and E2E tests, not by image).

## 7. Known Limitations or Deferred Tests

- Load testing of the Staff Queue with large ticket volumes is out of scope.
- Multi-factor authentication and password-reset-by-email flows are
  explicitly excluded from Lab 3 and therefore untested.
- Actions Taken and its resolution-blocking rule are deferred to Lab 4.
- API-08: the server does not reject API calls from a user whose `mustChangePassword` is still true;
  per `api-spec.md` the frontend performs the redirect (ProtectedRoute + E2E-02).
- API-05: logout clears the session cookie; sessions are stateless JWTs, so a token copied before logout
  stays valid until it expires.
- MIG-01 checks the current database (all migrations applied; Lab 2 rows intact) rather than replaying the
  migrations against a fresh Lab 2 database.
