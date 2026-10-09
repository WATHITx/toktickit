# Lab 4 UI Specification — Zen Green Final Application

Extends `docs/lab-02/ui-spec.md` and `docs/lab-03/ui-spec.md`. Color
tokens (`--color-primary #006B3C`, `--color-secondary #0B7A46`,
`--color-pale-green #EAF6EF`, `--color-bg`, `--color-surface`,
`--color-text`, `--color-error`, `--color-warning`), typography, field
states, and button hierarchy are unchanged. This document covers new
screens, changed behavior, and the final consistency rules.

## 1. Badge Tokens

Existing role, status, and priority badges from Lab 3 are reused. New:

| Badge | Style | Text |
|---|---|---|
| Action — Planned | `--color-secondary` outline | "Planned" |
| Action — Completed | pale-green solid, `--color-text` | "Completed" |
| Action — Cancelled | gray, muted text, strikethrough not used | "Cancelled" |
| Follow-up needed | amber (`--color-warning`) outline with flag icon | "Follow-up" |

Status labels are shown in readable form everywhere ("In Progress",
"Waiting for Requester") instead of enum values ("IN_PROGRESS"). Every
badge carries a text label — never color alone.

## 2. Application Shell

- Navigation order by role:
  - Requester: **Dashboard**, My Tickets, + Create Ticket
  - IT Staff: **Dashboard**, My Queue
  - Administrator: **Dashboard**, My Queue, Admin
- After login, and when opening `/`, the user lands on `/dashboard`, which
  renders the dashboard for their role.
- The active page keeps the existing indicator (bold + underline) and also
  sets `aria-current="page"`.
- A signed-in user who opens a route their role cannot use sees a
  **Forbidden** screen inside the shell: heading "You don't have access to
  this page", one sentence of explanation, and a primary button "Go to
  Dashboard". Signed-out users are still sent to Login.
- A shared **Not Found** screen is used for unknown routes and missing
  Tickets, with a "Go to Dashboard" button.
- Leftover elements from earlier labs are removed (duplicate shell file,
  garbled characters in Login/Change Password, unused placeholders).

## 3. Shared Feedback States

All Lab 4 screens (and Lab 1–3 screens where missing) use the same states:

| State | Presentation |
|---|---|
| Loading | Skeleton blocks in the card/table area with `aria-busy="true"`; the shell stays visible |
| Empty / no results | Muted sentence inside the card, plus a link to the relevant action when one exists |
| Validation | Message directly under the field (`aria-describedby`), field outlined `--color-error`; a summary banner only when the error is not tied to a field |
| Success | Short inline confirmation ("Action saved") near the control, auto-dismissed after 4 s, announced with `role="status"` |
| Conflict (409) | Amber banner: "This ticket was changed by someone else." with a "Reload" button; the latest data is reloaded and the user's unsaved form text is kept so it can be re-applied |
| Forbidden / Not found | Screens from Section 2 |
| Safe API failure | Red banner "Unable to reach TokTickIT. Please try again." with a "Retry" button; entered form data is kept |

Buttons that submit are disabled and show "Saving…" while a request is in
progress, preventing duplicate submissions.

## 4. Screen: Requester Dashboard (`/dashboard`, Requester)

Layout (top to bottom): page heading "Dashboard" with the user's first name
in the subtitle; a row of three metric cards; a "Recently Updated" card.

**Metric cards** — label, large number, and a "View" link text; the whole
card is a single link (`<a>`), keyboard focusable, with an accessible name
such as "Open tickets: 3. View tickets".

| Card | Value | Opens |
|---|---|---|
| Open Tickets | `openTickets` | `/my-tickets?status=ACTIVE` |
| Waiting for Me | `waitingForMe` (amber accent when > 0) | `/my-tickets?status=WAITING_FOR_REQUESTER` |
| Recently Resolved | `recentlyResolved` | `/my-tickets?status=RESOLVED` |

**Recently Updated** — up to 5 rows: Ticket No., Summary, Status badge,
relative time ("2 hours ago", exact time in `title`). Each row links to
`/tickets/:id`. Empty: "No ticket activity yet." with a "Create Ticket"
link. A footer link "View all my tickets" opens `/my-tickets`.

Zero state: cards show `0` (never hidden).

## 5. Screen: IT Staff Dashboard (`/dashboard`, IT Staff and Administrator)

Layout:
1. Metric card row: **Unassigned**, **Assigned to Me**, **My Open Actions**.
2. Two compact count panels side by side: **By Status** (8 rows: badge +
   count, each row a link to `/my-queue?status=<STATUS>`) and **Active by IT
   Priority** (High/Medium/Low, links to
   `/my-queue?status=ACTIVE&itPriority=<P>`).
3. Lists: **Urgent** (High-priority active Tickets, oldest first, shows
   owner or "Unassigned"), **My Open Actions** (Ticket No., description,
   action date), **Recently Updated**. Each row links to the Ticket Detail.
4. Administrator only: **Users** panel with active/inactive counts per role,
   each linking to `/admin/users?role=<ROLE>`.

