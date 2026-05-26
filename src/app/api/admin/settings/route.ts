import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { checkRateLimit, rateLimits, createRateLimitResponse } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { formatZodError } from "@/lib/api-error-handler";

const validSettingKeys = [
  "maxLoginAttempts",
  "sessionDuration",
  "allowRegistration",
  "passwordMinLength",
  "dataRetentionDays",
  "emailNotifications",
  "smsNotifications",
  "rateLimitWindow",
];

const updateSettingSchema = z.object({
  key: z.enum(validSettingKeys as [string, ...string[]]),
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
});

export async function GET() {
  try {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;

    // Seed default settings if none exist (idempotent with skipDuplicates)
    const defaults = [
      { key: "maxLoginAttempts", value: "5" },
      { key: "sessionDuration", value: "86400" },
      { key: "allowRegistration", value: "true" },
      { key: "passwordMinLength", value: "8" },
      { key: "dataRetentionDays", value: "365" },
      { key: "emailNotifications", value: "true" },
      { key: "smsNotifications", value: "false" },
      { key: "rateLimitWindow", value: "900" },
    ];
    await db.systemSetting.createMany({
      data: defaults.map((d) => ({ key: d.key, value: d.value })),
      skipDuplicates: true,
    });

    const settings = await db.systemSetting.findMany({
      orderBy: { key: "asc" },
    });

    return NextResponse.json({
      settings: settings.map((s) => {
        let parsedValue;
        try {
          parsedValue = JSON.parse(s.value);
        } catch {
          parsedValue = s.value;
        }
        return {
          key: s.key,
          value: parsedValue,
          updatedAt: s.updatedAt,
        };
      }),
    });
  } catch (error) {
    logger.error("Failed to fetch settings", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const guard = await requireAdmin();
    if ("response" in guard) return guard.response;
    const { session } = guard;

    // Rate limit settings updates
    const rateResult = checkRateLimit(`admin-settings:${session.userId}`, rateLimits.adminSettings);
    if (rateResult.limited) {
      return createRateLimitResponse(rateResult.resetAt);
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = updateSettingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: formatZodError(parsed.error) },
        { status: 400 }
      );
    }

    const { key, value } = parsed.data;

    const setting = await db.systemSetting.upsert({
      where: { key },
      update: {
        value: JSON.stringify(value),
        updatedByUserId: session.userId,
      },
      create: {
        key,
        value: JSON.stringify(value),
        updatedByUserId: session.userId,
      },
    });

    await db.activityLog.create({
      data: {
        userId: session.userId,
        action: "SETTING_UPDATE",
        entity: "SystemSetting",
        entityId: setting.id,
        details: JSON.stringify({ key, value }),
      },
    });

    let parsedValue;
    try {
      parsedValue = JSON.parse(setting.value);
    } catch {
      parsedValue = setting.value;
    }
    return NextResponse.json({ setting: { key: setting.key, value: parsedValue } });
  } catch (error) {
    logger.error("Failed to update settings", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
