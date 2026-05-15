import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const createAttemptSchema = z.object({
  taskId: z.string().min(1),
  testCases: z.array(z.object({
    id: z.string(),
    inputs: z.array(z.any()),
    expectedOutput: z.string(),
    category: z.string(),
    comment: z.string().optional(),
  })),
  score: z.number().int().min(0).max(100),
  ecCoverage: z.number().int().min(0).max(100),
  bvCoverage: z.number().int().min(0).max(100),
  correctness: z.number().int().min(0).max(100),
  coveredEcIds: z.array(z.string()),
  coveredBvDescriptions: z.array(z.string()),
  timeSpent: z.number().int().min(0),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createAttemptSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data", details: parsed.error.errors }, { status: 400 });
    }

    const { taskId, testCases, score, ecCoverage, bvCoverage, correctness, coveredEcIds, coveredBvDescriptions, timeSpent } = parsed.data;

    // Check group-based task permissions
    const userGroups = await db.userGroup.findMany({
      where: { userId: session.user.id },
      select: { groupId: true },
    });

    if (userGroups.length > 0) {
      const groupIds = userGroups.map((g) => g.groupId);
      const groupTasks = await db.groupTask.findMany({
        where: { groupId: { in: groupIds } },
        select: { taskId: true },
      });

      // If any group has task restrictions, enforce whitelist
      if (groupTasks.length > 0) {
        const allowedTaskIds = new Set(groupTasks.map((gt) => String(gt.taskId)));
        if (!allowedTaskIds.has(taskId)) {
          return NextResponse.json({ error: "Задание недоступно для вашей группы" }, { status: 403 });
        }
      }
    }

    const attempt = await db.attempt.create({
      data: {
        userId: session.user.id,
        taskId,
        testCases: JSON.stringify(testCases),
        score,
        ecCoverage,
        bvCoverage,
        correctness,
        coveredEcIds: JSON.stringify(coveredEcIds),
        coveredBvDescriptions: JSON.stringify(coveredBvDescriptions),
        timeSpent,
      },
    });

    return NextResponse.json({ success: true, attemptId: attempt.id }, { status: 201 });
  } catch (error) {
    console.error("Failed to save attempt:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");
    const limit = parseInt(searchParams.get("limit") || "50");

    const attempts = await db.attempt.findMany({
      where: {
        userId: session.user.id,
        ...(taskId ? { taskId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        taskId: true,
        score: true,
        ecCoverage: true,
        bvCoverage: true,
        correctness: true,
        timeSpent: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ attempts });
  } catch (error) {
    console.error("Failed to fetch attempts:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
