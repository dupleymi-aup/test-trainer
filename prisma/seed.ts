import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const dbType = process.env.DB_TYPE || "sqlite"

// MongoDB uses a separate seed script
if (dbType === "mongodb") {
  console.log("MongoDB detected — skipping Prisma seed. Use scripts/seed-mongodb.ts instead.")
  process.exit(0)
}

const prisma = new PrismaClient();

async function main() {
  console.log(`Starting database seed for ${dbType}...`);

  const hashedPassword = await bcrypt.hash("admin123", 12);
  const teacherPassword = await bcrypt.hash("teacher123", 12);
  const studentPassword = await bcrypt.hash("student123", 12);

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: "admin@testtrainer.local" },
    update: {},
    create: {
      name: "Администратор",
      email: "admin@testtrainer.local",
      hashedPassword,
      role: Role.ADMIN,
    },
  });
  console.log(`Created admin: ${admin.email}`);

  // Create teacher user
  const teacher = await prisma.user.upsert({
    where: { email: "teacher@testtrainer.local" },
    update: {},
    create: {
      name: "Преподаватель",
      email: "teacher@testtrainer.local",
      hashedPassword: teacherPassword,
      role: Role.TEACHER,
    },
  });
  console.log(`Created teacher: ${teacher.email}`);

  // Create student user
  const student = await prisma.user.upsert({
    where: { email: "student@testtrainer.local" },
    update: {},
    create: {
      name: "Студент",
      email: "student@testtrainer.local",
      hashedPassword: studentPassword,
      role: Role.STUDENT,
    },
  });
  console.log(`Created student: ${student.email}`);

  // Create sample groups
  const group1 = await prisma.group.create({
    data: {
      name: "Группа ИС-21",
      description: "Студенты курса по Информационным Системам",
      createdByUserId: admin.id,
    },
  });
  console.log(`Created group: ${group1.name}`);

  const group2 = await prisma.group.create({
    data: {
      name: "Группа П-32",
      description: "Студенты курса по Программированию",
      createdByUserId: teacher.id,
    },
  });
  console.log(`Created group: ${group2.name}`);

  // Assign student to teacher's group
  await prisma.userGroup.upsert({
    where: { userId_groupId: { userId: student.id, groupId: group2.id } },
    update: {},
    create: {
      userId: student.id,
      groupId: group2.id,
      assignedByUserId: teacher.id,
    },
  });
  console.log(`Assigned ${student.email} to ${group2.name}`);

  // Create system settings
  const settings = [
    { key: "maxLoginAttempts", value: JSON.stringify(5) },
    { key: "sessionDuration", value: JSON.stringify(86400) },
    { key: "allowRegistration", value: JSON.stringify(true) },
    { key: "defaultReminderSchedule", value: JSON.stringify([7, 3, 1, 0, -1]) },
    { key: "emailNotifications", value: JSON.stringify(true) },
  ];

  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }
  console.log("Created system settings");

  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
