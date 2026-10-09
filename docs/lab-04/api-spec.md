# Lab 4 API Contract

Base path: `/api`. All Lab 2 and Lab 3 endpoints remain in place with
unchanged contracts except where this document marks them **changed**.
Authentication and authorization work as in Lab 3: the `toktickit_session`
cookie is required (`401` when missing or invalid) and `requireRole([...])`
returns `403` for roles that are not permitted. Requester ownership always
comes from the session, never from the request.

## Conventions

**Error body** (all Lab 4 endpoints):
```json
{ "error": "Human-readable message", "code": "VALIDATION", "fields": { "followUpNote": "Follow-up Note is required when follow-up is needed" } }
```
`code` and `fields` are present when relevant. Error messages never include
stack traces, SQL, or data the caller is not allowed to see.

| Code | HTTP | Meaning |
|---|---|---|
| `VALIDATION` | 400 | A field is missing, too long, or invalid |
| `INVALID_TRANSITION` | 400 | Status change not in the matrix, or not allowed for this role |
| `RESOLUTION_GATE` | 400 | Change to Resolved blocked by BR-11 |
| `TICKET_LOCKED` | 400 | Actions Taken cannot change on a Closed/Cancelled Ticket (BR-10) |
| `STALE_UPDATE` | 409 | `expectedVersion` does not match the current version (BR-17) |
| — | 401 | Not authenticated |
| — | 403 | Authenticated but not permitted (role or ownership) |
| — | 404 | Ticket or Action Taken does not exist (or invalid id) |

**Optimistic concurrency:** records that support stale-update detection
expose an integer `version`. The client sends it back as `expectedVersion`.
The server updates only when the stored version matches, then increments
it. A mismatch returns:
```json
{ "error": "This ticket was changed by someone else. Reload to see the latest version.", "code": "STALE_UPDATE", "currentVersion": 5 }
```

**Time:** all timestamps are ISO-8601 UTC strings. The client displays them
in Asia/Bangkok time.

---

## Actions Taken

### Action Taken object
```json
{
  "id": 41,
  "ticketId": 12,
  "actionAt": "2026-10-09T03:15:00.000Z",
  "description": "Reset VPN profile and reinstalled the client.",
  "result": "User can connect from home network.",
  "followUpRequired": true,
  "followUpNote": "Confirm it still works on campus Wi-Fi tomorrow.",
  "attachmentNotes": "Screenshot of error saved as vpn-error.png on the ticket.",
  "status": "COMPLETED",
  "performedBy": { "id": 6, "name": "Kevin Patel" },
  "assignee": { "id": 7, "name": "Emily Davis" },
  "version": 3,
  "createdAt": "2026-10-09T03:16:02.000Z",
  "updatedAt": "2026-10-09T04:00:10.000Z"
}
```

### GET /api/staff/tickets/:id/actions

**Access:** IT Staff, Administrator

**Response 200:** array of Action Taken objects ordered by `actionAt` ascending,
then `id` ascending (stable order). Empty array when the Ticket has none.

**Response 404:** Ticket not found.

### POST /api/staff/tickets/:id/actions

**Access:** IT Staff, Administrator

**Request body:**
```json
{
  "actionAt": "2026-10-09T03:15:00.000Z",
  "description": "Reset VPN profile and reinstalled the client.",
  "result": "",
  "followUpRequired": false,
  "followUpNote": null,
  "attachmentNotes": "",
  "assigneeId": 7
}
```

| Field | Rule |
|---|---|
| `actionAt` | optional, defaults to now; not before Ticket `createdAt`, not more than 5 min in the future (BR-08) |
| `description` | required, 1–2000 chars after trim (BR-06) |
| `result` | optional, ≤2000 (BR-06) |
| `followUpRequired` | boolean, default `false` |
| `followUpNote` | required, 1–1000, when `followUpRequired` is true; cleared otherwise (BR-07) |
| `attachmentNotes` | optional, ≤500 |
| `assigneeId` | optional, defaults to the caller; must be an active IT Staff/Administrator (BR-05) |

