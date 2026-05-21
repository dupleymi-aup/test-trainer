import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { checkRateLimit, createRateLimitResponse, rateLimits, getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

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
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await db.user.findUnique({
      where: { id: session.user.id },
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
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`studentPreferences:${ip}`, rateLimits.studentPreferences);
    if (rateLimit.limited) {
      return createRateLimitResponse(rateLimit.resetAt);
    }

    const body = await req.json();
    const parsed = preferencesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.errors }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { notificationPreferences: true },
    });

    const current = parsePreferences(user?.notificationPreferences || null);
    const updated = {
      email: parsed.data.email ?? current.email,
      sms: parsed.data.sms ?? current.sms,
      inApp: parsed.data.inApp ?? current.inApp,
    };

    await db.user.update({
      where: { id: session.user.id },
      data: { notificationPreferences: JSON.stringify(updated) },
    });

    return NextResponse.json({ preferences: updated });
  } catch (error) {
    logger.error("Failed to update preferences", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
  }
}
