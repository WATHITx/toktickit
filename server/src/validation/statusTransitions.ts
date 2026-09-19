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

export function isValidTransition(from: string, to: string): boolean {
  return (STATUS_TRANSITIONS[from] || []).includes(to);
}