`performedById`, `status`, `version`, and `ticketId` in the body are
ignored: Performed by is the caller (BR-04), status starts `PLANNED`.

**Response 201:** the created Action Taken object. The parent Ticket's
`updatedAt` is refreshed (BR-23).

**Response 400:** `VALIDATION` (with `fields`), or `TICKET_LOCKED`.
**Response 403:** caller is a Requester.
**Response 404:** Ticket not found.

### PATCH /api/staff/tickets/:id/actions/:actionId

**Access:** IT Staff, Administrator

Edits a Planned action, or completes/cancels it.

**Request body** (all fields optional except `expectedVersion`):
```json
{
  "expectedVersion": 2,
  "description": "Reset VPN profile and reinstalled the client.",
  "result": "User can connect from home network.",
  "followUpRequired": true,
  "followUpNote": "Confirm on campus Wi-Fi tomorrow.",
  "attachmentNotes": "vpn-error.png",
  "assigneeId": 7,
  "actionAt": "2026-10-09T03:15:00.000Z",
  "status": "COMPLETED"
}
```

Rules:
- Only `PLANNED` actions may be edited (BR-09). Allowed `status` values are
  `COMPLETED` (requires a non-empty `result` after the update) and
  `CANCELLED`.
- Field rules are the same as POST, applied to the merged record.
- `:actionId` must belong to Ticket `:id` (BR-01), otherwise 404.

**Response 200:** the updated Action Taken object with `version` incremented.
**Response 400:** `VALIDATION` (including editing a Completed/Cancelled action
or completing without a result), or `TICKET_LOCKED`.
**Response 403:** caller is a Requester.
**Response 404:** Ticket or Action Taken not found, or the action belongs to another Ticket.
**Response 409:** `STALE_UPDATE`.

### GET /api/tickets/:id/actions

**Access:** Requester who owns the Ticket (read-only view, BR-03)

**Response 200:** same array and ordering as the staff endpoint.
**Response 403:** Ticket belongs to another Requester, or caller is not a Requester.
**Response 404:** Ticket not found.

---

## Ticket Workflow

### GET /api/staff/tickets/:id and GET /api/tickets/:id (**changed**)

Unchanged, except the response now includes `"version": 4`, which the
client must send back when changing status.

### PATCH /api/staff/tickets/:id/status (**changed**)

**Access:** IT Staff, Administrator

**Request body:**
```json
{ "status": "RESOLVED", "expectedVersion": 4 }
```

Processing order:
1. Ticket exists, otherwise 404.
2. `status` is permitted from the current status for the caller's role
   (matrix below), otherwise 400 `INVALID_TRANSITION`.
3. If `status` is `RESOLVED`, the gate (BR-11) passes, otherwise 400
   `RESOLUTION_GATE` with the reasons.
4. `expectedVersion` matches, otherwise 409 `STALE_UPDATE`.
5. In one transaction: update `currentStatus`, increment `version`, append a
   `TicketStatusHistory` entry (BR-16). Moving to `REOPENED` also clears
   `problemAppearsResolved` (BR-15).

**Response 200:** the updated Ticket including `currentStatus` and `version`.

**Response 400 (gate):**
```json
{
  "error": "This ticket cannot be resolved yet.",
  "code": "RESOLUTION_GATE",
  "reasons": ["Assign a Ticket Owner", "Complete at least one Action Taken", "Finish or cancel 2 planned Actions Taken"]
}
```

### PATCH /api/tickets/:id/reopen

**Access:** Requester who owns the Ticket

**Request body:** `{ "expectedVersion": 6 }`

**Response 200:** updated Ticket with `currentStatus: "REOPENED"`; history entry appended; `problemAppearsResolved` cleared.
**Response 400:** `INVALID_TRANSITION` when the Ticket is not Resolved or Closed.
**Response 403:** Ticket belongs to another Requester.
**Response 409:** `STALE_UPDATE`.

### GET /api/staff/tickets/:id/history and GET /api/tickets/:id/history

**Access:** staff endpoint for IT Staff/Administrator; Requester endpoint for the owning Requester only.

