import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { sendEmail, generateVerificationEmail } from "@/lib/email";
import { generateSecureToken } from "@/lib/crypto";
import { DEFAULT_APP_URL } from "@/lib/constants";
import { checkRateLimit, rateLimits, createRateLimitResponse, getClientIp } from "@/lib/rate-limit";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { parseRequestBody, withErrorHandler } from "@/lib/api-error-handler";
import { passwordSchema } from "@/lib/shared-schemas";

const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long").optional(),
  email: z.string().email("Invalid email format").max(255, "Email is too long"),
  phone: z.string().max(20, "Phone number is too long").optional().nullable(),
  password: passwordSchema,
  role: z.enum(["STUDENT", "TEACHER"]).optional(),
});

export async function POST(req: Request) {
  return withErrorHandler(req, async () => {
    const ip = getClientIp(req);
    const result = checkRateLimit(`register:${ip}`, rateLimits.register);
    if (result.limited) {
      return createRateLimitResponse(result.resetAt);
    }

    const body = await parseRequestBody(req, registerSchema);
    if (!body.success) return body.errorResponse;

    const { name, email, phone, password, role } = body.data;

    // Default to STUDENT role; allow users to choose STUDENT or TEACHER during registration
    const userRole = role || "STUDENT";

    const emailLower = email.toLowerCase().trim();
    const normalizedPhone = phone && phone.trim() ? phone.trim() : null;

    const orConditions: Array<{ email?: string; phone?: string }> = [{ email: emailLower }];
    if (normalizedPhone) orConditions.push({ phone: normalizedPhone });

    const existingUser = await db.user.findFirst({
      where: {
        OR: orConditions,
      },
    });

    if (existingUser?.email === emailLower) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    if (phone && existingUser?.phone === phone.trim()) {
      return NextResponse.json(
        { error: "A user with this phone number already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    let user;
    try {
      user = await db.user.create({
        data: {
          name: name?.trim() || null,
          email: emailLower,
          phone: normalizedPhone,
          hashedPassword,
          role: userRole,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          createdAt: true,
        },
      });
    } catch (createError) {
      if (
        createError instanceof Error &&
        createError.message.includes("P2002")
      ) {
        return NextResponse.json(
          { error: "A user with this email or phone already exists" },
          { status: 409 }
        );
      }
      throw createError;
    }

    // Send verification email
    const baseUrl = process.env.NEXTAUTH_URL || DEFAULT_APP_URL;
    const verificationToken = generateSecureToken();

    await db.verificationToken.create({
      data: {
        identifier: `email-verify:${user.id}`,
        token: verificationToken,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    const emailData = generateVerificationEmail(verificationToken, baseUrl);
    try {
      await sendEmail({ to: emailLower, ...emailData });
      return NextResponse.json(
        { message: "User created. Check email for verification.", user },
        { status: 201 }
      );
    } catch (emailError) {
      // User is created but verification email failed
      logger.error("Registration email failed", emailError instanceof Error ? emailError : undefined);
      return NextResponse.json(
        { message: "User created. Contact teacher for email verification.", user },
        { status: 201 }
      );
    }
  });
}
