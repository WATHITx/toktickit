# Lab 3 API Contract

Base path: `/api`. All Lab 2 endpoints remain in place except where noted;
Ticket/Attachment ownership now comes from the authenticated session
(`req.user.id`), never from a client-supplied `requesterId`.

Authentication: JWT in an httpOnly, SameSite=Lax cookie named `toktickit_session`,
set by `/api/auth/login`, cleared by `/api/auth/logout`. Every protected
route uses `requireAuth` (401 if missing/invalid) and, where applicable,
`requireRole([...])` (403 if role not permitted).

---

## POST /api/auth/login

**Request body:**
```json
{ "email": "janderson@toktickit.com", "password": "TempPass!23" }
```

**Response 200:** sets session cookie.
```json
{
  "user": { "id": 1, "name": "Jennifer Anderson", "role": "REQUESTER" },
  "mustChangePassword": false
}
```
If `mustChangePassword` is `true`, the frontend must route to Change
Password before anything else.

**Response 401 (invalid credentials OR unknown email OR inactive account —
identical for all three, per BR-06):**
```json
{ "error": "Invalid email or password" }
```

---

## POST /api/auth/logout

**Response 200:** clears session cookie. `{ "success": true }`

---

## GET /api/auth/me

**Response 200:**
```json
{ "id": 1, "name": "Jennifer Anderson", "email": "janderson@toktickit.com", "role": "REQUESTER" }
```
**Response 401:** `{ "error": "Not authenticated" }`

---

## POST /api/auth/change-password

**Request body:**
```json
{ "currentPassword": "TempPass!23", "newPassword": "NewSecure!45" }
```
**Validation:** new password ≥8 chars, upper+lower+number+special (BR-08).

**Response 200:** `{ "success": true }` — clears `mustChangePassword`.
**Response 400:** `{ "error": "Password does not meet requirements" }`

---

## Requester Ticket/Attachment Endpoints (carried over from Lab 2, auth-scoped)

`POST /api/tickets`, `GET /api/tickets`, `GET /api/tickets/:id`,
`POST /api/tickets/:id/attachments`, `GET /api/attachments/:id/download`,
`DELETE /api/attachments/:id` — identical contracts to Lab 2, except the
Requester identity is taken from `req.user.id` (`requireAuth` +
`requireRole(["REQUESTER"])` for creation; ownership-checked for read/write
regardless of role for staff overrides — see Staff endpoints below for the
IT Staff/Administrator equivalents).

---

## POST /api/tickets/:id/comments

**Access:** Requester (owner only), IT Staff, Administrator

**Request body:** `{ "content": "Still seeing this on my end." }`

**Response 201:**
```json
{ "id": 5, "ticketId": 12, "authorId": 1, "authorName": "Jennifer Anderson", "content": "Still seeing this on my end.", "createdAt": "2026-09-10T10:00:00.000Z" }
```
**Response 400:** `{ "error": "Comment cannot be empty" }`
**Response 403:** `{ "error": "You do not have access to this ticket" }` (Requester, not owner)

## GET /api/tickets/:id/comments

**Access:** Requester (owner only), IT Staff, Administrator — same visibility as BR-04.

---

## PATCH /api/tickets/:id/mark-resolved

**Access:** Requester (owner only)

**Response 200:** `{ "id": 12, "problemAppearsResolved": true }`

---

## GET /api/staff/tickets (Ticket Queue)

**Access:** IT Staff, Administrator

**Query parameters:**
| Param | Notes |
|---|---|
| `search` | matches `ticketNumber` or `summary` |
| `status` | filter by currentStatus |
| `itPriority` | filter |
| `ownership` | `mine` \| `unassigned` \| `all` (default `all`) |
| `sortBy` | `createdAt`, `ticketNumber`, `itPriority`, `currentStatus` |
| `sortDir` | `asc`/`desc` |
| `page`, `pageSize` | same pagination convention as Lab 2 |

