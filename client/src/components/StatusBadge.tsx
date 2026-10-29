import { TICKET_STATUS_LABELS } from "../utils/format";

// Ticket status badge using the Lab 3 tokens (docs/lab-03/ui-spec.md Section 1): always text + color.
const STYLES: Record<string, React.CSSProperties> = {
  outline: { backgroundColor: "var(--color-surface)", color: "var(--color-secondary)", border: "1px solid var(--color-secondary)" },
  amber: { backgroundColor: "#FFF4E0", color: "#7A5A00", border: "1px solid var(--color-warning)" },
  done: { backgroundColor: "var(--color-pale-green)", color: "var(--color-text)", border: "1px solid var(--color-secondary)" },
  muted: { backgroundColor: "#E9ECEF", color: "#5C636A", border: "1px solid #CED4DA" },
};

const TONE: Record<string, keyof typeof STYLES> = {
  NEW: "outline", OPEN: "outline", REOPENED: "outline",
  IN_PROGRESS: "amber", WAITING_FOR_REQUESTER: "amber",
  RESOLVED: "done", CLOSED: "done",
  CANCELLED: "muted",
};

export default function StatusBadge({ status, testId }: { status: string; testId?: string }) {
  return (
    <span className="badge" style={STYLES[TONE[status] ?? "outline"]} data-testid={testId}>
      {TICKET_STATUS_LABELS[status] ?? status}
    </span>
  );
}
