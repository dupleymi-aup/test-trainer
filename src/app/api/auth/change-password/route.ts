import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireAuth } from "@/lib/admin-guard";
import { requireCSRF } from "@/lib/csrf-middleware";
import { checkRateLimit, rateLimits, createRateLimitResponse } from "@/lib/rate-limit";
import { formatZodError, withErrorHandler } from "@/lib/api-error-handler";
import { passwordSchema } from "@/lib/shared-schemas";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
});

export async function POST(req: Request) {
  return withErrorHandler(req, async () => {
    const auth = await requireAuth();
    if ("response" in auth) return auth.response;

    const csrf = await requireCSRF(req);
    if ("response" in csrf) return csrf.response;

    const result = checkRateLimit(`change-pw:${auth.session.userId}`, rateLimits.changePassword);
    if (result.limited) {
      return createRateLimitResponse(result.resetAt);
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = changePasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: formatZodError(parsed.error) },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = parsed.data;

    const user = await db.user.findUnique({
      where: { id: auth.session.userId },
    });

    if (!user || !user.hashedPassword) {
      return NextResponse.json(
        { error: "Cannot change password" },
        { status: 400 }
      );
    }

    const isValid = await bcrypt.compare(currentPassword, user.hashedPassword);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid current password" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await db.user.update({
      where: { id: auth.session.userId },
      data: { hashedPassword, lastSessionInvalidation: new Date() },
    });

    return NextResponse.json({ message: "Password changed successfully" }, { status: 200 });
  });
}
