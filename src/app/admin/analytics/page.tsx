"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Activity,
  TrendingUp,
  UserPlus,
  ArrowRight,
  Target,
  GraduationCap,
  BookOpen,
  AlertTriangle,
  BarChart3,
  Clock,
  Download,
  GitCompare,
  Table2,
  Trophy,
  Zap,
  Route,
  FolderKanban,
  UsersRound,
  Grid3X3,
  Crosshair,
  Calendar,
  Lightbulb,
  Layers,
  Award,
  Siren,
  CalendarClock,
} from "lucide-react";

interface AnalyticsData {
  platformEngagement: { dau: number; wau: number; mau: number; newUsersWeek: number; newUsersMonth: number };
  attemptVolume: Array<{ date: string; count: number; avgScore: number }>;
  performanceDistribution: Record<string, number>;
  groupPerformance: Array<{ groupId: string; groupName: string; avgScore: number; studentCount: number; totalAttempts: number }>;
  teacherActivity: Array<{ teacherId: string; name: string; groupsManaged: number; totalStudents: number }>;
  taskDifficulty: Array<{ taskId: string; taskName: string; avgScore: number; attemptsCount: number; difficulty: string }>;
  retentionMetrics: { totalStudents: number; withAttempts: number; withoutAttempts: number; avgPerStudent: number; inactive30Days: number };
}

const reportCards = [
  { href: "/admin/analytics/comprehensive", title: "Комплексная аналитика", description: "KPI, тренды, когорты, университеты, рейтинг преподавателей", icon: Target, color: "text-blue-600" },
  { href: "/admin/analytics/teacher-performance", title: "Преподаватели", description: "Детальная аналитика активности и эффективности преподавателей", icon: GraduationCap, color: "text-amber-600" },
  { href: "/admin/analytics/teacher-comparison", title: "Сравнение преподавателей", description: "Рейтинг, композитный score эффективности, динамика студентов", icon: Award, color: "text-amber-500" },
  { href: "/admin/analytics/university-comparison", title: "Университеты", description: "Сравнение успеваемости между университетами", icon: BookOpen, color: "text-purple-600" },
  { href: "/admin/analytics/task-insights", title: "Анализ задач", description: "Сложность, типичные ошибки, покрытие EC/BV", icon: BarChart3, color: "text-emerald-600" },
  { href: "/admin/analytics/predictions", title: "Прогнозы и рекомендации", description: "Студенты с рисками, автоматические рекомендации", icon: AlertTriangle, color: "text-rose-600" },
  { href: "/admin/analytics/time-trends", title: "Временные тренды", description: "Помесячные тренды, сезонность, когортный анализ", icon: Clock, color: "text-indigo-600" },
  { href: "/admin/analytics/time-activity", title: "Активность по времени", description: "Heatmap по часам/дням, пики активности, периоды суток", icon: Clock, color: "text-sky-600" },
  { href: "/admin/analytics/compare-periods", title: "Сравнение периодов", description: "Сравнение метрик за два произвольных периода", icon: GitCompare, color: "text-cyan-600" },
  { href: "/admin/analytics/completion-matrix", title: "Матрица выполнения", description: "Pivot-таблица студенты × задания с баллами", icon: Table2, color: "text-orange-600" },
  { href: "/admin/analytics/group-performance", title: "Успеваемость групп", description: "Сравнение групп с drill-down до студентов", icon: FolderKanban, color: "text-teal-600" },
  { href: "/admin/analytics/ec-bv-gaps", title: "Анализ покрытия EC/BV", description: "Пропускаемые классы эквивалентности и граничные значения", icon: AlertTriangle, color: "text-red-600" },
  { href: "/admin/analytics/ec-bv-heatmap", title: "Тепловая карта EC/BV", description: "Визуальная карта пропусков конкретных EC и BV по заданиям", icon: Crosshair, color: "text-violet-600" },
  { href: "/admin/analytics/improvement-leaderboard", title: "Лидеры улучшений", description: "Студенты и группы с наибольшим прогрессом", icon: Trophy, color: "text-amber-500" },
  { href: "/admin/analytics/velocity", title: "Скорость обучения", description: "Попытки в неделю, еженедельные тренды активности", icon: Zap, color: "text-yellow-600" },
  { href: "/admin/analytics/learning-path", title: "Путь обучения", description: "Типичные последовательности задач и точки схода", icon: Route, color: "text-violet-600" },
  { href: "/admin/analytics/at-risk", title: "Студенты группы риска", description: "Фильтрация, пагинация, уровень риска и тренд каждого студента", icon: UsersRound, color: "text-red-500" },
  { href: "/admin/analytics/topic-heatmap", title: "Тепловая карта тем", description: "Матрица тема × группа, проблемные темы, усвоение заданий", icon: Grid3X3, color: "text-pink-600" },
  { href: "/admin/analytics/cohort-retention", title: "Когортный анализ", description: "Кривые удержания, еженедельные тренды, анализ по группам", icon: Calendar, color: "text-blue-500" },
  { href: "/admin/analytics/recommendations", title: "Рекомендации", description: "Персональные рекомендации заданий на основе пробелов в знаниях", icon: Lightbulb, color: "text-amber-500" },
  { href: "/admin/analytics/skill-mastery", title: "Освоение навыков", description: "Детализация EC/BV с прогрессией и трендами по времени", icon: Layers, color: "text-teal-600" },
  { href: "/admin/alerts", title: "Системные алерты", description: "Авто-обнаружение рисков: студенты, группы, задания", icon: Siren, color: "text-red-600" },
  { href: "/admin/deadlines", title: "Дедлайны и напоминания", description: "Управление сроками экзаменов, зачётов, заданий", icon: CalendarClock, color: "text-orange-600" },
  { href: "/admin/reports/export", title: "Экспорт отчётов", description: "Централизованный экспорт всех отчётов в CSV/JSON", icon: Download, color: "text-cyan-600" },
];

