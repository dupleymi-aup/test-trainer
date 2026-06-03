import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { checkRateLimit, getClientIp, createRateLimitResponse, rateLimits } from "@/lib/rate-limit";
import { readFileSync, existsSync } from "fs";
import path from "path";

export async function GET(req: Request) {
  try {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;

    const ip = getClientIp(req);
    const rl = checkRateLimit(`admin-backup:${ip}`, rateLimits.adminReportExport);
    if (rl.limited) return createRateLimitResponse(rl.resetAt);

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "json";
    const table = searchParams.get("table");

    if (format === "sqlite" && !table) {
      const dbUrl = process.env.DATABASE_URL || "file:./test-trainer.db";
      let filePath = dbUrl.replace("file:", "");
      if (filePath.startsWith("./")) filePath = path.resolve(process.cwd(), filePath);

      if (!existsSync(filePath)) {
        return NextResponse.json({ error: "Database file not found" }, { status: 404 });
      }

      const buffer = readFileSync(filePath);
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename="backup-${timestamp}.db"`,
          "Content-Length": String(buffer.length),
        },
      });
    }

    if (format === "sqlite" && table) {
      return NextResponse.json({ error: "Table-specific SQLite dumps not supported. Use JSON format for table data." }, { status: 400 });
    }

    if (table) {
      const dbAny = db as unknown as Record<string, unknown>;
      const model = dbAny[table] as { findMany: (args: Record<string, unknown>) => Promise<unknown[]> } | undefined;
      if (!model || typeof model.findMany !== "function") {
        return NextResponse.json({ error: `Unknown table: ${table}` }, { status: 400 });
      }
      const rows = await model.findMany({});
      return NextResponse.json({ table, rows, count: rows.length, exportedAt: new Date().toISOString() });
    }

    let dbSize = null;
    try {
      const dbUrl = process.env.DATABASE_URL || "file:./test-trainer.db";
      let filePath = dbUrl.replace("file:", "");
      if (filePath.startsWith("./")) filePath = path.resolve(process.cwd(), filePath);
      if (existsSync(filePath)) {
        const stats = (await import("fs")).statSync(filePath);
        dbSize = stats.size;
      }
    } catch { /* ignore */ }

    const [users, groups, attempts, notifications, deadlines, messages] = await Promise.all([
      db.user.count({ where: { deletedAt: null } }),
      db.group.count(),
      db.attempt.count(),
      db.notification.count({ where: { read: false } }),
      db.deadline.count({ where: { dueDate: { gte: new Date() } } }),
      db.message.count(),
    ]);

    return NextResponse.json({
      stats: { users, groups, attempts, unreadNotifications: notifications, activeDeadlines: deadlines, totalMessages: messages },
      dbSize,
      exportedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Failed to create backup", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to create backup" }, { status: 500 });
  }
}
