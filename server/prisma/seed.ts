import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();
const DEV_PASSWORD = "DevPass!123"; // dev-only, documented in README

const categories = [
  "Account and Access",
  "Hardware",
  "Software",
  "Network",
];

const relatedSystems = [
  "Email", "Campus Wi-Fi", "VPN", "LEB2 App",
  "Grade Submission App", "Printer", "Corporate Laptop",
];

async function seedUsers() {
  const hash = await bcrypt.hash(DEV_PASSWORD, 10);

  // mustChangePassword defaults to true (first-login flow). The accounts E2E tests log in with
  // (jennifer.a, sarah.j, kevin.p, admin) skip it; michael.b stays true for e2e/lab-03/first-login.spec.ts.
  const users: {
    name: string; email: string; role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
    isActive: boolean; mustChangePassword?: boolean;
  }[] = [
    // Requesters
    { name: "Jennifer Anderson", email: "jennifer.a@toktickit.test", role: "REQUESTER" as const, isActive: true, mustChangePassword: false },
    { name: "Michael Brown", email: "michael.b@toktickit.test", role: "REQUESTER" as const, isActive: true },
    { name: "Sarah Johnson", email: "sarah.j@toktickit.test", role: "REQUESTER" as const, isActive: true, mustChangePassword: false },
    { name: "David Lee", email: "david.l@toktickit.test", role: "REQUESTER" as const, isActive: true },
    { name: "Inactive Requester", email: "inactive.req@toktickit.test", role: "REQUESTER" as const, isActive: false },
    // Lab 4: owns no tickets, so the Requester Dashboard shows zero metrics and empty states
    { name: "Nina Park", email: "nina.p@toktickit.test", role: "REQUESTER" as const, isActive: true, mustChangePassword: false },
    // IT Staff
    { name: "Kevin Patel", email: "kevin.p@toktickit.test", role: "IT_STAFF" as const, isActive: true, mustChangePassword: false },
    { name: "Emily Davis", email: "emily.d@toktickit.test", role: "IT_STAFF" as const, isActive: true },
    { name: "Robert Wilson", email: "robert.w@toktickit.test", role: "IT_STAFF" as const, isActive: true },
    { name: "Inactive Staff", email: "inactive.staff@toktickit.test", role: "IT_STAFF" as const, isActive: false },
    // Lab 4: owns no tickets and has no actions assigned, for the IT Staff Dashboard zero state
    { name: "Liam Chen", email: "liam.c@toktickit.test", role: "IT_STAFF" as const, isActive: true, mustChangePassword: false },
    // Administrator
    { name: "Admin User", email: "admin@toktickit.test", role: "ADMINISTRATOR" as const, isActive: true, mustChangePassword: false },
  ];

  const e2eReadyUser = await prisma.user.findUnique({ where: { email: "jennifer.a@toktickit.test" } });
if (e2eReadyUser) {
  await prisma.user.update({
    where: { id: e2eReadyUser.id },
    data: { mustChangePassword: false },
  });
}

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        isActive: u.isActive,
        passwordHash: hash,
        mustChangePassword: u.mustChangePassword ?? true,
      },
      create: { ...u, passwordHash: hash, mustChangePassword: u.mustChangePassword ?? true },
    });
  }
  console.log(`Seeded ${users.length} users (dev password: ${DEV_PASSWORD}).`);
}

