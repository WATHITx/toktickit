import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const categories = [
  "Account and Access",
  "Hardware",
  "Software",
  "Network",
];



async function main() {
  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },       // เช็คด้วย unique field
      update: {},             // ถ้ามีอยู่แล้ว ไม่ต้องอัปเดตอะไร
      create: { name },       // ถ้ายังไม่มี ค่อย insert
    });
  }
  const requesters = [
  { name: "Jennifer Anderson", email: "jennifer.a@toktickit.test", isActive: true },
  { name: "Michael Brown", email: "michael.b@toktickit.test", isActive: true },
  { name: "Sarah Johnson", email: "sarah.j@toktickit.test", isActive: true },
  { name: "David Lee", email: "david.l@toktickit.test", isActive: true },
  { name: "Inactive Test User", email: "inactive.user@toktickit.test", isActive: false },
];

for (const r of requesters) {
  await prisma.requesterUser.upsert({
    where: { email: r.email },
    update: {},
    create: r,
  });
}
console.log(`Seeded ${requesters.length} development requesters.`);

const relatedSystems = [
  "Email", "Campus Wi-Fi", "VPN", "LEB2 App",
  "Grade Submission App", "Printer", "Corporate Laptop",
];

for (const name of relatedSystems) {
  await prisma.relatedSystem.upsert({
    where: { name },
    update: {},
    create: { name },
  });
}
console.log(`Seeded ${relatedSystems.length} related systems.`);
}



main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