**Response 200:** ordered by `changedAt` ascending, then `id` ascending.
```json
[
  { "id": 90, "fromStatus": "NEW", "toStatus": "OPEN", "changedBy": { "id": 6, "name": "Kevin Patel" }, "changedAt": "2026-10-09T02:00:00.000Z" }
]
```
There is no endpoint that edits or deletes history (BR-16).

### Ticket Status Transition Matrix

| From \ To | Open | In Progress | Waiting | Resolved | Closed | Reopened | Cancelled |
|---|---|---|---|---|---|---|---|
| New | S | S | — | — | — | — | S |
| Open | — | S | S | — | — | — | S |
| In Progress | S | — | S | S (gate) | — | — | S |
| Waiting for Requester | S | S | — | — | — | — | S |
| Resolved | — | S | — | — | S | S, R | — |
| Closed | — | — | — | — | — | S, R | — |
| Reopened | S | S | — | — | — | — | S |
| Cancelled | — | — | — | — | — | — | — |

S = IT Staff or Administrator via `/api/staff/tickets/:id/status`.
R = owning Requester via `/api/tickets/:id/reopen`.

### PATCH /api/tickets/:id/mark-resolved (unchanged)

Still sets only `problemAppearsResolved = true`; `currentStatus` is never
changed (BR-15).

---

## List Endpoints (**changed** for drill-down)

### GET /api/tickets (Requester My Tickets)

Adds an optional `status` parameter: one `TicketStatus` value, or `ACTIVE`
(New, Open, In Progress, Waiting for Requester, Reopened — BR-18). Unknown
values are ignored (same convention as other Lab 2 filters).

### GET /api/staff/tickets (Ticket Queue)

The existing `status` parameter also accepts `ACTIVE`. Existing `ownership`
(`mine` / `unassigned` / `all`) and `itPriority` parameters are unchanged.
Dashboard drill-down combines them, e.g.
`/api/staff/tickets?status=ACTIVE&ownership=unassigned`.

---

## Dashboards

All metrics are calculated by the backend at request time (BR-20). Counts
with no matches are `0`; lists with no matches are `[]` (BR-22). Lists hold
at most 5 items (BR-24). "Recent" = last 7 × 24 hours (BR-19).

### GET /api/dashboard/requester

**Access:** Requester. Every query is scoped to `requesterId = caller` (BR-21).

**Response 200:**
```json
{
  "metrics": {
    "openTickets": 3,
    "waitingForMe": 1,
    "recentlyResolved": 2
  },
  "recentlyUpdated": [
    { "id": 12, "ticketNumber": "TKT-2026-000012", "summary": "Cannot connect to VPN", "currentStatus": "WAITING_FOR_REQUESTER", "updatedAt": "2026-10-09T04:00:10.000Z" }
  ],
  "generatedAt": "2026-10-09T05:00:00.000Z"
}
```

| Metric | Calculation | Drill-down |
|---|---|---|
| `openTickets` | count of own Tickets with status in ACTIVE | `/my-tickets?status=ACTIVE` |
| `waitingForMe` | count of own Tickets with status `WAITING_FOR_REQUESTER` | `/my-tickets?status=WAITING_FOR_REQUESTER` |
| `recentlyResolved` | count of own Tickets with a history entry `toStatus = RESOLVED` in the recent window | `/my-tickets?status=RESOLVED` |
| `recentlyUpdated` | own Tickets ordered by `updatedAt` desc, limit 5 | `/tickets/:id` |

**Response 403:** caller is not a Requester.

### GET /api/dashboard/staff

**Access:** IT Staff, Administrator.

