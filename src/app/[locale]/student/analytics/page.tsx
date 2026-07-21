"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Beaker,
  TrendingUp,
  TrendingDown,
  Award,
  AlertTriangle,
  ChevronRight,
  ArrowLeft,
  Loader2,
  Target,
  BarChart3,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { useTranslations } from "next-intl";
import { useSWRApi } from "@/hooks/use-swr-api";


interface AnalyticsData {
  attempts: number;
  scoresOverTime: Array<{ date: string; score: number; ecCoverage: number; bvCoverage: number }>;
  topicMastery: Array<{ topic: string; avgScore: number; attempts: number }>;
  taskBreakdown: Array<{
    taskId: string;
    taskName: string;
    difficulty: string;
    bestScore: number;
    avgScore: number;
    avgEc: number;
    avgBv: number;
    attemptsCount: number;
  }>;
  weakAreas: Array<{ topic: string; avgScore: number }>;
  strongAreas: Array<{ topic: string; avgScore: number }>;
  skillGaps: Array<{ topic: string; avgScore: number }>;
  difficultyBreakdown: Array<{ difficulty: string; completed: number; total: number; percent: number }>;
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

const chartColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function StudentAnalyticsPage() {
  const t = useTranslations();
  const { data: session, status } = useSession();
  const router = useRouter();

  const { data, isLoading } = useSWRApi<AnalyticsData>(
    status === "authenticated" ? "/api/student/analytics" : null
  );

  if (status === "unauthenticated") {
    router.push("/login?callbackUrl=/student/analytics");
    return null;
  }

  if (status === "authenticated" && session?.user?.role !== "STUDENT") {
    if (session.user.role === "ADMIN") router.push("/admin/analytics");
    else if (session.user.role === "TEACHER") router.push("/teacher/analytics");
    return null;
  }

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Загрузка аналитики...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-8 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">No data</h2>
            <p className="text-muted-foreground mb-4">
              Начните выполнять задания в тренажёре, чтобы увидеть аналитику
            </p>
            <Button asChild>
              <Link href="/trainer">
                <Beaker className="mr-2 h-4 w-4" /> Открыть тренажёр
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const chartData = data.scoresOverTime.map((entry, i) => ({
    attempt: `#${i + 1}`,
    score: entry.score,
    ec: entry.ecCoverage,
    bv: entry.bvCoverage,
  }));

  const topicChartData = data.topicMastery.slice(0, 10).map((t, i) => ({
    topic: t.topic.length > 20 ? t.topic.slice(0, 20) + "…" : t.topic,
    score: t.avgScore,
    fill: chartColors[i % chartColors.length],
  }));

  const avgScore = data.taskBreakdown.length > 0
    ? Math.round(data.taskBreakdown.reduce((sum, t) => sum + t.avgScore, 0) / data.taskBreakdown.length)
    : 0;

  const avgEc = data.taskBreakdown.length > 0
    ? Math.round(data.taskBreakdown.reduce((sum, t) => sum + t.avgEc, 0) / data.taskBreakdown.length)
    : 0;

  const avgBv = data.taskBreakdown.length > 0
    ? Math.round(data.taskBreakdown.reduce((sum, t) => sum + t.avgBv, 0) / data.taskBreakdown.length)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 sm:py-5">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/student" aria-label={t("common.back")}><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Аналитика</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Детальный анализ вашего прогресса
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Target className="h-3 w-3" /> Попыток
              </div>
              <div className="text-2xl font-bold">{data.attempts}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-600" /> Средний балл
              </div>
              <div className="text-2xl font-bold text-emerald-600">{avgScore}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <BarChart3 className="h-3 w-3 text-blue-600 dark:text-blue-400" /> Среднее ЭК
              </div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{avgEc}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <BarChart3 className="h-3 w-3 text-purple-600" /> Среднее ГЗ
              </div>
              <div className="text-2xl font-bold text-purple-600">{avgBv}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Score Trends Chart */}
        {chartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Динамика результатов</CardTitle>
              <CardDescription>Баллы, покрытие классов эквивалентности и граничных значений по попыткам</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="attempt" className="text-xs" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} className="text-xs" tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="score" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 3 }} name="Score" />
                    <Line type="monotone" dataKey="ec" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 3 }} name="EC" />
                    <Line type="monotone" dataKey="bv" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={{ r: 3 }} name="BV" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Topic Mastery Bar Chart */}
        {topicChartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Мастерство по темам</CardTitle>
              <CardDescription>Средний балл по каждой теме (топ-10)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topicChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="topic" className="text-xs" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
                    <YAxis domain={[0, 100]} className="text-xs" tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="score" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name="Average Score" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Strong and Weak Areas */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Strong Areas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="h-5 w-5 text-emerald-600" />
                Сильные стороны
              </CardTitle>
              <CardDescription>Темы, в которых вы показываете лучшие результаты</CardDescription>
            </CardHeader>
            <CardContent>
              {data.strongAreas.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Пока недостаточно данных. Выполните больше заданий.
                </p>
              ) : (
                <div className="space-y-3">
                  {data.strongAreas.map((area) => (
                    <div key={area.topic} className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">{area.topic}</span>
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                        {area.avgScore}%
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Weak Areas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                Зоны роста
              </CardTitle>
              <CardDescription>Темы, которым стоит уделить больше внимания</CardDescription>
            </CardHeader>
            <CardContent>
              {data.weakAreas.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Отлично! Нет слабых сторон
                </p>
              ) : (
                <div className="space-y-3">
                  {data.weakAreas.map((area) => (
                    <div key={area.topic} className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">{area.topic}</span>
                      <Badge variant="destructive">{area.avgScore}%</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Skill Gaps */}
        {data.skillGaps.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-rose-600" />
                Пробелы в навыках
              </CardTitle>
              <CardDescription>Темы с наименьшим средним баллом — рекомендуется повторить теорию</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.skillGaps.map((gap) => {
                  const color = gap.avgScore < 30 ? "bg-rose-600" : gap.avgScore < 50 ? "bg-amber-600" : "bg-blue-600";
                  return (
                    <div key={gap.topic}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{gap.topic}</span>
                        <span className="text-sm text-muted-foreground">{gap.avgScore}%</span>
                      </div>
                      <Progress value={gap.avgScore} className="h-2">
                        <div className={`h-full rounded-full ${color}`} style={{ width: `${gap.avgScore}%` }} />
                      </Progress>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Difficulty Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Прогресс по сложности</CardTitle>
            <CardDescription>Сколько заданий каждой сложности вы выполнили</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.difficultyBreakdown.map((d) => (
                <div key={d.difficulty}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-medium ${difficultyColor[d.difficulty]}`}>{d.difficulty}</span>
                    <span className="text-sm text-muted-foreground">
                      {d.completed} / {d.total} ({d.percent}%)
                    </span>
                  </div>
                  <Progress value={d.percent} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Tasks by Performance */}
        {data.taskBreakdown.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Результаты по заданиям</CardTitle>
              <CardDescription>Ваши лучшие результаты в каждом задании</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.taskBreakdown.slice(0, 15).map((task) => (
                  <div
                    key={task.taskId}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{task.taskName}</span>
                        <Badge className={`text-xs ${difficultyBg[task.difficulty]} ${difficultyColor[task.difficulty]}`}>
                          {task.difficulty}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Попыток: {task.attemptsCount} • Среднее ЭК: {task.avgEc}% • Среднее ГЗ: {task.avgBv}%
                      </div>
                    </div>
                    <div className="text-right ml-4 shrink-0">
                      <div className="text-lg font-bold">{task.bestScore}%</div>
                      <div className="text-xs text-muted-foreground">лучший</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Back to dashboard */}
        <div className="text-center">
          <Button variant="outline" asChild>
            <Link href="/student">
              <ChevronRight className="mr-2 h-4 w-4 rotate-180" /> Назад к дашборду
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