export default function AdminAnalyticsHubPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <AdminLayout><div className="p-8 text-center">Загрузка...</div></AdminLayout>;
  if (!data) return <AdminLayout><div className="p-8 text-center">Ошибка загрузки данных</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-8">
        <h2 className="text-xl font-bold">Аналитика платформы</h2>

        {/* Report Cards */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Аналитические отчёты</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reportCards.map((card) => (
              <Link key={card.href} href={card.href}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-1">
                      <card.icon className={`h-5 w-5 ${card.color}`} />
                      <CardTitle className="text-base">{card.title}</CardTitle>
                    </div>
                    <CardDescription className="text-xs">{card.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-end text-sm text-muted-foreground">
                      Открыть <ArrowRight className="h-3 w-3 ml-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Быстрая сводка</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2"><Activity className="h-4 w-4 text-blue-600" /><span className="text-xs text-muted-foreground">ДАУ</span></div>
                <p className="text-2xl font-bold">{data.platformEngagement.dau}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2"><Activity className="h-4 w-4 text-emerald-600" /><span className="text-xs text-muted-foreground">WAU</span></div>
                <p className="text-2xl font-bold">{data.platformEngagement.wau}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2"><Activity className="h-4 w-4 text-purple-600" /><span className="text-xs text-muted-foreground">MAU</span></div>
                <p className="text-2xl font-bold">{data.platformEngagement.mau}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2"><UserPlus className="h-4 w-4 text-amber-600" /><span className="text-xs text-muted-foreground">Новые (неделя)</span></div>
                <p className="text-2xl font-bold">{data.platformEngagement.newUsersWeek}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2"><Users className="h-4 w-4 text-indigo-600" /><span className="text-xs text-muted-foreground">Новые (месяц)</span></div>
                <p className="text-2xl font-bold">{data.platformEngagement.newUsersMonth}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Attempt Volume Chart */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Объём попыток (30 дней)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={data.attemptVolume}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis allowDecimals={false} className="text-xs" />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} name="Попытки" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Performance Distribution + Group Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-sm">Распределение баллов</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={Object.entries(data.performanceDistribution).map(([range, count]) => ({ range, count }))}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="range" className="text-xs" />
                  <YAxis allowDecimals={false} className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Сравнение групп</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Группа</TableHead><TableHead className="text-right">Студенты</TableHead><TableHead className="text-right">Ср. балл</TableHead><TableHead className="text-right">Попытки</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {data.groupPerformance.map((g) => (
                    <TableRow key={g.groupId}>
                      <TableCell className="font-medium">{g.groupName}</TableCell>
                      <TableCell className="text-right">{g.studentCount}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={g.avgScore >= 75 ? "default" : g.avgScore >= 50 ? "secondary" : "destructive"}>{g.avgScore}%</Badge>
                      </TableCell>
                      <TableCell className="text-right">{g.totalAttempts}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Teacher Activity + Retention */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-sm">Активность преподавателей</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Преподаватель</TableHead><TableHead className="text-right">Группы</TableHead><TableHead className="text-right">Студенты</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {data.teacherActivity.map((t) => (
                    <TableRow key={t.teacherId}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell className="text-right">{t.groupsManaged}</TableCell>
                      <TableCell className="text-right">{t.totalStudents}</TableCell>
                    </TableRow>
                  ))}
                  {data.teacherActivity.length === 0 && (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Нет преподавателей</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Удержание студентов</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1"><span>С попытками</span><span className="font-bold">{data.retentionMetrics.withAttempts}/{data.retentionMetrics.totalStudents}</span></div>
                <Progress value={data.retentionMetrics.totalStudents > 0 ? (data.retentionMetrics.withAttempts / data.retentionMetrics.totalStudents) * 100 : 0} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1"><span>Без попыток</span><span className="font-bold">{data.retentionMetrics.withoutAttempts}</span></div>
                <Progress value={data.retentionMetrics.totalStudents > 0 ? (data.retentionMetrics.withoutAttempts / data.retentionMetrics.totalStudents) * 100 : 0} className="h-2" />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">Ср. попыток/студ</p>
                  <p className="text-xl font-bold">{data.retentionMetrics.avgPerStudent}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Неактив. 30 дней</p>
                  <p className="text-xl font-bold text-rose-600">{data.retentionMetrics.inactive30Days}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
