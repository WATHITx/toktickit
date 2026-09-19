# Lab 3 Sprint Engineering Specification

> Draft — review every line against your actual implementation decisions
> before committing to `docs/lab-03/specification.md`.

## 1. Sprint Goal

Replace the temporary Development Requester selector with real
authentication and role-based authorization, and deliver the first
operational IT Staff Ticket Queue/Detail workflow plus a minimalist
Administrator user management screen — while preserving every Lab 2
Requester capability under the new authenticated identity.

## 2. Stakeholder Request Interpretation

The system now needs real users instead of a dev-only selector. Every
Requester capability from Lab 2 must keep working, but ownership now comes
from a logged-in account rather than a client-chosen identity. IT Staff need
a shared queue to find and work tickets: claim ownership, set IT Priority,
communicate publicly, and record private notes. Administrators need a
simple screen to manage accounts — nothing more. Authorization must be
enforced by the backend everywhere; a hidden button is not security.

## 3. Scope

### Included
- Email/password authentication, session/token issuance, logout
- Mandatory password change on first login (initial-password accounts)
- Server-side role-based authorization for Requester / IT Staff / Administrator
- Migration of Lab 2 Development Requesters into the real `User` model
- Requester Ticket/Attachment functions continuing under authenticated identity
- Public Comments (Requester + IT Staff + Administrator) and "Problem Appears
  Resolved" indication (Requester)
- IT Staff Ticket Queue: search, filter, sort, pagination
- IT Staff Ticket Detail: claim/reassign ownership, IT Priority, permitted
  status transitions, Public Comments, Internal Notes
- Administrator User Management: list, search, optional role filter, create,
  edit, activate/deactivate, reset initial password

### Excluded
- Email invitations, password-reset email, MFA, social login, SSO
- Self-registration
- Actions Taken (deferred to Lab 4)
- SLA calculation, escalation rules, notification services
- Dashboards/KPI analytics beyond simple queue counts
- Multi-tenant orgs/departments
- User deletion, bulk operations, import/export, multi-role-per-user,
  account-history screens, pagination/multi-sort on the user list

## 4. Functional Requirements

- FR-01: The system shall authenticate a user by email and password and
  establish an authenticated session.
- FR-02: The system shall reject authentication for inactive accounts with a
  generic error message that does not reveal account existence.
- FR-03: The system shall require a user flagged with an initial password to
  set a new password before any other screen becomes available.
- FR-04: The system shall expose the current authenticated user's identity
  and role to the frontend via a dedicated endpoint.
- FR-05: The system shall allow a user to log out, invalidating their
  session/token.
- FR-06: The system shall determine Requester ownership for all Ticket and
  Attachment operations from the authenticated session, never from a
  client-supplied identifier.
- FR-07: The system shall allow a Requester to post a Public Comment on an
  owned Ticket.
- FR-08: The system shall allow a Requester to mark a Ticket as
  "problem appears resolved" without changing its formal status.
- FR-09: The system shall allow IT Staff and Administrators to retrieve a
  Ticket Queue across all Requesters with search, filter, sort, and
  pagination.
- FR-10: The system shall allow IT Staff and Administrators to claim or
  reassign a Ticket's owner.
- FR-11: The system shall allow IT Staff and Administrators to set a
  Ticket's IT Priority.
- FR-12: The system shall allow IT Staff and Administrators to change a
  Ticket's status according to the permitted transition matrix.
- FR-13: The system shall allow IT Staff and Administrators to create and
  read Internal Notes on a Ticket; Requesters shall be forbidden from both.
- FR-14: The system shall allow an Administrator to list users, with search
  by name/email and an optional role filter.
- FR-15: The system shall allow an Administrator to create a user with one
  role, an activation state, and an initial password.
- FR-16: The system shall allow an Administrator to edit a user's name,
  email, role, and activation state.
- FR-17: The system shall allow an Administrator to set a new initial
  password for a user, flagging it as requiring change at next login.
- FR-18: The system shall prevent any operation that would leave the system
  with zero active Administrators or that deactivates the acting
  Administrator's own account.

## 5. Business Rules

- BR-01: Only an active user with valid credentials may authenticate.
- BR-02: A user marked as requiring a password change cannot enter the
  normal application until a new valid password is saved.
- BR-03: The authenticated user identity, not a `requesterId` supplied by
  the client, determines ownership of Requester operations.
- BR-04: Public Comments are visible to the Requester, IT Staff, and
  Administrator. Internal Notes are visible only to IT Staff and
  Administrator.
- BR-05: A Requester may indicate that the problem appears resolved, but
  cannot formally set the Ticket to Resolved or Closed.
- BR-06: Login failure (wrong password) and login failure (unknown email)
  return the identical generic message "Invalid email or password" so the
  response cannot be used to enumerate registered accounts.
- BR-07: Passwords are never stored or logged in plaintext; only a bcrypt
  hash is persisted.
