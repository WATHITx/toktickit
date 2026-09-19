# Lab 3 UI Specification — Zen Green Theme Extensions

Extends `docs/lab-02/ui-spec.md`. All existing color tokens, typography,
field states, and button hierarchy remain unchanged. This document covers
only the new screens and behaviors introduced in Lab 3.

## 1. New Badge Tokens

| Badge | Style |
|---|---|
| Role — Requester | pale-green background, `--color-text` |
| Role — IT Staff | `--color-secondary` outline |
| Role — Administrator | `--color-primary` solid, white text |
| Status — New/Open/Reopened | `--color-secondary` outline |
| Status — In Progress/Waiting for Requester | amber (`--color-warning`) |
| Status — Resolved/Closed | pale-green solid |
| Status — Cancelled | gray, muted text |

Role and status are always shown as colored badge **plus text label** —
never color alone (accessibility, carried over from Lab 2 rule).

## 2. Screen: Login

Layout: centered card, max-width ~420px. Fields: Email, Password (with
show/hide toggle icon). Primary button "Sign In" full-width. Below it, a
muted "Forgot your password?" link (non-functional placeholder is
acceptable since password-reset email is explicitly out of scope — label
it so, or omit the link entirely if that reads more honestly).

States: `idle` → `submitting` (button busy, disabled) → `error` (single
inline banner: "Invalid email or password. Please try again.") → `success`
(redirect either to normal app or to Change Password based on
`mustChangePassword`).

## 3. Screen: Change Password (mandatory first login)

Same card style as Login, directly following it in the flow (no separate
navigation needed — the app routes here automatically).

Fields: Current (temporary) password, New password, Confirm new password —
all with show/hide toggles. A live checklist below the New Password field
mirrors the handout illustration:
- ✓/✗ At least 8 characters
- ✓/✗ Includes upper and lower case letters
- ✓/✗ Includes a number and a special character

Primary button "Continue" is disabled until all three rules pass AND the
confirm field matches. Submitting failure shows an inline banner; success
navigates into the authenticated application shell.

## 4. Application Shell Changes

- Development Requester display and "Change Requester" button are removed
  entirely.
- Header now shows: app title, role-appropriate navigation, authenticated
  user's name + role badge, and a "Logout" action (tertiary button style).
- Navigation items shown are role-gated at render time (Requester sees My
  Tickets/Create Ticket; IT Staff sees My Queue/Create Ticket; Administrator
  sees Admin). This is a UX convenience only — the backend independently
  enforces access on every route regardless of what the frontend renders.

## 5. Screen: IT Staff — My Queue

Layout: same toolbar/table/card convention as Lab 2's My Tickets (search
box, filter row, sortable table headers, pagination footer, responsive
table→card breakpoint at 768px).

Columns (desktop): Ticket No., Created Date, Summary, Category, Req.
Priority, IT Priority, Status, Owner. Mobile card shows Ticket No., Summary,
Status badge, and Owner name (or "Unassigned" in muted text).

Filters: status, ownership (`Mine` / `Unassigned` / `All`), IT Priority.
Empty state: "No tickets in the queue yet." No-results state: "No tickets
match your search or filters."

## 6. Screen: IT Staff — Ticket Detail

Extends the Lab 2 Ticket Detail layout. Header fields remain mostly
read-only (Ticket No., Category, Related System, Requester, Requested
Priority, Created Date) except two new **editable** controls placed
together near the top: Ticket Owner (dropdown of active IT Staff/Admin,
plus "Claim for me" shortcut button) and IT Priority (dropdown). A Status
dropdown sits beside them, constrained client-side to the permitted
transitions from the current status (server re-validates regardless).

Below the header, four tabs (extends Lab 2's Public Comments/Attachments
tabs): **Public Comments**, **Internal Notes**, **Attachments**. Public
Comments keeps the Lab 2 green-toned thread style. Internal Notes uses a
visually distinct amber-toned panel with a persistent "Staff only — not
visible to the Requester" label at the top of the tab, so no one mistakes
it for a public channel.

Requester view of this same Ticket (separate route/component, reusing Lab
2's Requester Ticket Detail) shows only Public Comments and a
"Mark problem as resolved" button — no Owner/IT Priority/Status/Internal
Notes controls appear at all (not just disabled — not rendered).

## 7. Screen: Administrator — User Management

Two-panel layout matching the handout Figure 8.5: left panel is the user
list (Name, Role badge, Status badge, Edit icon), with a search box and a
role filter dropdown above it; right panel is a slide-in Create/Edit form
(Full Name, Email, Role dropdown, Active toggle, and — create mode only —
Initial Password field). No pagination; the full filtered list renders at
once (per the handout's explicit exclusion).

Edit mode reuses the same right panel, pre-filled, plus a
"Set New Initial Password" action and a "Deactivate User" destructive
button (disabled with a tooltip explaining why when the target is the
acting Administrator themselves, or the last active Administrator).

States: `loading` (list skeleton) → `loaded` → `empty`/`no-results` →
`error`. Save actions show a busy state on the button and a success toast
or inline confirmation; validation errors (duplicate email, missing
required field) appear beside the relevant field in the panel.

## 8. Responsive and Accessibility

Identical rules to Lab 2 (`ui-spec.md` Section 9-10): desktop ≥992px,
tablet 768-991px, mobile <768px, no horizontal scroll, visible focus
outlines, labels bound via `htmlFor`/`id`, status/role conveyed by text as
well as color.

## 9. Screenshot Paths

```
artifacts/lab-03/screenshots/
├── authentication/
│   ├── login-desktop.png / -tablet.png / -mobile.png
│   └── change-password-desktop.png / -tablet.png / -mobile.png
├── staff-queue/
│   └── desktop.png / tablet.png / mobile.png
├── staff-ticket-detail/
│   └── desktop.png / tablet.png / mobile.png
└── user-management/
    └── desktop.png / tablet.png / mobile.png
```