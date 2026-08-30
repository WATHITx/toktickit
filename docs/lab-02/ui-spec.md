# Lab 2 UI Specification — Zen Green Theme

## 1. Color Tokens

| Token | Value | Use |
|---|---|---|
| `--color-primary` | `#006B3C` | App header, primary buttons, strong emphasis |
| `--color-secondary` | `#0B7A46` | Active tabs, focus accents, links, hover |
| `--color-pale-green` | `#EAF6EF` | Selected state, success emphasis, subtle section background |
| `--color-bg` | `#F5F7F6` | Page background |
| `--color-surface` | `#FFFFFF` | Cards, panels, with subtle border + restrained shadow |
| `--color-text` | dark charcoal-green (e.g. `#1F2B24`) | Body text, not pure black |
| `--color-error` | dark red (e.g. `#B3261E`) | Error text/border, message below field |
| `--color-warning` | amber (e.g. `#B8860B`) | Warning callouts/badges only, not decoration |
| `--color-success` | green, paired with text (not color alone) | Success confirmation |

Editable field: white background, neutral border (`#D0D7D3`).
Read-only field: soft gray-green or warm ivory (`#F0EFE8` or `#EDF2EF`), clearly
distinct from editable but still legible.

## 2. Typography and Spacing

- Base font size 16px, line-height 1.5, sans-serif system stack.
- Labels: 14px, medium weight, positioned above their control with 4px gap.
- Section spacing: 24px between field groups; 16px between related fields.
- Card padding: 24px desktop, 16px mobile.

## 3. Component States

| Control state | Style |
|---|---|
| Editable | White bg, neutral border, `--color-text` |
| Read-only | Ivory/gray-green bg, no border emphasis, same text color at 90% opacity |
| Invalid | `--color-error` border, error message directly below field |
| Disabled | Reduced opacity (60%), `not-allowed` cursor, no hover/focus effect |
| Focused | 2px `--color-secondary` outline, visible for keyboard navigation |

Required-field marker: red asterisk after the label text. The asterisk is a
visual hint only — the validation message is the source of truth and must
still appear on submit/blur even if the asterisk is visually missed.

## 4. Button Hierarchy

| Type | Style |
|---|---|
| Primary | Solid `--color-primary` background, white text (e.g. Submit, Continue) |
| Secondary | Outlined `--color-secondary` border, `--color-secondary` text (e.g. Cancel, Clear Filters) |
| Tertiary | Text-only link style (e.g. Change Requester) |
| Destructive | Outlined dark red border/text (e.g. Remove Attachment) |
| Disabled | Gray background/text, no shadow, non-interactive |
| Busy | Primary style + inline spinner + disabled interaction, label unchanged or "Submitting…" |

## 5. Screen: Development Requester Selection

States: `loading` → `loaded` (dropdown populated) / `empty` (no active
Requesters — show message + no Continue action) / `error` (API failure —
retry button + safe message).

Required elements: TokTickIT title, one-sentence "testing only" explanation,
Requester dropdown, Continue (primary) button, info callout ("Only active
development requesters are shown"), secondary note that real authentication
arrives in Lab 3.

After selection: app shell shows Requester name + "Change Requester" tertiary
action; all Requester-scoped data reloads on change.

## 6. Screen: Create Ticket

Layout order (top to bottom): system-generated/read-only fields (Ticket
Number placeholder "Assigned after submission", Ticket Date if shown) →
classification fields (Category, Related System) grouped side-by-side on
desktop, stacked on mobile → Requested Priority → Summary (full-width,
single line) → Description (full-width, resizable textarea, taller) →
Attachments (file picker + list of selected files with remove-before-submit
option) → primary Submit button + secondary Cancel.

States: `initial` (empty form) → `validating` (field errors shown inline on
blur/submit) → `submitting` (Submit button busy, all fields disabled) →
`success` (Ticket Number shown prominently + "View Ticket" / "Create Another"
actions) → `error` (safe message banner above form; entered values retained;
Submit re-enabled).

Attachment picker: shows accepted types and size limit as helper text;
rejected files show an inline error per file without blocking already-valid
selections.

## 7. Screen: My Tickets

Layout: page header ("My Tickets" + short subtitle) → toolbar (search input,
Category filter, Requested Priority filter, Current Status filter, Clear
Filters, Create Ticket primary button) → results table (desktop) / card list
(mobile) → pagination footer.

Table columns (desktop): Ticket No., Created Date, Summary, Category,
Requested Priority (badge), Current Status (badge), Last Updated. Mobile:
condensed card showing Ticket No., Summary, Category, and the two badges,
tappable to open Ticket Detail.

States: `loading` (skeleton rows/cards) → `loaded` → `empty` ("You haven't
created any tickets yet" + Create Ticket call-to-action) → `no-results`
("No tickets match your search/filters" + Clear Filters action) → `error`
(safe message + retry).

Badge colors: Priority — LOW (pale green), MEDIUM (amber), HIGH (dark red
outline). Status — NEW (secondary green). Badges never rely on color alone;
include the text label.

## 8. Screen: Requester Ticket Detail (View Mode)

Layout: ticket header card (read-only fields grouped: identity fields —
Ticket No., Date, Requester; classification — Category, Related System,
Requested Priority, Current Status; content — Summary, Description) visually
separated (card border/spacing) from the Attachments section below.

Attachments section: list of attachments with filename, type icon, size,
status; active attachments show Download and Remove actions; removed
attachments show a "Removed" badge, retained metadata (removal reason,
timestamp), and no Download control. Add Attachment control at the top of
the section, subject to the same 5-file/type/size rules as Create Ticket.

Remove action requires a confirmation dialog with a required reason text
field before the soft-remove request is sent.

Explicitly not implemented in this screen: Public Comments, Internal Notes,
Actions Taken, or any status-change controls.

## 9. Responsive Rules

| Viewport | Behavior |
|---|---|
| Desktop ≥992px | Multi-column layout per screen above; content max-width ~1140px, centered |
| Tablet 768–991px | Two-column layout where practical; Summary/Description keep full width |
| Mobile <768px | All fields stack vertically; buttons full-width and touch-sized (≥44px height); table becomes card list; no horizontal page scroll |

All sizes: no clipped labels, no overlapping validation messages, no hidden
buttons, no truncated attachment filenames without a tooltip/title attribute.

## 10. Accessibility

- All form controls have associated `<label>` elements (not placeholder-only).
- Icon-only controls (e.g., remove-attachment icon) include `aria-label` and
  a visible tooltip on hover/focus.
- Focus outline remains visible for keyboard-only navigation (no
  `outline: none` without a replacement focus style).
- Status/priority conveyed by badge text, not color alone.
- Error messages are associated with their field via `aria-describedby`.

## 11. Screenshot Paths (Visual Checks)

```
artifacts/lab-02/screenshots/
├── create-ticket/
│   ├── desktop.png
│   ├── tablet.png
│   └── mobile.png
├── my-tickets/
│   ├── desktop.png
│   ├── tablet.png
│   └── mobile.png
└── ticket-detail/
    ├── desktop.png
    ├── tablet.png
    └── mobile.png
```

Each screenshot is captured via Playwright (see `lab2-workflow-guide.md`
Section 8.3) and manually reviewed against this document before being
included in the Part 9 submission evidence.