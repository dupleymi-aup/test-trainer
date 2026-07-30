import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { withErrorHandler, unwrapGuard } from "@/lib/api-error-handler";
import { checkRateLimit, getClientIp, createRateLimitResponse, rateLimits } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  return withErrorHandler(req, async () => {
    const session = unwrapGuard(await requireAdmin());

    const ip = getClientIp(req);
    const rl = checkRateLimit(`admin-export:${ip}`, rateLimits.adminReportExport);
    if (rl.limited) return createRateLimitResponse(rl.resetAt);

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "csv";

    const users = await db.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        university: true,
        group: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { attempts: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    if (format === "json") {
      db.activityLog.create({
        data: {
          userId: session.userId,
          action: "EXPORT_REPORT",
          entity: "User",
          details: JSON.stringify({ reportType: "user-list", format: "json", count: users.length }),
          ipAddress: ip,
        },
      }).catch((e) => { logger.warn("Failed to log export activity", { error: String(e) }); });
      return NextResponse.json({ users, count: users.length, exportedAt: new Date().toISOString() });
    }

    const headers = ["ID", "Имя", "Email", "Телефон", "Роль", "Активен", "Университет", "Группа", "Попыток", "Создан", "Обновлён"];
    const csvRows = [headers.join(",")];
    for (const u of users) {
      csvRows.push([
        `"${u.id}"`,
        `"${(u.name || "").replace(/"/g, '""')}"`,
        `"${(u.email || "").replace(/"/g, '""')}"`,
        `"${u.phone || ""}"`,
        u.role,
        u.isActive ? "Да" : "Нет",
        `"${(u.university || "").replace(/"/g, '""')}"`,
        `"${(u.group || "").replace(/"/g, '""')}"`,
        u._count.attempts,
        u.createdAt.toISOString(),
        u.updatedAt.toISOString(),
      ].join(","));
    }

    const csv = "\uFEFF" + csvRows.join("\n");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    db.activityLog.create({
      data: {
        userId: session.userId,
        action: "EXPORT_REPORT",
        entity: "User",
        details: JSON.stringify({ reportType: "user-list", format, count: users.length }),
        ipAddress: ip,
      },
    }).catch((e) => { logger.warn("Failed to log export activity", { error: String(e) }); });

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="users-export-${timestamp}.csv"`,
      },
    });
  });
}
