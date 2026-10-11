import { TICKET_STATUSES } from "./statusTransitions.js";

// Shared definitions for dashboard metrics and their drill-down filters (BR-18, BR-19),
// so a dashboard count and the list it links to always use the same rule.

export const ACTIVE_STATUSES = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"] as const;
export const RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function recentSince(now: Date = new Date()): Date {
  return new Date(now.getTime() - RECENT_WINDOW_MS);
}

/**
 * `status` query value → Prisma `where` fragment for Tickets.
 * Accepts a TicketStatus, `ACTIVE` (BR-18), or `RECENTLY_RESOLVED` (moved to Resolved within the recent window).
 * Unknown values are ignored, matching the other Lab 2 list filters.
 */
export function statusWhere(raw: unknown, now: Date = new Date()): Record<string, unknown> {
  if (typeof raw !== "string" || raw === "") return {};
  if (raw === "ACTIVE") return { currentStatus: { in: [...ACTIVE_STATUSES] } };
  if (raw === "RECENTLY_RESOLVED") {
    return { statusHistory: { some: { toStatus: "RESOLVED", changedAt: { gte: recentSince(now) } } } };
  }
  if ((TICKET_STATUSES as readonly string[]).includes(raw)) return { currentStatus: raw };
  return {};
}
