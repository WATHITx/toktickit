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
| API-01 | API | AC-01 | Valid login | Authenticated response; safe user data | `server/tests/lab-03/auth.api.test.ts` | Pending |
| API-02 | API | AC-05 | Invalid password login | Generic "Invalid email or password" | `server/tests/lab-03/auth.api.test.ts` | Pending |
| API-03 | API | AC-05, BR-06 | Login with unknown email | Same generic message as API-02 | `server/tests/lab-03/auth.api.test.ts` | Pending |
| API-04 | API | AC-06 | Login to inactive account | Same generic message; access denied | `server/tests/lab-03/auth.api.test.ts` | Pending |
| API-05 | API | FR-05 | Logout | Session/token invalidated | `server/tests/lab-03/auth.api.test.ts` | Pending |
| API-06 | API | AC-07 | Access protected route with no session | 401 returned | `server/tests/lab-03/auth.api.test.ts` | Pending |
| API-07 | API | FR-04 | GET /api/auth/me while authenticated | Returns correct identity and role | `server/tests/lab-03/auth.api.test.ts` | Pending |
| API-08 | API | AC-02, BR-02 | Access any screen before password change | 403/redirect until change-password completes | `server/tests/lab-03/auth.api.test.ts` | Pending |
| API-09 | API | BR-08 | Change password with weak new password | 400; password-rule error | `server/tests/lab-03/auth.api.test.ts` | Pending |
| SEC-01 | Security | AC-03, BR-03 | Requester supplies another requesterId | Backend ignores it; own data only | `server/tests/lab-03/authorization.api.test.ts` | Pending |
| SEC-02 | Security | AC-04, BR-16 | Requester requests Internal Notes | 403; no note content returned | `server/tests/lab-03/authorization.api.test.ts` | Pending |
| SEC-03 | Security | FR-09 | Requester calls GET /api/staff/tickets | 403 | `server/tests/lab-03/authorization.api.test.ts` | Pending |
| SEC-04 | Security | AC-13 | Non-Administrator calls /api/admin/users | 403 on every admin endpoint | `server/tests/lab-03/authorization.api.test.ts` | Pending |
| SEC-05 | Security | FR-10-12 | IT Staff-only endpoints called by Requester | 403 on owner/priority/status changes | `server/tests/lab-03/authorization.api.test.ts` | Pending |
| API-10 | API | FR-09 | Staff queue search/filter/sort/pagination | Correct filtered, paginated result | `server/tests/lab-03/staff-queue.api.test.ts` | Pending |
| API-11 | API | AC-08 | IT Staff claims unassigned ticket | ticketOwnerId set to claimer | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pending |
| API-12 | API | BR-12 | IT Staff sets IT Priority | itPriority updated; requestedPriority unchanged | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pending |
| API-13 | API | AC-09, BR-13 | Invalid status transition (New→Closed) | 400; status unchanged | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pending |
| API-14 | API | BR-13 | Valid status transition (New→Open) | 200; status updated | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pending |
| API-15 | API | FR-13, BR-15 | Empty Internal Note content | 400; not saved | `server/tests/lab-03/comments-notes.api.test.ts` | Pending |
| API-16 | API | FR-07, BR-04 | Public Comment visible to Requester and Staff | 200; comment retrievable by both roles | `server/tests/lab-03/comments-notes.api.test.ts` | Pending |
| API-17 | API | FR-08, BR-05 | Requester marks problem resolved | Flag set; currentStatus unchanged | `server/tests/lab-03/comments-notes.api.test.ts` | Pending |
| API-18 | API | FR-14 | Admin lists/searches users | Correct filtered list | `server/tests/lab-03/users-admin.api.test.ts` | Pending |
| API-19 | API | AC-12, BR-10 | Create user with duplicate email | 400; field error | `server/tests/lab-03/users-admin.api.test.ts` | Pending |
| API-20 | API | FR-17 | Reset user's initial password | mustChangePassword becomes true | `server/tests/lab-03/users-admin.api.test.ts` | Pending |
| API-21 | API | AC-10, BR-17 | Admin deactivates own account | 400; rejected | `server/tests/lab-03/users-admin.api.test.ts` | Pending |
| API-22 | API | AC-11, BR-18 | Deactivate the last active Administrator | 400; rejected | `server/tests/lab-03/users-admin.api.test.ts` | Pending |
| MIG-01 | Migration | AC-14, BR-20 | Run Lab 3 migration against Lab 2 seed data | Ticket.requesterId and Attachment rows unchanged | `server/tests/lab-03/migration.api.test.ts` | Pending |
| REG-01 | Regression | FR-06 | Lab 2 Create Ticket flow under real auth | Ticket created with authenticated owner | `server/tests/lab-03/auth.api.test.ts` | Pending |
| REG-02 | Regression | FR-06 | Lab 2 My Tickets under real auth | Only authenticated Requester's tickets returned | `server/tests/lab-03/authorization.api.test.ts` | Pending |
| UI-01 | UI | AC-05 | Login form shows generic error | Error message rendered; password preserved cleared per UX norm | `client/src/pages/Login.test.tsx` | Pending |
| UI-02 | UI | AC-02 | Change Password screen blocks navigation | Redirect back until valid change saved | `client/src/pages/ChangePassword.test.tsx` | Pending |
| UI-03 | UI | FR-09 | Staff Queue renders with badges | Status/priority/owner badges render correctly | `client/src/pages/StaffTicketQueue.test.tsx` | Pending |
| UI-04 | UI | BR-04 | Internal Notes tab visually distinct | Amber "Staff only" styling present, separate from comments | `client/src/pages/StaffTicketDetail.test.tsx` | Pending |
| UI-05 | UI | AC-12 | User Management shows duplicate-email error | Field error rendered; user not created | `client/src/pages/UserManagement.test.tsx` | Pending |
| E2E-01 | E2E | AC-01, AC-07 | Login → use app → logout → direct access blocked | Redirected to Login after logout | `e2e/lab-03/authentication.spec.ts` | Pending |
| E2E-02 | E2E | AC-02 | Initial password login and change | Normal app opens only after valid change | `e2e/lab-03/first-login.spec.ts` | Pending |
| E2E-03 | E2E | AC-08 | IT Staff claims and resolves a ticket end-to-end | Queue → Detail → claim → status change reflected | `e2e/lab-03/staff-ticket-flow.spec.ts` | Pending |
| E2E-04 | E2E | FR-15-17 | Admin creates and edits a user | New user appears in list with correct role | `e2e/lab-03/user-administration.spec.ts` | Pending |
| RESP-01..09 | Responsive | Section 8.7 | Login, Staff Queue, Staff Detail, User Mgmt at 3 viewports | No clipping/overlap/horizontal scroll | Playwright screenshots under `artifacts/lab-03/screenshots/` | Pending |

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

- [ ] No clipped labels at any viewport across all Lab 3 screens
- [ ] No overlapping validation messages
- [ ] No unintended horizontal scrolling at mobile width
- [ ] Role-based navigation never shows a destination the current role
      cannot access
- [ ] Status / Requested Priority / IT Priority / Role badges are visually
      consistent across Queue, Ticket Detail, and User Management
- [ ] Public Comments and Internal Notes remain visually distinguishable at
      every viewport
- [ ] Editable vs. read-only field styling stays consistent with Lab 2

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

_Fill in after running all tests on the final `main` branch:_
```
Backend:  X/X passing
Frontend: X/X passing
E2E:      X/X passing
```

## 7. Known Limitations or Deferred Tests

- Load testing of the Staff Queue with large ticket volumes is out of scope.
- Multi-factor authentication and password-reset-by-email flows are
  explicitly excluded from Lab 3 and therefore untested.
- Actions Taken and its resolution-blocking rule are deferred to Lab 4.