**Response 200:**
```json
{
  "metrics": {
    "unassigned": 4,
    "assignedToMe": 6,
    "myOpenActions": 2
  },
  "byStatus": { "NEW": 3, "OPEN": 2, "IN_PROGRESS": 4, "WAITING_FOR_REQUESTER": 1, "RESOLVED": 2, "CLOSED": 5, "REOPENED": 0, "CANCELLED": 1 },
  "byItPriority": { "HIGH": 2, "MEDIUM": 5, "LOW": 3 },
  "urgent": [
    { "id": 30, "ticketNumber": "TKT-2026-000030", "summary": "Printer on floor 3 offline", "currentStatus": "OPEN", "itPriority": "HIGH", "ticketOwner": null, "createdAt": "2026-10-01T02:00:00.000Z" }
  ],
  "recentlyUpdated": [
    { "id": 12, "ticketNumber": "TKT-2026-000012", "summary": "Cannot connect to VPN", "currentStatus": "IN_PROGRESS", "updatedAt": "2026-10-09T04:00:10.000Z" }
  ],
  "myOpenActionsList": [
    { "id": 41, "ticketId": 12, "ticketNumber": "TKT-2026-000012", "description": "Reset VPN profile", "actionAt": "2026-10-09T03:15:00.000Z" }
  ],
  "userCounts": { "REQUESTER": { "active": 5, "inactive": 1 }, "IT_STAFF": { "active": 3, "inactive": 1 }, "ADMINISTRATOR": { "active": 1, "inactive": 0 } },
  "generatedAt": "2026-10-09T05:00:00.000Z"
}
```

`userCounts` is included only for Administrators.

| Metric | Calculation | Drill-down |
|---|---|---|
| `unassigned` | Tickets with status in ACTIVE and `ticketOwnerId` null | `/my-queue?status=ACTIVE&ownership=unassigned` |
| `assignedToMe` | Tickets with status in ACTIVE and `ticketOwnerId = caller` | `/my-queue?status=ACTIVE&ownership=mine` |
| `myOpenActions` | Actions Taken with `assigneeId = caller` and status `PLANNED` | list below |
| `byStatus` | count per status over all Tickets; every status present, 0 when none | `/my-queue?status=<STATUS>` |
| `byItPriority` | count per IT Priority over ACTIVE Tickets; every priority present | `/my-queue?status=ACTIVE&itPriority=<P>` |
| `urgent` | ACTIVE Tickets with `itPriority = HIGH`, oldest `createdAt` first, limit 5 | `/staff/tickets/:id` |
| `recentlyUpdated` | all Tickets ordered by `updatedAt` desc, limit 5 | `/staff/tickets/:id` |
| `myOpenActionsList` | the `myOpenActions` records ordered by `actionAt` asc, limit 5 | `/staff/tickets/:ticketId` |
| `userCounts` | count of users grouped by role and `isActive` | `/admin/users?role=<ROLE>` |

**Response 403:** caller is a Requester.

---

## Health and Regression

`GET /api/health` is unchanged (`200 { "status": "ok", "service": "TokTickIT API" }`).
All Lab 2 and Lab 3 endpoints keep their contracts; their automated tests
remain part of the Lab 4 suite (REG-01).

## HTTP Status Summary (Lab 4 endpoints)

| Endpoint | 200/201 | 400 | 401 | 403 | 404 | 409 |
|---|---|---|---|---|---|---|
| GET /staff/tickets/:id/actions | ✅ | | ✅ | Requester | ✅ | |
| POST /staff/tickets/:id/actions | 201 | VALIDATION, TICKET_LOCKED | ✅ | Requester | ✅ | |
| PATCH /staff/tickets/:id/actions/:actionId | ✅ | VALIDATION, TICKET_LOCKED | ✅ | Requester | ✅ | STALE_UPDATE |
| GET /tickets/:id/actions | ✅ | | ✅ | not owner | ✅ | |
| PATCH /staff/tickets/:id/status | ✅ | INVALID_TRANSITION, RESOLUTION_GATE | ✅ | Requester | ✅ | STALE_UPDATE |
| PATCH /tickets/:id/reopen | ✅ | INVALID_TRANSITION | ✅ | not owner | ✅ | STALE_UPDATE |
| GET /staff/tickets/:id/history | ✅ | | ✅ | Requester | ✅ | |
| GET /tickets/:id/history | ✅ | | ✅ | not owner | ✅ | |
| GET /dashboard/requester | ✅ | | ✅ | non-Requester | | |
| GET /dashboard/staff | ✅ | | ✅ | Requester | | |
