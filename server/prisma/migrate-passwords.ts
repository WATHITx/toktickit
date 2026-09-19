import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const usersWithoutPassword = await prisma.user.findMany({
    where: { passwordHash: null as any },
  });

  for (const user of usersWithoutPassword) {
    const initialPassword = "ChangeMe!123"; // dev-only, documented in README
    const passwordHash = await bcrypt.hash(initialPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, mustChangePassword: true },
    });
  }
  console.log(`Backfilled passwords for ${usersWithoutPassword.length} migrated users.`);
}

main().finally(() => prisma.$disconnect());