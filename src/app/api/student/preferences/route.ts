import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { z } from "zod";
import { checkRateLimit, createRateLimitResponse, rateLimits, getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { formatZodError } from "@/lib/api-error-handler";

const preferencesSchema = z.object({
  email: z.boolean().optional(),
  sms: z.boolean().optional(),
  inApp: z.boolean().optional(),
});

interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  inApp: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  email: true,
  sms: false,
  inApp: true,
};

function parsePreferences(raw: string | null): NotificationPreferences {
  if (!raw) return DEFAULT_PREFERENCES;
  try {
    const parsed = JSON.parse(raw) as Partial<NotificationPreferences>;
    return {
      email: parsed.email ?? true,
      sms: parsed.sms ?? false,
      inApp: parsed.inApp ?? true,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export async function GET() {
  try {
    const guard = await requireAuth();
    if ("response" in guard) return guard.response;
    const { session } = guard;

    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: { notificationPreferences: true },
    });

    const preferences = parsePreferences(user?.notificationPreferences || null);

    return NextResponse.json({ preferences });
  } catch (error) {
    logger.error("Failed to fetch preferences", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to fetch preferences" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const guard = await requireAuth();
    if ("response" in guard) return guard.response;
    const { session } = guard;

    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`studentPreferences:${ip}`, rateLimits.studentPreferences);
    if (rateLimit.limited) {
      return createRateLimitResponse(rateLimit.resetAt);
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = preferencesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: formatZodError(parsed.error) }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: { notificationPreferences: true },
    });

    const current = parsePreferences(user?.notificationPreferences || null);
    const updated = {
      email: parsed.data.email ?? current.email,
      sms: parsed.data.sms ?? current.sms,
      inApp: parsed.data.inApp ?? current.inApp,
    };

    await db.user.update({
      where: { id: session.userId },
      data: { notificationPreferences: JSON.stringify(updated) },
    });

    return NextResponse.json({ preferences: updated });
  } catch (error) {
    logger.error("Failed to update preferences", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
  }
}
