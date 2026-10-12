import { PrismaClient, Prisma } from "@prisma/client";

// Removes tickets created by the automated tests (API and E2E) so the dashboards and screenshots show
// realistic demo data. Seeded demo tickets (SEED-L4-*) and anything else are never touched.
//
//   npx tsx prisma/cleanupTestData.ts           → dry run: only prints what would be deleted
//   npx tsx prisma/cleanupTestData.ts --apply   → deletes them (take a pg_dump first)
//
// Attachment rows are deleted; uploaded files stay in the uploads folder.

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

// Summaries and prefixes written by server/tests/** and e2e/** — keep in sync when tests change
const EXACT_SUMMARIES = [
  "Attachment test ticket", "Ownership test", "Laptop battery drains quickly", "AC-03 test ticket",
  "Private ticket", "Comment test ticket", "Resolve test", "t",
];
const SUMMARY_PREFIXES = ["L4-TEST", "E2E ", "TKT-TEST-"];
const TICKET_NUMBER_PREFIXES = ["TKT-TEST-"];

const testTickets: Prisma.TicketWhereInput = {
  AND: [
    { NOT: { summary: { startsWith: "SEED-L4-" } } },
    {
      OR: [
        { summary: { in: EXACT_SUMMARIES } },
        ...SUMMARY_PREFIXES.map((p) => ({ summary: { startsWith: p } })),
        ...TICKET_NUMBER_PREFIXES.map((p) => ({ ticketNumber: { startsWith: p } })),
      ],
    },
  ],
};

async function main() {
  const tickets = await prisma.ticket.findMany({ where: testTickets, select: { id: true } });
  const ids = tickets.map((t) => t.id);
  const byTicket = { ticketId: { in: ids } };
  const counts = {
    tickets: ids.length,
    actionsTaken: await prisma.actionTaken.count({ where: byTicket }),
    statusHistory: await prisma.ticketStatusHistory.count({ where: byTicket }),
    publicComments: await prisma.publicComment.count({ where: byTicket }),
    internalNotes: await prisma.internalNote.count({ where: byTicket }),
    attachments: await prisma.attachment.count({ where: byTicket }),
  };
  const remaining = (await prisma.ticket.count()) - ids.length;

  console.log(apply ? "Deleting test-generated data:" : "Dry run — would delete:", counts);
  console.log(`Tickets kept: ${remaining}`);
  if (!apply) {
    console.log("Nothing was changed. Re-run with --apply to delete.");
    return;
  }

  await prisma.$transaction([
    prisma.actionTaken.deleteMany({ where: byTicket }),
    prisma.ticketStatusHistory.deleteMany({ where: byTicket }),
    prisma.publicComment.deleteMany({ where: byTicket }),
    prisma.internalNote.deleteMany({ where: byTicket }),
    prisma.attachment.deleteMany({ where: byTicket }),
    prisma.ticket.deleteMany({ where: { id: { in: ids } } }),
  ]);
  console.log("Done.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
