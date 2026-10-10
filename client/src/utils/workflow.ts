// Mirrors server/src/validation/statusTransitions.ts so the UI only offers permitted transitions.
// The backend stays the authority and re-checks every change (BR-12, BR-13).

const STAFF_TRANSITIONS: Record<string, string[]> = {
  NEW: ["OPEN", "IN_PROGRESS", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
  IN_PROGRESS: ["OPEN", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["OPEN", "IN_PROGRESS", "CANCELLED"],
  RESOLVED: ["IN_PROGRESS", "CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  REOPENED: ["OPEN", "IN_PROGRESS", "CANCELLED"],
  CANCELLED: [],
};

const REQUESTER_TRANSITIONS: Record<string, string[]> = {
  RESOLVED: ["REOPENED"],
  CLOSED: ["REOPENED"],
};

export function allowedTransitions(from: string, role: string): string[] {
  const matrix = role === "IT_STAFF" || role === "ADMINISTRATOR" ? STAFF_TRANSITIONS
    : role === "REQUESTER" ? REQUESTER_TRANSITIONS
    : {};
  return matrix[from] ?? [];
}
