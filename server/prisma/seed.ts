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

  const users = [
    // Requesters
    { name: "Jennifer Anderson", email: "jennifer.a@toktickit.test", role: "REQUESTER" as const, isActive: true },
    { name: "Michael Brown", email: "michael.b@toktickit.test", role: "REQUESTER" as const, isActive: true },
    { name: "Sarah Johnson", email: "sarah.j@toktickit.test", role: "REQUESTER" as const, isActive: true },
    { name: "David Lee", email: "david.l@toktickit.test", role: "REQUESTER" as const, isActive: true },
    { name: "Inactive Requester", email: "inactive.req@toktickit.test", role: "REQUESTER" as const, isActive: false },
    // IT Staff
    { name: "Kevin Patel", email: "kevin.p@toktickit.test", role: "IT_STAFF" as const, isActive: true },
    { name: "Emily Davis", email: "emily.d@toktickit.test", role: "IT_STAFF" as const, isActive: true },
    { name: "Robert Wilson", email: "robert.w@toktickit.test", role: "IT_STAFF" as const, isActive: true },
    { name: "Inactive Staff", email: "inactive.staff@toktickit.test", role: "IT_STAFF" as const, isActive: false },
    // Administrator
    { name: "Admin User", email: "admin@toktickit.test", role: "ADMINISTRATOR" as const, isActive: true },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        isActive: u.isActive,
        passwordHash: hash,
        mustChangePassword: true,
      },
      create: { ...u, passwordHash: hash, mustChangePassword: true },
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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


