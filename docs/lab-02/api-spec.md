# Lab 2 API Contract

Base path: `/api`. All responses are JSON. All endpoints in this document are
new for Lab 2 (Lab 1's `/api/health` and `/api/categories` remain unchanged).

---

## GET /api/requesters

Retrieve active Development Requesters for the Selection screen.

**Response 200:**
```json
[
  { "id": 1, "name": "Jennifer Anderson", "email": "jennifer.a@toktickit.test" },
  { "id": 2, "name": "Michael Brown", "email": "michael.b@toktickit.test" }
]
```
Inactive Requesters are excluded. Order: `name` ascending.

**Response 500:** `{ "error": "Unable to fetch requesters" }`

---

## GET /api/related-systems

Retrieve active Related Systems for the Create Ticket dropdown.

**Response 200:**
```json
[
  { "id": 1, "name": "Email" },
  { "id": 2, "name": "Campus Wi-Fi" }
]
```

---

## POST /api/tickets

Create one validated Ticket for the selected Development Requester.

**Request body:**
```json
{
  "requesterId": 1,
  "categoryId": 2,
  "relatedSystemId": 5,
  "summary": "Laptop battery drains quickly",
  "description": "Battery drains fast even when idle. Started after last update.",
  "requestedPriority": "MEDIUM"
}
```

**Validation rules:**
| Field | Rule |
|---|---|
| `requesterId` | required; must reference an active RequesterUser |
| `categoryId` | required; must reference an existing Category |
| `relatedSystemId` | required; must reference an active RelatedSystem |
| `summary` | required; trimmed; 1–150 characters |
| `description` | required; trimmed; 1–2000 characters |
| `requestedPriority` | required; one of `LOW`, `MEDIUM`, `HIGH` |

**Response 201:**
```json
{
  "id": 42,
  "ticketNumber": "TKT-2026-000042",
  "requesterId": 1,
  "categoryId": 2,
  "relatedSystemId": 5,
  "summary": "Laptop battery drains quickly",
  "description": "Battery drains fast even when idle. Started after last update.",
  "requestedPriority": "MEDIUM",
  "currentStatus": "NEW",
  "createdAt": "2026-08-30T10:00:00.000Z",
  "updatedAt": "2026-08-30T10:00:00.000Z"
}
```

**Response 400 (validation):**
```json
{ "errors": { "summary": "Summary is required" } }
```

**Response 400 (invalid/inactive requester):**
```json
{ "error": "Invalid or inactive requester" }
```

**Response 500:** `{ "error": "Unable to create ticket" }`

**Implementation note:** the Ticket Number is generated from a dedicated
PostgreSQL sequence (`ticket_number_seq`) read inside the same transaction as
the insert, guaranteeing uniqueness under concurrent requests (see
`specification.md` Section 11). Do not derive it from `COUNT(*)`.

---

## GET /api/tickets

Retrieve the selected Requester's tickets with search, filter, sort, pagination.

**Query parameters:**
| Param | Type | Default | Notes |
|---|---|---|---|
| `requesterId` | number | required | scopes the list to one Requester |
| `search` | string | "" | matches `ticketNumber` or `summary`, case-insensitive |
| `categoryId` | number | none | filter |
| `requestedPriority` | string | none | filter: `LOW`/`MEDIUM`/`HIGH` |
| `status` | string | none | filter: currently only `NEW` |
| `sortBy` | string | `createdAt` | one of `createdAt`, `ticketNumber`, `currentStatus` |
| `sortDir` | string | `desc` | `asc` or `desc` |
| `page` | number | 1 | 1-indexed |
| `pageSize` | number | 10 | max 50 |

Invalid or unrecognized values for `sortBy`/`sortDir`/`status` fall back to
defaults rather than causing an error (BR-10).

**Response 200:**
```json
{
  "data": [
    {
      "id": 42,
      "ticketNumber": "TKT-2026-000042",
      "summary": "Laptop battery drains quickly",
      "category": { "id": 2, "name": "Hardware" },
      "requestedPriority": "MEDIUM",
      "currentStatus": "NEW",
      "createdAt": "2026-08-30T10:00:00.000Z",
      "updatedAt": "2026-08-30T10:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "pageSize": 10, "total": 1, "totalPages": 1 }
}
```

**Response 400:** `{ "error": "requesterId is required" }`

---

## GET /api/tickets/:id

Retrieve one Ticket owned by the current Requester, including attachments.

**Query parameters:** `requesterId` (required, for ownership check)

**Response 200:**
```json
{
  "id": 42,
  "ticketNumber": "TKT-2026-000042",
  "requesterId": 1,
  "summary": "Laptop battery drains quickly",
  "description": "Battery drains fast even when idle.",
  "category": { "id": 2, "name": "Hardware" },
  "relatedSystem": { "id": 5, "name": "Corporate Laptop" },
  "requestedPriority": "MEDIUM",
  "currentStatus": "NEW",
  "createdAt": "2026-08-30T10:00:00.000Z",
  "attachments": [
    {
      "id": 7,
      "fileName": "battery-report.pdf",
      "fileType": "application/pdf",
      "fileSize": 204800,
      "isRemoved": false,
      "createdAt": "2026-08-30T10:05:00.000Z"
    }
  ]
}
```

**Response 404:** `{ "error": "Ticket not found" }`

**Response 403 (ownership failure):**
```json
{ "error": "You do not have access to this ticket" }
```

---

## POST /api/tickets/:id/attachments

Upload a permitted attachment to an owned ticket. `multipart/form-data`.

**Form fields:** `requesterId` (number), `file` (binary)

**Response 201:**
```json
{
  "id": 8,
  "ticketId": 42,
  "fileName": "photo.jpg",
  "fileType": "image/jpeg",
  "fileSize": 1048576,
  "isRemoved": false,
  "createdAt": "2026-08-30T10:10:00.000Z"
}
```

**Response 400 (unsupported type):**
```json
{ "error": "Only JPG, PNG, WEBP, and PDF files are allowed" }
```

**Response 400 (too large):**
```json
{ "error": "File exceeds the 5MB size limit" }
```

**Response 400 (limit reached):**
```json
{ "error": "Maximum of five active attachments per ticket" }
```

**Response 403:** `{ "error": "Access denied" }` (ticket not owned by requesterId)

**Response 404:** `{ "error": "Ticket not found" }`

---

## GET /api/attachments/:id/download

Download an active (non-removed) attachment's original file.

**Response 200:** binary file stream with original filename

**Response 404 (removed or missing):**
```json
{ "error": "Attachment not available" }
```

---

## DELETE /api/attachments/:id

Soft-remove an owned attachment. Requires a removal reason.

**Request body:**
```json
{ "requesterId": 1, "reason": "Uploaded the wrong file" }
```

**Response 200:**
```json
{
  "id": 8,
  "isRemoved": true,
  "removedReason": "Uploaded the wrong file",
  "removedAt": "2026-08-30T10:20:00.000Z"
}
```

**Response 400:** `{ "error": "A removal reason is required" }`

**Response 403:** `{ "error": "Access denied" }`

---

## HTTP Status Summary

| Status | Used For |
|---|---|
| 200 | Successful retrieval, soft-remove |
| 201 | Ticket created, attachment uploaded |
| 400 | Invalid input, unsupported file type, oversized file, attachment limit reached |
| 403 | Ownership failure (accessing another Requester's ticket/attachment) |
| 404 | Ticket/attachment not found, or removed attachment requested for download |
| 500 | Unexpected server error (safe generic message, no internal details leaked) |