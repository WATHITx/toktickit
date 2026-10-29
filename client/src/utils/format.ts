// Display helpers shared by Lab 4 screens (docs/lab-04/ui-spec.md: readable labels, Asia/Bangkok time).

export const TICKET_STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  WAITING_FOR_REQUESTER: "Waiting for Requester",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
  REOPENED: "Reopened",
  CANCELLED: "Cancelled",
};

export const ACTION_STATUS_LABELS: Record<string, string> = {
  PLANNED: "Planned",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Bangkok",
  day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
});

/** "9 Oct 2026, 10:15" in Asia/Bangkok time. */
export function formatDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso));
}

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO timestamp → value for <input type="datetime-local"> (browser local time). */
export function toDateTimeLocal(iso: string | Date): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** <input type="datetime-local"> value → ISO timestamp, or undefined when empty/invalid. */
export function fromDateTimeLocal(value: string): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/** "5 minutes ago", "2 hours ago", "3 days ago" — pair with formatDateTime() in a title for the exact time. */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const seconds = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const units: [number, string][] = [[60 * 60 * 24, "day"], [60 * 60, "hour"], [60, "minute"]];
  for (const [size, name] of units) {
    const n = Math.floor(seconds / size);
    if (n >= 1) return `${n} ${name}${n === 1 ? "" : "s"} ago`;
  }
  return "just now";
}
