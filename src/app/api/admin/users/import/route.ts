import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { requireCSRF } from "@/lib/csrf-middleware";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { logger } from "@/lib/logger";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;
    const { session } = guard;

    const csrf = await requireCSRF(req);
    if ("response" in csrf) return csrf.response;

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

    const { csv, defaultRole, defaultPassword } = body;
    if (!csv) return NextResponse.json({ error: "CSV content is required" }, { status: 400 });

    const role = (defaultRole as Role) || "STUDENT";
    const password = defaultPassword || "changeme123";

    if (!Object.values(Role).includes(role)) {
      return NextResponse.json({ error: `Invalid role: ${role}` }, { status: 400 });
    }

    // Parse CSV (expecting: name,email,phone,group,university or just name,email)
    const lines = csv.trim().split("\n");
    if (lines.length < 2) {
      return NextResponse.json({ error: "CSV must have a header row and at least one data row" }, { status: 400 });
    }

    const headers = lines[0].split(",").map((h: string) => h.trim().toLowerCase());
    const results: Array<{ status: "ok" | "error"; email?: string; error?: string }> = [];
    let created = 0;
    let skipped = 0;

    const hashedPassword = await bcrypt.hash(password, 12);

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v: string) => v.trim());
      if (values.length < 2) continue;

      const row: Record<string, string> = {};
      headers.forEach((h: string, idx: number) => { row[h] = values[idx] || ""; });

      const email = row.email?.toLowerCase().trim();
      if (!email) {
        results.push({ status: "error", error: "Missing email" });
        skipped++;
        continue;
      }

      // Check if user exists
      const existing = await db.user.findUnique({ where: { email } });
      if (existing) {
        results.push({ status: "error", email, error: "User already exists" });
        skipped++;
        continue;
      }

      try {
        await db.user.create({
          data: {
            name: row.name || null,
            email,
            phone: row.phone || null,
            hashedPassword,
            role,
            group: row.group || null,
            university: row.university || null,
            isActive: true,
          },
        });
        results.push({ status: "ok", email });
        created++;
      } catch (err) {
        results.push({ status: "error", email, error: err instanceof Error ? err.message : "Unknown error" });
        skipped++;
      }
    }

    // Log activity
    await db.activityLog.create({
      data: {
        userId: session.userId,
        action: "USER_BULK_IMPORT",
        entity: "User",
        details: JSON.stringify({ created, skipped, total: lines.length - 1 }),
      },
    });

    return NextResponse.json({ created, skipped, results });
  } catch (error) {
    logger.error("Failed to import users", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to import users" }, { status: 500 });
  }
}
