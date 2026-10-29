// Ticket status transition matrix with authorized roles (docs/lab-04/api-spec.md, BR-12..BR-14).

export const TICKET_STATUSES = [
  "NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED",
] as const;

// Transitions IT Staff and Administrators may make (via PATCH /api/staff/tickets/:id/status)
export const STATUS_TRANSITIONS: Record<string, string[]> = {
  NEW: ["OPEN", "IN_PROGRESS", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
  IN_PROGRESS: ["OPEN", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["OPEN", "IN_PROGRESS", "CANCELLED"],
  RESOLVED: ["IN_PROGRESS", "CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  REOPENED: ["OPEN", "IN_PROGRESS", "CANCELLED"],
  CANCELLED: [],
};

// Transitions the owning Requester may make (via PATCH /api/tickets/:id/reopen)
const REQUESTER_TRANSITIONS: Record<string, string[]> = {
  RESOLVED: ["REOPENED"],
  CLOSED: ["REOPENED"],
};

const MATRIX_BY_ROLE: Record<string, Record<string, string[]>> = {
  IT_STAFF: STATUS_TRANSITIONS,
  ADMINISTRATOR: STATUS_TRANSITIONS,
  REQUESTER: REQUESTER_TRANSITIONS,
};

/** Staff matrix, role-agnostic (kept for Lab 3 callers and tests). */
export function isValidTransition(from: string, to: string): boolean {
  return (STATUS_TRANSITIONS[from] || []).includes(to);
}

export function allowedTransitions(from: string, role: string): string[] {
  return MATRIX_BY_ROLE[role]?.[from] ?? [];
}

export function canTransition(from: string, to: string, role: string): boolean {
  return allowedTransitions(from, role).includes(to);
}
