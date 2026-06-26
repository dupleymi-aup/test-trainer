import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const pw = await bcrypt.hash("student123", 12);
  const s = await prisma.user.upsert({
    where: { email: "student@testtrainer.local" },
    update: {},
    create: {
      name: "Студент",
      email: "student@testtrainer.local",
      hashedPassword: pw,
      role: Role.STUDENT,
    },
  });
  console.log("Created student:", s.email);
  await prisma.$disconnect();
}

main();
