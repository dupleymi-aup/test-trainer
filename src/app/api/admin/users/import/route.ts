import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { requireCSRF } from "@/lib/csrf-middleware";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { withErrorHandler } from "@/lib/api-error-handler";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { checkRateLimit, createRateLimitResponse, getClientIp, rateLimits } from "@/lib/rate-limit";

const importSchema = z.object({
  csv: z.string().min(1, "CSV content is required"),
  defaultRole: z.nativeEnum(Role).optional().default(Role.STUDENT),
  defaultPassword: z.string().min(8, "Password must be at least 8 characters long"),
});

export async function POST(req: Request) {
  return withErrorHandler(req, async () => {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;
    const { session } = guard;

    const csrf = await requireCSRF(req);
    if ("response" in csrf) return csrf.response;

    // Rate limiting: protect against resource exhaustion
    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`adminUserImport:${ip}`, rateLimits.adminUserImport);
    if (rateLimit.limited) {
      return createRateLimitResponse(rateLimit.resetAt);
    }

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

    const parsed = importSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { csv, defaultRole: role, defaultPassword: password } = parsed.data;

    // Parse CSV (expecting: name,email,phone,group,university or just name,email)
    const lines = csv.trim().split("\n");
    if (lines.length < 2) {
      return NextResponse.json({ error: "CSV must have a header row and at least one data row" }, { status: 400 });
    }

    // Limit CSV size to prevent resource exhaustion
    const MAX_IMPORT_ROWS = 1000;
    const dataRows = lines.length - 1;
    if (dataRows > MAX_IMPORT_ROWS) {
      return NextResponse.json(
        { error: `CSV must have at most ${MAX_IMPORT_ROWS} data rows (got ${dataRows})` },
        { status: 400 }
      );
    }

    const headers = lines[0].split(",").map((h: string) => h.trim().toLowerCase());
    const results: Array<{ status: "ok" | "error"; email?: string; error?: string }> = [];
    let created = 0;
    let skipped = 0;

    const hashedPassword = await bcrypt.hash(password, 12);

    // Parse all rows into structured data
    const rows: Array<{ email: string; name?: string; phone?: string; group?: string; university?: string }> = [];
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

      // Deduplicate within the batch (keep first occurrence)
      if (rows.some((r) => r.email === email)) {
        results.push({ status: "error", email, error: "Duplicate in CSV" });
        skipped++;
        continue;
      }

      rows.push({
        email,
        name: row.name || undefined,
        phone: row.phone || undefined,
        group: row.group || undefined,
        university: row.university || undefined,
      });
    }

    // Batch check existing users (1 query instead of N)
    const allEmails = rows.map((r) => r.email);
    const existingUsers = allEmails.length > 0
      ? await db.user.findMany({ where: { email: { in: allEmails } }, select: { email: true } })
      : [];
    const existingEmails = new Set(existingUsers.map((u) => u.email));

    const toCreate: typeof rows = [];
    for (const r of rows) {
      if (existingEmails.has(r.email)) {
        results.push({ status: "error", email: r.email, error: "User already exists" });
        skipped++;
      } else {
        toCreate.push(r);
      }
    }

    // Batch create all new users (1 query instead of N)
    if (toCreate.length > 0) {
      try {
        await db.user.createMany({
          data: toCreate.map((r) => ({
            name: r.name || null,
            email: r.email,
            phone: r.phone || null,
            hashedPassword,
            role,
            group: r.group || null,
            university: r.university || null,
            isActive: true,
          })),
        });
        for (const r of toCreate) {
          results.push({ status: "ok", email: r.email });
          created++;
        }
      } catch (err) {
        for (const r of toCreate) {
          results.push({ status: "error", email: r.email, error: err instanceof Error ? err.message : "Unknown error" });
          skipped++;
        }
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
  });
}
