import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        phone: true,
        role: true,
        avatar: true,
        bio: true,
        university: true,
        group: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Get profile error:", error);
    return NextResponse.json({ error: "Ошибка при получении профиля" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const body = await req.json();
    const { name, phone, bio, university, group, avatar } = body;

    const updateData: Record<string, string | null> = {};
    if (name !== undefined) updateData.name = name?.trim() || null;
    if (phone !== undefined) updateData.phone = phone?.trim() || null;
    if (bio !== undefined) updateData.bio = bio?.trim() || null;
    if (university !== undefined) updateData.university = university?.trim() || null;
    if (group !== undefined) updateData.group = group?.trim() || null;
    if (avatar !== undefined) updateData.avatar = avatar?.trim() || null;

    // Check phone uniqueness
    if (phone) {
      const existingPhone = await db.user.findFirst({
        where: { phone: phone.trim(), id: { not: session.user.id } },
      });
      if (existingPhone) {
        return NextResponse.json(
          { error: "Этот номер телефона уже используется другим пользователем" },
          { status: 409 }
        );
      }
    }

    const user = await db.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatar: true,
        bio: true,
        university: true,
        group: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json({ error: "Ошибка при обновлении профиля" }, { status: 500 });
  }
}
