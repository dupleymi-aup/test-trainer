import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body?.email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const { email, password } = body;

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        hashedPassword: true,
        isActive: true,
      },
    });

    if (!user || !user.hashedPassword) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: "User inactive" }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.hashedPassword);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    const sessionToken = randomBytes(32).toString("hex");

    try {
      const sessionExpires = new Date();
      sessionExpires.setDate(sessionExpires.getDate() + 30);

      await db.session.create({
        data: {
          sessionToken,
          userId: user.id,
          expires: sessionExpires,
        },
      });
    } catch (dbError) {
      logger.warn("E2E: DB session creation skipped", { error: dbError instanceof Error ? dbError.message : String(dbError) });
    }

    return NextResponse.json({
      success: true,
      sessionToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error("E2E auth error", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