| Card | Opens |
|---|---|
| Unassigned | `/my-queue?status=ACTIVE&ownership=unassigned` |
| Assigned to Me | `/my-queue?status=ACTIVE&ownership=mine` |
| My Open Actions | scrolls to / focuses the My Open Actions list |

Empty lists: "No urgent tickets", "You have no open actions",
"No recent activity".

The Ticket Queue and My Tickets screens read `status`, `ownership`, and
`itPriority` from the URL on load, show them in their filter controls, and
keep the URL in sync when filters change (so Back returns to the same view).

## 6. Actions Taken — IT Staff Ticket Detail

New card "Actions Taken" placed between the Ticket summary card and Public
Comments, with a count in the heading ("Actions Taken (3)") and a primary
button "+ Add Action".

**List**
- Desktop/tablet (≥768 px): table with columns Date/Time, Description
  (first line, truncated with full text in the expanded view), Performed by,
  Assignee, Status badge, Follow-up badge, Edit/View button.
- Mobile (<768 px): one card per action with the same fields stacked.
- Order: `actionAt` ascending, then id (matches the API).
- Empty: "No actions recorded yet. Add the first action to track the work."

**Create mode** (inline panel under the heading, not a modal):
- Action Date/Time (`datetime-local`, defaults to now)
- Action Description (textarea, required, counter 0/2000)
- Result (textarea, optional while planned, counter 0/2000)
- Assignee (select of active IT Staff/Administrators, defaults to me)
- Follow-Up Required (checkbox). When checked, **Follow-up Note** appears
  directly below it, required, focus moves to it.
- Attachment Notes (single-line input, placeholder "e.g. screenshot
  vpn-error.png in Attachments")
- Performed by is shown read-only as the current user's name.
- Buttons: "Save Action" (primary), "Cancel" (tertiary).

**View/Edit mode** (expands the row/card):
- Planned action: the same fields, editable, plus "Mark Completed"
  (requires Result; if empty, the Result field shows the validation message
  and receives focus) and "Cancel Action" (destructive tertiary, asks for
  confirmation in an accessible inline confirm, not `window.confirm`).
- Completed or Cancelled action: all fields read-only (Lab 2 read-only
  field style), no buttons except "Close".
- Closed or Cancelled Ticket: "+ Add Action" and edit controls are not
  rendered; a muted note explains "This ticket is closed. Actions Taken are
  read-only."

## 7. Actions Taken — Requester Ticket Detail

The same list (Section 6) is shown read-only in a card "Work Performed by
IT", with no "+ Add Action", Edit, Complete, or Cancel controls rendered.
Assignee is shown; Internal Notes remain absent. Empty: "IT has not
recorded any actions yet."

## 8. Ticket Workflow Feedback

**IT Staff Ticket Detail**
- The Status control lists the current status (disabled option) followed
  only by transitions permitted for the user's role, with readable labels.
- Choosing a new status opens a small inline confirm row ("Change status to
  Resolved?" Confirm / Cancel) so a stray selection does not save.
- Resolution gate: if the Ticket does not yet satisfy BR-11, "Resolved" is
  still listed but shows a hint below the control listing the missing
  conditions ("Complete at least one Action Taken"). If the server rejects
  with `RESOLUTION_GATE`, the returned `reasons` are shown in the same place.
- Success refreshes the summary status badge, the Status control, and the
  history list, and announces "Status changed to Resolved".
- 409 shows the conflict banner from Section 3.

**Requester Ticket Detail**
- Resolved/Closed Tickets show a secondary button "Reopen Ticket" with an
  inline confirm. The existing "Mark problem as resolved" button stays and
  is labelled as a hint to IT ("Let IT know it looks fixed").

**Status History** (both views): collapsible card "Status History", newest
first for reading, each row "Open → In Progress · Kevin Patel · 9 Oct 2026,
10:15". Empty for legacy Tickets: "No status changes recorded since this
feature was introduced."

## 9. Responsive and Accessibility

Breakpoints are unchanged: desktop ≥992 px, tablet 768–991 px, mobile
<768 px; screenshots at 1280 × 800, 820 × 1180, 375 × 812.
- Dashboard metric cards: 3 per row on desktop/tablet, stacked on mobile.
  Count panels side by side on desktop, stacked below.
- Actions Taken: table ≥768 px, cards below; no horizontal page scroll at
  any width (tables wrap in `.table-responsive` as a safety net).
- Visible focus outline on every interactive element; logical tab order;
  inline panels move focus to their first field and back to the triggering
  button on close.
- All inputs have bound `<label>`s; required fields marked with `*` and
  `aria-required`; errors linked with `aria-describedby`.
- No modal dialogs are introduced; confirmations are inline.
- Color contrast meets WCAG AA for text on badges and cards.

## 10. Screenshot Paths

```
artifacts/lab-04/screenshots/
├── staff-dashboard/
│   └── desktop.png / tablet.png / mobile.png
├── requester-dashboard/
│   └── desktop.png / tablet.png / mobile.png
└── actions-taken/
    ├── desktop.png / tablet.png / mobile.png          (IT Staff, list + create panel)
    └── requester-desktop.png / -tablet.png / -mobile.png  (read-only view)
```