- BR-08: A password (initial or user-chosen) must be at least 8 characters
  and include upper case, lower case, a number, and a special character
  (matches the rules shown in the Lab 3 handout Figure 8.1).
- BR-09: Logging out invalidates the current session/token; subsequent
  requests with the old credential are rejected.
- BR-10: Email addresses are unique across all users regardless of role.
- BR-11: A Ticket may have zero or one Ticket Owner; only an active IT
  Staff or Administrator user may be assigned as owner.
- BR-12: Requested Priority is set once by the Requester at creation and is
  never edited afterward. IT Priority initially copies Requested Priority
  and may only be changed by IT Staff or Administrator thereafter.
- BR-13: Ticket status transitions must follow the matrix in Section 8
  (Ticket Lifecycle); an invalid transition is rejected with 400.
- BR-14: Public Comments and Internal Notes are append-only in Lab 3; no
  edit or delete endpoint exists.
- BR-15: Empty or whitespace-only Public Comment/Internal Note content is
  rejected; content is limited to 2000 characters (same bound as Ticket
  Description, for consistency).
- BR-16: Requesting Internal Notes as a Requester returns 403 without
  revealing whether any notes exist.
- BR-17: An Administrator cannot deactivate their own account.
- BR-18: An operation that would leave zero active Administrators is
  rejected, regardless of which Administrator performs it.
- BR-19: A user is assigned exactly one role at a time (Requester, IT
  Staff, or Administrator); changing role replaces the previous one.
- BR-20: Migrated Lab 2 Development Requesters retain their existing
  Tickets and Attachments unchanged; only their identity representation
  moves from `RequesterUser` to `User` with role `REQUESTER`.

## 6. UI Specification Summary

See `docs/lab-03/ui-spec.md` for full detail. Summary:
- Login screen and mandatory Change Password screen (Zen Green, matching
  Section 8.1 of the handout) with busy and safe-failure states.
- Application shell now shows the authenticated user's name and role, a
  Logout action, and only the navigation items permitted for that role.
- Requester screens (Create Ticket, My Tickets, Ticket Detail) unchanged
  visually from Lab 2, plus a Public Comments thread and a
  "Problem Appears Resolved" action on Ticket Detail.
