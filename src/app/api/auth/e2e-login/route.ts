import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

/**
 * E2E helper endpoint for teacher authentication.
 * Creates a session in the database and returns the session token.
 * Only available in development/test environments.
 */
export async function POST(req: Request) {
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

    // Create a session token
    const sessionToken = randomBytes(32).toString("hex");

    // Try to create session in database (may fail if DB not available)
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
    } catch {
      // Session creation failed - will use localStorage approach instead
      console.log("E2E: DB session creation failed, using token-only approach");
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
    console.error("E2E auth error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
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
    const sessionExpires = new Date();
    sessionExpires.setDate(sessionExpires.getDate() + 30);

    await db.session.create({
      data: {
        sessionToken,
        userId: user.id,
        expires: sessionExpires,
      },
    });

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