**Response 200:**
```json
{
  "data": [
    {
      "id": 12, "ticketNumber": "TKT-2026-000012", "summary": "Cannot connect to VPN",
      "category": { "name": "Network" }, "requestedPriority": "HIGH", "itPriority": "HIGH",
      "currentStatus": "OPEN", "ticketOwner": { "id": 3, "name": "Sarah Johnson" },
      "createdAt": "2026-09-01T08:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "pageSize": 10, "total": 87, "totalPages": 9 }
}
```
**Response 403:** returned to any Requester attempting this endpoint.

---

## PATCH /api/staff/tickets/:id/owner

**Access:** IT Staff, Administrator
**Request body:** `{ "ownerId": 3 }` (must reference an active IT Staff/Administrator)
**Response 200:** updated ticket with new `ticketOwner`.
**Response 400:** `{ "error": "Ticket owner must be an active IT Staff or Administrator user" }`

## PATCH /api/staff/tickets/:id/priority

**Access:** IT Staff, Administrator
**Request body:** `{ "itPriority": "HIGH" }`
**Response 200:** updated ticket.

## PATCH /api/staff/tickets/:id/status

**Access:** IT Staff, Administrator
**Request body:** `{ "status": "IN_PROGRESS" }`
**Response 200:** updated ticket.
**Response 400 (invalid transition):**
```json
{ "error": "Cannot transition from NEW to CLOSED" }
```

### Ticket Status Transition Matrix

| From \ To | Open | In Progress | Waiting for Requester | Resolved | Closed | Reopened | Cancelled |
|---|---|---|---|---|---|---|---|
| New | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Open | — | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| In Progress | ✅ | — | ✅ | ✅ | ❌ | ❌ | ✅ |
| Waiting for Requester | ✅ | ✅ | — | ❌ | ❌ | ❌ | ✅ |
| Resolved | ❌ | ✅ | ❌ | — | ✅ | ✅ | ❌ |
| Closed | ❌ | ❌ | ❌ | ❌ | — | ✅ | ❌ |
| Reopened | ✅ | ✅ | ❌ | ❌ | ❌ | — | ✅ |
| Cancelled | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | — |

All transitions require the actor to be IT Staff or Administrator. New →
Resolved/Closed directly is disallowed by design (must pass through an
active-work status first), matching the handout's expectation of a
"permitted status-transition rule" students define and justify.

---

## POST /api/staff/tickets/:id/notes

**Access:** IT Staff, Administrator only

**Request body:** `{ "content": "Escalated to network team." }`
**Response 201:** same shape as comments, but never exposed to Requester.

## GET /api/staff/tickets/:id/notes

**Access:** IT Staff, Administrator only
**Response 403 for Requester:** `{ "error": "Forbidden" }` (no note data, no
indication of whether notes exist — BR-16).

---

## GET /api/admin/users

**Access:** Administrator only

**Query parameters:** `search` (name/email), `role` (optional filter)

**Response 200:**
```json
[
  { "id": 1, "name": "Jennifer Anderson", "email": "janderson@toktickit.com", "role": "REQUESTER", "isActive": true }
]
```

## POST /api/admin/users

**Request body:**
```json
{ "name": "Alex Thompson", "email": "alex.t@toktickit.com", "role": "IT_STAFF", "isActive": true, "initialPassword": "TempPass!99" }
```
**Response 201:** created user (no password hash in response).
**Response 400 (duplicate email):** `{ "error": "A user with this email already exists" }`

## PATCH /api/admin/users/:id

**Request body (any subset):** `{ "name": "...", "email": "...", "role": "...", "isActive": false }`
**Response 200:** updated user.
**Response 400:** `{ "error": "Cannot deactivate your own account" }` or
`{ "error": "Cannot remove the last active Administrator" }`

## PATCH /api/admin/users/:id/reset-password

**Request body:** `{ "newInitialPassword": "TempPass!77" }`
**Response 200:** `{ "success": true }` — sets `mustChangePassword = true`.

---

## HTTP Status Summary

| Status | Used For |
|---|---|
| 200 | Successful retrieval/update |
| 201 | Resource created (user, comment, note) |
| 400 | Invalid input, invalid status transition, business-rule violation (duplicate email, self-deactivation, last-admin) |
| 401 | Not authenticated (missing/expired/invalid session) |
| 403 | Authenticated but role/ownership forbids the operation |
| 404 | Resource not found |
| 500 | Unexpected server error (generic message, no internal details) |