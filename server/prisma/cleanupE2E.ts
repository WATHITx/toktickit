import { PrismaClient } from "@prisma/client";

// Removes users created by e2e/lab-03/user-administration.spec.ts (email prefix "e2e-test-").
// They own no tickets, so deleting them is safe.
const prisma = new PrismaClient();

prisma.user
  .deleteMany({ where: { email: { startsWith: "e2e-test-" } } })
  .then((r) => console.log(`Removed ${r.count} E2E test user(s).`))
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
