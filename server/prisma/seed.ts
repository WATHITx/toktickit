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
  console.log("Seed completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });