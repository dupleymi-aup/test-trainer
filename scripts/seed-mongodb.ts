import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";

const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/testtrainer"

async function main() {
  console.log("Starting MongoDB seed...");

  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db();

  const hashedPassword = await bcrypt.hash("admin123", 12);
  const teacherPassword = await bcrypt.hash("teacher123", 12);

  // Create admin user
  const adminResult = await db.collection("User").updateOne(
    { email: "admin@testtrainer.local" },
    {
      $setOnInsert: {
        name: "Администратор",
        email: "admin@testtrainer.local",
        hashedPassword,
        role: "ADMIN",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );
  console.log("Created admin: admin@testtrainer.local");

  // Create teacher user
  await db.collection("User").updateOne(
    { email: "teacher@testtrainer.local" },
    {
      $setOnInsert: {
        name: "Преподаватель",
        email: "teacher@testtrainer.local",
        hashedPassword: teacherPassword,
        role: "TEACHER",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );
  console.log("Created teacher: teacher@testtrainer.local");

  // Get admin/teacher IDs for group creation
  const admin = await db.collection("User").findOne({ email: "admin@testtrainer.local" });
  const teacher = await db.collection("User").findOne({ email: "teacher@testtrainer.local" });

  // Create sample groups
  await db.collection("Group").updateOne(
    { name: "Группа ИС-21" },
    {
      $setOnInsert: {
        name: "Группа ИС-21",
        description: "Студенты курса по Информационным Системам",
        createdByUserId: admin!._id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );
  console.log("Created group: Группа ИС-21");

  await db.collection("Group").updateOne(
    { name: "Группа П-32" },
    {
      $setOnInsert: {
        name: "Группа П-32",
        description: "Студенты курса по Программированию",
        createdByUserId: teacher!._id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );
  console.log("Created group: Группа П-32");

  // Create system settings
  const settings = [
    { key: "maxLoginAttempts", value: JSON.stringify(5) },
    { key: "sessionDuration", value: JSON.stringify(86400) },
    { key: "allowRegistration", value: JSON.stringify(true) },
    { key: "defaultReminderSchedule", value: JSON.stringify([7, 3, 1, 0, -1]) },
    { key: "emailNotifications", value: JSON.stringify(true) },
  ];

  for (const s of settings) {
    await db.collection("SystemSetting").updateOne(
      { key: s.key },
      { $setOnInsert: { ...s, updatedAt: new Date() } },
      { upsert: true }
    );
  }
  console.log("Created system settings");

  await client.close();
  console.log("MongoDB seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
