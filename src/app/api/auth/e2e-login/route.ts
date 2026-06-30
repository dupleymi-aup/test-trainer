import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { withErrorHandler } from "@/lib/api-error-handler";

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  return withErrorHandler(req, async () => {
    const body = await req.json().catch(() => null);
    if (!body?.email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const { email, password } = body;

    const isTeacher = email === "teacher@testtrainer.local" && password === "teacher123";
    const isStudent = email === "student@testtrainer.local" && password === "student123";

    if (!isTeacher && !isStudent) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const sessionToken = randomBytes(32).toString("hex");

    return NextResponse.json({
      success: true,
      sessionToken,
      user: {
        id: isTeacher ? "teacher-id" : "student-id",
        name: isTeacher ? "Teacher" : "Student",
        email,
        role: isTeacher ? "TEACHER" : "STUDENT",
      },
    });
  });
}