- IT Staff "My Queue" screen: search, filters, sortable columns, pagination,
  status/priority/owner badges, responsive table→card behavior (same
  convention as Lab 2's My Tickets).
- IT Staff Ticket Detail: extends the Lab 2 Ticket Detail layout with
  editable Ticket Owner and IT Priority controls, a Status dropdown
  constrained to permitted transitions, and two visually distinct tabs —
  Public Comments (green-toned) and Internal Notes (amber-toned, with a
  "Staff only" label) — so private content is never confused with public
  content.
- Administrator User Management: single screen, list on the left with
  search/role filter, create/edit panel on the right (matches Section 8.5
  layout), no pagination or bulk actions.

## 7. Data Changes

New/changed Prisma models:
- `User` (id, name, email unique, passwordHash, role enum
  [`REQUESTER`,`IT_STAFF`,`ADMINISTRATOR`], isActive, mustChangePassword,
  createdAt, updatedAt) — replaces `RequesterUser`.
- `Ticket` gains: `ticketOwnerId` (nullable FK to `User`, role constrained
  to IT_STAFF/ADMINISTRATOR at the application layer), `itPriority` enum
  (defaults from `requestedPriority` at creation), `currentStatus` enum
  expanded to the full Section 4.5 list, `problemAppearsResolved` boolean
  default false.
- `PublicComment` (id, ticketId FK, authorId FK, content, createdAt).
- `InternalNote` (id, ticketId FK, authorId FK, content, createdAt).
- Migration: rename/transform `RequesterUser` rows into `User` rows with
  `role = REQUESTER`; `Ticket.requesterId` foreign key target changes from
  `RequesterUser.id` to `User.id` with identical id values preserved (no
  Ticket ownership is altered by the migration).

## 8. API Contract

See `docs/lab-03/api-spec.md` for full detail. New/changed endpoints:
- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`,
  `POST /api/auth/change-password`
- `POST /api/tickets/:id/comments`, `GET /api/tickets/:id/comments`
- `PATCH /api/tickets/:id/mark-resolved`
- `GET /api/staff/tickets` (queue), `PATCH /api/staff/tickets/:id/owner`,
  `PATCH /api/staff/tickets/:id/priority`,
  `PATCH /api/staff/tickets/:id/status`
- `POST /api/staff/tickets/:id/notes`, `GET /api/staff/tickets/:id/notes`
- `GET /api/admin/users`, `POST /api/admin/users`,
  `PATCH /api/admin/users/:id`, `PATCH /api/admin/users/:id/reset-password`

### Authorization Matrix

| Endpoint | Requester | IT Staff | Administrator |
|---|---|---|---|
| POST /api/tickets (create) | ✅ (own) | ❌ | ❌ |
| GET /api/tickets, /:id (own) | ✅ (own only) | ❌ | ❌ |
| POST /:id/comments | ✅ (own) | ✅ | ✅ |
| PATCH /:id/mark-resolved | ✅ (own) | ❌ | ❌ |
| GET /api/staff/tickets (queue) | ❌ | ✅ | ✅ |
| PATCH /:id/owner, /priority, /status | ❌ | ✅ | ✅ |
| POST/GET /:id/notes | ❌ | ✅ | ✅ |
| GET/POST/PATCH /api/admin/users | ❌ | ❌ | ✅ |

## 9. Acceptance Criteria

- AC-01: Given an active user with valid credentials, when the user logs
  in, then the backend establishes authenticated access and returns the
  permitted user identity and role.
- AC-02: Given a user who must change the initial password, when login
  succeeds, then normal application screens remain unavailable until a
  valid new password is saved.
- AC-03: Given an authenticated Requester, when the client supplies another
  `requesterId`, then the backend still applies the authenticated identity
  and does not return another Requester's data.
- AC-04: Given a Requester account, when an Internal Note endpoint is
  requested, then the operation is rejected without exposing note content.
- AC-05: Given invalid credentials, when a user attempts login, then a
  generic "Invalid email or password" message is shown regardless of
  whether the email exists.
- AC-06: Given an inactive account, when login is attempted with the
  correct password, then access is denied with the same generic message
  used for AC-05.
- AC-07: Given a logged-out session, when a protected route is requested
  directly, then the request is rejected and the user is redirected to
  Login.
- AC-08: Given an IT Staff user, when they claim an unassigned Ticket, then
  the Ticket's owner becomes that IT Staff user.
- AC-09: Given a Ticket in status New, when IT Staff attempts to set status
  directly to Closed, then the transition is rejected as invalid.
- AC-10: Given an Administrator viewing User Management, when they attempt
  to deactivate their own account, then the action is blocked with a clear
  message.
- AC-11: Given exactly one active Administrator, when any user attempts to
  deactivate or demote that account, then the action is blocked.
- AC-12: Given a duplicate email address, when an Administrator creates or
  edits a user, then the operation is rejected with a field-level error.
- AC-13: Given a non-Administrator user, when they call any
  `/api/admin/users` endpoint directly, then the request is rejected with
  403.
- AC-14: Given a Requester's existing Lab 2 Tickets, when the Lab 3
  migration runs, then every Ticket's owner (Requester) is unchanged and
  all Attachments remain retrievable.

## 10. Definition of Done

- All FR/BR/AC above implemented and traceable to a passing test.
- All planned tests in `tests.md` pass on the final `main` branch,
  including authorization and migration/regression suites.
- No protected screen or API relies on frontend hiding alone; every
  protected endpoint independently enforces role and ownership.
- Passwords are hashed with bcrypt; no plaintext password appears in logs,
  commits, or seed files beyond clearly labeled dev-only values.
- Existing Lab 2 Ticket/Attachment data is verified intact after migration
  (row counts and ownership spot-checked).
- Screens conform to `ui-spec.md` at desktop, tablet, and mobile.
- All Issues merged into `lab3-staging`, then released to `main` via one
  peer-reviewed release PR.
- `docs/lab-03/reviewer.md` and `docs/lab-03/ai-use.md` complete.

## 11. Assumptions and Decisions

- **Session strategy:** JWT signed with a server-side secret, delivered as
  an httpOnly, SameSite=Lax cookie (not readable by client JS, mitigating
  XSS token theft) with a 12-hour expiration. Chosen over server-side
  session storage to avoid adding a session store dependency for a
  course-scale project, while still keeping the token off client-readable
  storage (unlike `localStorage`, which was rejected specifically because
  it is readable by any injected script).
- **CSRF:** because the API is called only from the same origin as the
  frontend during local development and the cookie is `SameSite=Lax`,
  cross-site form submission cannot trigger authenticated state-changing
  requests; no separate CSRF token is implemented for this course-scale
  scope.
- **Login failure timing:** both "unknown email" and "wrong password"
  paths perform a bcrypt comparison against a dummy hash when the email is
  not found, so response timing does not itself leak account existence.
- **Migration of RequesterUser → User:** performed as a single Prisma
  migration that renames the table and adds the new columns
  (`passwordHash`, `role`, `mustChangePassword`) with sensible defaults for
  existing rows (`role = REQUESTER`, a random per-row initial password
  hash, `mustChangePassword = true`), rather than creating a parallel table
  and copying data — this guarantees `Ticket.requesterId` foreign keys
  never change value.
- **IT Priority default:** copied from Requested Priority at Ticket
  creation time (not left null) so the Queue always has a sortable value
  even before any IT Staff has reviewed the Ticket.