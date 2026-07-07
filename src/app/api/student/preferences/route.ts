import { NextResponse } from "next/server";
import { requireStudent } from "@/lib/admin-guard";
import { requireCSRF } from "@/lib/csrf-middleware";
import { db } from "@/lib/db";
import { z } from "zod";
import { checkRateLimit, createRateLimitResponse, rateLimits, getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { withErrorHandler } from "@/lib/api-error-handler";

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
    logger.warn("Failed to parse notification preferences, using defaults");
    return DEFAULT_PREFERENCES;
  }
}

export async function GET() {
  return withErrorHandler(undefined, async () => {
    const guard = await requireStudent();
    if ("response" in guard) return guard.response;
    const { session } = guard;

    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: { notificationPreferences: true },
    });

    const preferences = parsePreferences(user?.notificationPreferences || null);

    const res = NextResponse.json({ preferences });
    res.headers.set("Cache-Control", "private, max-age=0, stale-while-revalidate=60");
    return res;
  });
}

export async function PATCH(req: Request) {
  return withErrorHandler(req, async () => {
    const guard = await requireStudent();
    if ("response" in guard) return guard.response;
    const csrf = await requireCSRF(req);
    if ("response" in csrf) return csrf.response;
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
      return NextResponse.json({ error: "Invalid data", details:(parsed.error) }, { status: 400 });
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
  });
}
