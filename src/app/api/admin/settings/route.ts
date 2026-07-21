import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { requireCSRF } from "@/lib/csrf-middleware";
import { db } from "@/lib/db";
import { checkRateLimit, rateLimits, createRateLimitResponse } from "@/lib/rate-limit";
import { z } from "zod";
import { parseRequestBody, withErrorHandler, unwrapGuard } from "@/lib/api-error-handler";

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

export async function GET(request: Request) {
  return withErrorHandler(request, async () => {
    unwrapGuard(await requireAdmin());

    // Seed default settings only if none exist yet
    const existingCount = await db.systemSetting.count();
    if (existingCount === 0) {
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
      try {
        await db.systemSetting.createMany({
          data: defaults.map((d) => ({ key: d.key, value: d.value })),
        });
      } catch {
        // Another request already seeded — safe to ignore
      }
    }

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
  });
}

export async function PATCH(req: Request) {
  return withErrorHandler(req, async () => {
    const session = unwrapGuard(await requireAdmin());
    unwrapGuard(await requireCSRF(req));
    // Rate limit settings updates
    const rateResult = checkRateLimit(`admin-settings:${session.userId}`, rateLimits.adminSettings);
    if (rateResult.limited) {
      return createRateLimitResponse(rateResult.resetAt);
    }

    const bodyResult = await parseRequestBody(req, updateSettingSchema);
    if (!bodyResult.success) return bodyResult.errorResponse;

    const { key, value } = bodyResult.data;

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
  });
}