async function main() {
  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  for (const name of relatedSystems) {
    await prisma.relatedSystem.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  await seedUsers();
  await seedLab4Tickets();
}

// ---------------------------------------------------------------------------
// Lab 4 demo tickets: every status, every IT Priority, assigned and unassigned,
// and zero / one / several Actions Taken (one ticket with actions by different staff).
// Idempotent: a ticket is keyed by its summary ("SEED-L4-xx ..."); an existing one
// is left untouched, so re-running never duplicates tickets, actions or history.
// ---------------------------------------------------------------------------
type Status = "NEW" | "OPEN" | "IN_PROGRESS" | "WAITING_FOR_REQUESTER" | "RESOLVED" | "CLOSED" | "REOPENED" | "CANCELLED";
type SeedAction = {
  by: string; assignee?: string; hoursAgo: number; description: string; result?: string;
  status: "PLANNED" | "COMPLETED" | "CANCELLED"; followUpNote?: string; attachmentNotes?: string;
};
type SeedTicket = {
  key: string; summary: string; description: string; requester: string; owner?: string;
  category: string; system: string; requestedPriority: "LOW" | "MEDIUM" | "HIGH"; itPriority: "LOW" | "MEDIUM" | "HIGH";
  status: Status; daysAgo: number; history?: { from: Status; to: Status; by: string; hoursAgo: number }[];
  actions?: SeedAction[];
};

const KEVIN = "kevin.p@toktickit.test";
const EMILY = "emily.d@toktickit.test";
const ROBERT = "robert.w@toktickit.test";

const lab4Tickets: SeedTicket[] = [
  {
    key: "SEED-L4-01", summary: "Laptop will not power on after update", description: "Corporate laptop stays black after last night's update.",
    requester: "sarah.j@toktickit.test", category: "Hardware", system: "Corporate Laptop",
    requestedPriority: "HIGH", itPriority: "HIGH", status: "NEW", daysAgo: 1,
  },
  {
    key: "SEED-L4-02", summary: "Request access to Grade Submission App", description: "New lecturer needs access before the grading deadline.",
    requester: "sarah.j@toktickit.test", owner: KEVIN, category: "Account and Access", system: "Grade Submission App",
    requestedPriority: "MEDIUM", itPriority: "MEDIUM", status: "OPEN", daysAgo: 2,
    history: [{ from: "NEW", to: "OPEN", by: KEVIN, hoursAgo: 40 }],
    actions: [{ by: KEVIN, hoursAgo: 30, description: "Requested approval from the faculty office.", status: "PLANNED" }],
  },
  {
    key: "SEED-L4-03", summary: "VPN disconnects every few minutes", description: "VPN drops roughly every five minutes when working from home.",
    requester: "david.l@toktickit.test", owner: KEVIN, category: "Network", system: "VPN",
    requestedPriority: "MEDIUM", itPriority: "HIGH", status: "IN_PROGRESS", daysAgo: 4,
    history: [
      { from: "NEW", to: "OPEN", by: EMILY, hoursAgo: 90 },
      { from: "OPEN", to: "IN_PROGRESS", by: KEVIN, hoursAgo: 70 },
    ],
    actions: [
      { by: EMILY, hoursAgo: 80, description: "Collected VPN client logs from the user.", result: "Logs show repeated keep-alive timeouts.", status: "COMPLETED", attachmentNotes: "vpn-client.log attached to the ticket" },
      { by: KEVIN, hoursAgo: 50, description: "Updated VPN client to the latest version.", result: "Drops reduced but still happen on home Wi-Fi.", status: "COMPLETED", followUpNote: "Check the MTU setting on the user's home router." },
      { by: KEVIN, assignee: ROBERT, hoursAgo: 10, description: "Schedule a remote session to inspect the home router.", status: "PLANNED" },
    ],
  },
  {
    key: "SEED-L4-04", summary: "Email signature shows the old logo", description: "Outlook signature still uses the 2025 logo.",
    requester: "sarah.j@toktickit.test", owner: EMILY, category: "Software", system: "Email",
    requestedPriority: "LOW", itPriority: "LOW", status: "WAITING_FOR_REQUESTER", daysAgo: 3,
    history: [
      { from: "NEW", to: "IN_PROGRESS", by: EMILY, hoursAgo: 60 },
      { from: "IN_PROGRESS", to: "WAITING_FOR_REQUESTER", by: EMILY, hoursAgo: 20 },
    ],
    actions: [{ by: EMILY, hoursAgo: 22, description: "Sent the new signature template to the user.", result: "Waiting for the user to confirm it displays correctly.", status: "COMPLETED", attachmentNotes: "signature-2026.png in the email thread" }],
  },
  {
    key: "SEED-L4-05", summary: "Printer on floor 3 jams on every job", description: "Room 304 printer jams on the first page of every job.",
    requester: "sarah.j@toktickit.test", owner: KEVIN, category: "Hardware", system: "Printer",
    requestedPriority: "MEDIUM", itPriority: "MEDIUM", status: "RESOLVED", daysAgo: 6,
    history: [
      { from: "NEW", to: "IN_PROGRESS", by: KEVIN, hoursAgo: 130 },
      { from: "IN_PROGRESS", to: "RESOLVED", by: KEVIN, hoursAgo: 26 },
    ],
    actions: [
      { by: KEVIN, hoursAgo: 120, description: "Cleaned the paper path and rollers.", result: "Jams continued.", status: "COMPLETED" },
      { by: KEVIN, hoursAgo: 30, description: "Replaced the pickup roller.", result: "Printed 50 test pages without a jam.", status: "COMPLETED" },
    ],
  },
  {
    key: "SEED-L4-06", summary: "Campus Wi-Fi password reset", description: "Forgot the campus Wi-Fi password after changing phones.",
    requester: "david.l@toktickit.test", owner: EMILY, category: "Account and Access", system: "Campus Wi-Fi",
    requestedPriority: "LOW", itPriority: "LOW", status: "CLOSED", daysAgo: 12,
    history: [
      { from: "NEW", to: "IN_PROGRESS", by: EMILY, hoursAgo: 280 },
      { from: "IN_PROGRESS", to: "RESOLVED", by: EMILY, hoursAgo: 270 },
      { from: "RESOLVED", to: "CLOSED", by: EMILY, hoursAgo: 200 },
    ],
    actions: [{ by: EMILY, hoursAgo: 272, description: "Reset the Wi-Fi credential and walked the user through reconnecting.", result: "User is connected.", status: "COMPLETED" }],
  },
  {
    key: "SEED-L4-07", summary: "LEB2 app crashes when uploading files", description: "LEB2 closes as soon as I pick a PDF to upload.",
    requester: "jennifer.a@toktickit.test", owner: ROBERT, category: "Software", system: "LEB2 App",
    requestedPriority: "HIGH", itPriority: "HIGH", status: "REOPENED", daysAgo: 9,
    history: [
      { from: "NEW", to: "IN_PROGRESS", by: ROBERT, hoursAgo: 200 },
      { from: "IN_PROGRESS", to: "RESOLVED", by: ROBERT, hoursAgo: 120 },
      { from: "RESOLVED", to: "REOPENED", by: ROBERT, hoursAgo: 15 },
    ],
    actions: [
      { by: ROBERT, hoursAgo: 125, description: "Cleared the app cache and reinstalled LEB2.", result: "Upload worked during the session.", status: "COMPLETED" },
      { by: ROBERT, hoursAgo: 100, description: "Escalate to the LEB2 vendor.", status: "CANCELLED" },
    ],
  },
  {
    key: "SEED-L4-08", summary: "Duplicate request for software license", description: "Submitted twice by mistake.",
    requester: "david.l@toktickit.test", category: "Software", system: "Corporate Laptop",
    requestedPriority: "LOW", itPriority: "LOW", status: "CANCELLED", daysAgo: 5,
    history: [{ from: "NEW", to: "CANCELLED", by: EMILY, hoursAgo: 100 }],
  },
  {
    key: "SEED-L4-09", summary: "Projector in lecture hall shows no signal", description: "HDMI input shows no signal with every laptop.",
    requester: "david.l@toktickit.test", category: "Hardware", system: "Corporate Laptop",
    requestedPriority: "HIGH", itPriority: "HIGH", status: "OPEN", daysAgo: 8,
    history: [{ from: "NEW", to: "OPEN", by: KEVIN, hoursAgo: 150 }],
  },
];

async function seedLab4Tickets() {
  const HOUR = 60 * 60 * 1000;
  const now = Date.now();
  const userIds = new Map<string, number>();
  const idOf = async (email: string) => {
    if (!userIds.has(email)) userIds.set(email, (await prisma.user.findUniqueOrThrow({ where: { email } })).id);
    return userIds.get(email)!;
  };

  let created = 0;
  for (const t of lab4Tickets) {
    const summary = `${t.key} ${t.summary}`;
    if (await prisma.ticket.findFirst({ where: { summary } })) continue;

    const createdAt = new Date(now - t.daysAgo * 24 * HOUR);
    const latest = Math.max(
      createdAt.getTime(),
      ...(t.actions ?? []).map((a) => now - a.hoursAgo * HOUR),
      ...(t.history ?? []).map((h) => now - h.hoursAgo * HOUR),
    );
    const category = await prisma.category.findUniqueOrThrow({ where: { name: t.category } });
    const system = await prisma.relatedSystem.findUniqueOrThrow({ where: { name: t.system } });
    const requesterId = await idOf(t.requester);
    const ticketOwnerId = t.owner ? await idOf(t.owner) : null;
    for (const email of [...(t.actions ?? []).flatMap((a) => [a.by, a.assignee ?? a.by]), ...(t.history ?? []).map((h) => h.by)]) {
      await idOf(email);
    }

    await prisma.$transaction(async (tx) => {
      const [{ nextval }] = await tx.$queryRaw<{ nextval: bigint }[]>`SELECT nextval('ticket_number_seq')`;
      const ticket = await tx.ticket.create({
        data: {
          ticketNumber: `TKT-${new Date().getFullYear()}-${String(Number(nextval)).padStart(6, "0")}`,
          summary, description: t.description, requesterId, ticketOwnerId,
          categoryId: category.id, relatedSystemId: system.id,
          requestedPriority: t.requestedPriority, itPriority: t.itPriority,
          currentStatus: t.status, version: 1 + (t.history?.length ?? 0),
          createdAt, updatedAt: new Date(latest),
        },
      });
      for (const a of t.actions ?? []) {
        await tx.actionTaken.create({
          data: {
            ticketId: ticket.id, performedById: userIds.get(a.by)!, assigneeId: userIds.get(a.assignee ?? a.by)!,
            actionAt: new Date(now - a.hoursAgo * HOUR), description: a.description, result: a.result ?? null,
            followUpRequired: Boolean(a.followUpNote), followUpNote: a.followUpNote ?? null,
            attachmentNotes: a.attachmentNotes ?? null, status: a.status,
          },
        });
      }
      for (const h of t.history ?? []) {
        await tx.ticketStatusHistory.create({
          data: { ticketId: ticket.id, fromStatus: h.from, toStatus: h.to, changedById: userIds.get(h.by)!, changedAt: new Date(now - h.hoursAgo * HOUR) },
        });
      }
    });
    created++;
  }
  console.log(`Seeded Lab 4 demo tickets (${created} new, ${lab4Tickets.length - created} already present).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


