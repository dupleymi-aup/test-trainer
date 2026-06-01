import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const count = await db.user.count();
    return NextResponse.json({ userCount: count });
  } catch {
    return NextResponse.json({ error: "Failed to fetch user count" }, { status: 500 });
  }
}
