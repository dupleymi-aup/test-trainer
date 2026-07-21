"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Beaker,
  ChevronRight,
  ArrowLeft,
  Loader2,
  Clock,
  FileText,
  Trophy,
} from "lucide-react";
import { formatDuration } from "@/lib/format-time";
import { useTranslations } from "next-intl";
import { useSWRApi } from "@/hooks/use-swr-api";

interface TaskHistoryItem {
  taskId: string;
  taskName: string;
  difficulty: string;
  topics: string[];
  bestScore: number;
  avgScore: number;
  attemptsCount: number;
  lastAttempt: string;
  lastScore: number;
}

interface TaskHistoryData {
  taskHistory: TaskHistoryItem[];
}

interface TaskDetail {
  task: { id: number; name: string; difficulty: string; topics: string[] } | null;
  attempts: Array<{
    id: string;
    taskId: string;
    score: number;
    ecCoverage: number;
    bvCoverage: number;
    correctness: number;
    timeSpent: number;
    createdAt: string;
  }>;
}

const difficultyColor: Record<string, string> = {
  Легко: "text-green-600 dark:text-green-400",
  Средне: "text-amber-600 dark:text-amber-400",
  Сложно: "text-rose-600 dark:text-rose-400",
};

const difficultyBg: Record<string, string> = {
  Легко: "bg-green-100 dark:bg-green-900/30",
  Средне: "bg-amber-100 dark:bg-amber-900/30",
  Сложно: "bg-rose-100 dark:bg-rose-900/30",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function StudentHistoryPage() {
  const t = useTranslations();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Fetch task history list (cached)
  const { data: historyData, isLoading: historyLoading } = useSWRApi<TaskHistoryData>(
    status === "authenticated" && !selectedTaskId ? "/api/student/history" : null
  );

  // Fetch task detail when selected (cached)
  const { data: detailData, isLoading: detailLoading } = useSWRApi<TaskDetail>(
    selectedTaskId ? `/api/student/history?taskId=${selectedTaskId}` : null
  );

  if (status === "unauthenticated") {
    router.push("/login?callbackUrl=/student/history");
    return null;
  }

  if (status === "authenticated" && session?.user?.role !== "STUDENT") {
    if (session.user.role === "ADMIN") router.push("/admin/analytics");
    else if (session.user.role === "TEACHER") router.push("/teacher");
    return null;
  }

  if (status === "loading" || historyLoading || (selectedTaskId && detailLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Загрузка истории...</p>
        </div>
      </div>
    );
  }

  const taskHistory = historyData?.taskHistory || [];
  const selectedTask = detailData || null;

  // Task detail view
  if (selectedTask) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <header className="border-b bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 py-4 sm:py-5">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setSelectedTaskId(null)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{selectedTask.task?.name || "Задание"}</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {selectedTask.task?.difficulty} • {selectedTask.attempts.length} попыток
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4 text-center">
                <div className="text-xs text-muted-foreground">Best score</div>
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {Math.max(...selectedTask.attempts.map((a) => a.score))}%
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <div className="text-xs text-muted-foreground">Среднее ЭК</div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {Math.round(selectedTask.attempts.reduce((s, a) => s + a.ecCoverage, 0) / selectedTask.attempts.length)}%
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <div className="text-xs text-muted-foreground">Среднее ГЗ</div>
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round(selectedTask.attempts.reduce((s, a) => s + a.bvCoverage, 0) / selectedTask.attempts.length)}%
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Attempts */}
          <Card>
            <CardHeader>
              <CardTitle>Все попытки</CardTitle>
              <CardDescription>Хронология ваших попыток выполнения задания</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {selectedTask.attempts.map((attempt, i) => (
                  <div
                    key={attempt.id}
                    className="p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Попытка #{i + 1}</span>
                        <Badge variant={attempt.score >= 80 ? "default" : attempt.score >= 50 ? "secondary" : "destructive"}>
                          {attempt.score}%
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDuration(attempt.timeSpent)}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">ЭК:</span>{" "}
                        <span className="font-medium text-blue-600 dark:text-blue-400">{attempt.ecCoverage}%</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">ГЗ:</span>{" "}
                        <span className="font-medium text-purple-600">{attempt.bvCoverage}%</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Верность:</span>{" "}
                        <span className="font-medium">{attempt.correctness}%</span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      {formatDate(attempt.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="text-center">
            <Button asChild variant="outline">
              <Link href="/trainer">
                <Beaker className="mr-2 h-4 w-4" /> Попробовать снова
              </Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // Task list view
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <header className="border-b bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 sm:py-5">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/student" aria-label={t("common.back")}><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">История заданий</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Все ваши попытки и результаты
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {taskHistory.length === 0 ? (
          <Card>
            <CardContent className="pt-8 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">Нет истории</h2>
              <p className="text-muted-foreground mb-4">
                Вы ещё не выполняли заданий. Начните в тренажёре!
              </p>
              <Button asChild>
                <Link href="/trainer">
                  <Beaker className="mr-2 h-4 w-4" /> Открыть тренажёр
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {taskHistory.map((task) => (
              <div
                key={task.taskId}
                className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => setSelectedTaskId(task.taskId)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && setSelectedTaskId(task.taskId)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">{task.taskName}</span>
                      <Badge className={`text-xs ${difficultyBg[task.difficulty]} ${difficultyColor[task.difficulty]}`}>
                        {task.difficulty}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {task.attemptsCount} попыток • Последняя: {formatDate(task.lastAttempt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4 shrink-0">
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <Trophy className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                        <span className="text-lg font-bold">{task.bestScore}%</span>
                      </div>
                      <div className="text-xs text-muted-foreground">лучший</div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
