import { describe, it, expect } from "vitest";
import { getPrisma } from "../../src/prisma";

// MIG-01 (AC-14, BR-20): Lab 2 data must survive the Lab 3 migrations untouched.
// This checks the current database rather than replaying the migrations: every migration is recorded as
// applied, and the Lab 2 tickets and attachments are still intact and linked to their owners.
describe("Lab 3 migration preserves Lab 2 data", () => {
  it("has every migration applied and none rolled back", async () => {
    const rows = await getPrisma().$queryRaw<
      { migration_name: string; finished_at: Date | null; rolled_back_at: Date | null }[]
    >`SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations`;

    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.finished_at !== null && r.rolled_back_at === null)).toBe(true);
    expect(rows.some((r) => r.migration_name.includes("migrate_requesteruser_to_user"))).toBe(true);
  });

  it("keeps every ticket linked to an existing Requester with a unique Ticket Number", async () => {
    const prisma = getPrisma();
    const tickets = await prisma.ticket.findMany({ include: { requester: true } });

    expect(tickets.length).toBeGreaterThan(0);
    for (const t of tickets) {
      expect(t.requester).not.toBeNull();
      expect(t.requester.role).toBe("REQUESTER");
      expect(t.ticketNumber).toMatch(/^TKT-/);
    }
    expect(new Set(tickets.map((t) => t.ticketNumber)).size).toBe(tickets.length);
  });

  it("keeps every attachment linked to an existing ticket", async () => {
    const prisma = getPrisma();
    const attachments = await prisma.attachment.findMany({ include: { ticket: true } });
    for (const a of attachments) {
      expect(a.ticket).not.toBeNull();
    }
  });
});
