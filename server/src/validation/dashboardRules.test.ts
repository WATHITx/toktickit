import { describe, it, expect } from "vitest";
import { ACTIVE_STATUSES, RECENT_WINDOW_MS, recentSince, statusWhere } from "./dashboardRules";

describe("dashboard rules (UNIT-04)", () => {
  it("defines Active as exactly the five open-work statuses (BR-18)", () => {
    expect([...ACTIVE_STATUSES].sort()).toEqual(["IN_PROGRESS", "NEW", "OPEN", "REOPENED", "WAITING_FOR_REQUESTER"]);
  });

  it("uses a rolling 7 × 24 hour window (BR-19)", () => {
    expect(RECENT_WINDOW_MS).toBe(7 * 24 * 60 * 60 * 1000);
    const now = new Date("2026-10-11T05:00:00.000Z");
    expect(recentSince(now).toISOString()).toBe("2026-10-04T05:00:00.000Z");
  });

  it("turns a status filter into a Prisma where fragment shared by lists and dashboards", () => {
    const now = new Date("2026-10-11T05:00:00.000Z");
    expect(statusWhere("OPEN", now)).toEqual({ currentStatus: "OPEN" });
    expect(statusWhere("ACTIVE", now)).toEqual({ currentStatus: { in: [...ACTIVE_STATUSES] } });
    expect(statusWhere("RECENTLY_RESOLVED", now)).toEqual({
      statusHistory: { some: { toStatus: "RESOLVED", changedAt: { gte: new Date("2026-10-04T05:00:00.000Z") } } },
    });
  });

  it("ignores missing or unknown status values instead of failing", () => {
    expect(statusWhere(undefined)).toEqual({});
    expect(statusWhere("")).toEqual({});
    expect(statusWhere("DONE")).toEqual({});
    expect(statusWhere(["OPEN", "NEW"])).toEqual({});
  });
});
