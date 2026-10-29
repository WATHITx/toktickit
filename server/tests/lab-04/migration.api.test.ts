import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { getPrisma } from "../../src/prisma";

// MIG-01 / MIG-02 (AC-16, BR-25): the Lab 4 migration is additive and the seed is idempotent.
describe("Lab 4 migration and seed", () => {
  it("has the Lab 4 migration applied after every earlier migration (MIG-01)", async () => {
    const rows = await getPrisma().$queryRaw<{ migration_name: string; finished_at: Date | null; rolled_back_at: Date | null }[]>`
      SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY migration_name`;

    expect(rows.every((r) => r.finished_at !== null && r.rolled_back_at === null)).toBe(true);
    const names = rows.map((r) => r.migration_name);
    const lab4 = names.findIndex((n) => n.endsWith("add_actions_taken_and_status_history"));
    expect(lab4).toBeGreaterThan(-1);
    expect(names.findIndex((n) => n.endsWith("add_internal_notes"))).toBeLessThan(lab4);
  });

  it("keeps earlier records linked to existing parents (MIG-01)", async () => {
    const prisma = getPrisma();
    const [tickets, attachments, comments, notes] = await Promise.all([
      prisma.ticket.findMany({ include: { requester: true } }),
      prisma.attachment.findMany({ include: { ticket: true } }),
      prisma.publicComment.findMany({ include: { ticket: true, author: true } }),
      prisma.internalNote.findMany({ include: { ticket: true, author: true } }),
    ]);
    expect(tickets.length).toBeGreaterThan(0);
    expect(tickets.every((t) => t.requester !== null)).toBe(true);
    expect(attachments.every((a) => a.ticket !== null)).toBe(true);
    expect(comments.every((c) => c.ticket !== null && c.author !== null)).toBe(true);
    expect(notes.every((n) => n.ticket !== null && n.author !== null)).toBe(true);
  });

  it("starts tickets that never changed status at version 1 (MIG-01, BR-25)", async () => {
    const prisma = getPrisma();
    // Every status change appends history and bumps version, so a ticket without history must still be at 1.
    const untouched = await prisma.ticket.findMany({ where: { statusHistory: { none: {} } }, select: { version: true } });
    expect(untouched.length).toBeGreaterThan(0);
    expect(untouched.every((t) => t.version === 1)).toBe(true);
  });

  it("can run the seed repeatedly without changing row counts (MIG-02)", async () => {
    const prisma = getPrisma();
    const counts = async () => ({
      users: await prisma.user.count(),
      tickets: await prisma.ticket.count(),
      actions: await prisma.actionTaken.count(),
      history: await prisma.ticketStatusHistory.count(),
      categories: await prisma.category.count(),
      relatedSystems: await prisma.relatedSystem.count(),
    });

    execSync("npx tsx prisma/seed.ts", { stdio: "pipe" });
    const first = await counts();
    execSync("npx tsx prisma/seed.ts", { stdio: "pipe" });
    expect(await counts()).toEqual(first);
  }, 60_000);

  it("seeds demo data covering every status and zero/one/many Actions Taken", async () => {
    const prisma = getPrisma();
    const seeded = await prisma.ticket.findMany({
      where: { summary: { startsWith: "SEED-L4-" } },
      include: { actionsTaken: true },
    });
    expect(new Set(seeded.map((t) => t.currentStatus)).size).toBe(8);
    expect(new Set(seeded.map((t) => t.itPriority)).size).toBe(3);
    expect(seeded.some((t) => t.ticketOwnerId === null)).toBe(true);
    expect(seeded.some((t) => t.ticketOwnerId !== null)).toBe(true);

    const actionCounts = seeded.map((t) => t.actionsTaken.length);
    expect(actionCounts).toContain(0);
    expect(actionCounts).toContain(1);
    expect(actionCounts.some((n) => n > 1)).toBe(true);
    expect(seeded.some((t) => new Set(t.actionsTaken.map((a) => a.performedById)).size > 1)).toBe(true);

    // Zero-state demo accounts exist and the seed gives them no work. (Manual testing may add data to them
    // later, so dashboard empty-state tests create their own fresh users instead of relying on these.)
    const nina = await prisma.user.findUniqueOrThrow({ where: { email: "nina.p@toktickit.test" } });
    const liam = await prisma.user.findUniqueOrThrow({ where: { email: "liam.c@toktickit.test" } });
    expect(seeded.some((t) => t.requesterId === nina.id || t.ticketOwnerId === liam.id)).toBe(false);
    expect(seeded.some((t) => t.actionsTaken.some((a) => a.assigneeId === liam.id))).toBe(false);
  });
});
