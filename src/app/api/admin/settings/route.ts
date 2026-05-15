import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";

export async function GET() {
  const guard = await requireAdmin();
  if ("response" in guard) return guard.response;

  const settings = await db.systemSetting.findMany({
    orderBy: { key: "asc" },
  });

  return NextResponse.json({
    settings: settings.map((s) => ({
      key: s.key,
      value: JSON.parse(s.value),
      updatedAt: s.updatedAt,
    })),
  });
}

export async function PATCH(req: Request) {
  const guard = await requireAdmin();
  if ("response" in guard) return guard.response;
  const { session } = guard;

  const body = await req.json();
  const { key, value } = body;

  if (!key) {
    return NextResponse.json({ error: "Key is required" }, { status: 400 });
  }

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

  return NextResponse.json({ setting: { key: setting.key, value: JSON.parse(setting.value) } });
}
