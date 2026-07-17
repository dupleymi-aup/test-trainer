"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { PrintButton } from "@/components/admin/analytics/print-button";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Calendar,
  Target,
} from "lucide-react";

interface Forecast {
  id: string;
  name: string;
  group: string;
  university: string;
  completedTasks: number;
  totalTasks: number;
  completionPct: number;
  velocity: number;
  weeksToComplete: number | null;
  onTrack: boolean;
  riskLevel: "low" | "medium" | "high" | "critical";
  registeredDaysAgo: number;
  lastActivityDaysAgo: number | null;
  trend: "improving" | "stable" | "declining" | "none";
}

interface ForecastData {
  forecasts: Forecast[];
  summary: {
    totalStudents: number;
    onTrack: number;
    atRisk: number;
    avgCompletion: number;
    avgVelocity: number;
    completionDistribution: Record<string, number>;
  };
}

const riskConfig: Record<string, { label: string; color: string; variant: "destructive" | "secondary" | "default" }> = {
  critical: { label: "Критический", color: "text-rose-600", variant: "destructive" },
  high: { label: "Высокий", color: "text-orange-600", variant: "destructive" },
  medium: { label: "Средний", color: "text-amber-600 dark:text-amber-400", variant: "secondary" },
  low: { label: "Низкий", color: "text-emerald-600", variant: "default" },
};

const trendIcons: Record<string, typeof TrendingUp> = {
  improving: TrendingUp,
  stable: Minus,
  declining: TrendingDown,
  none: Clock,
};

const trendColors: Record<string, string> = {
  improving: "text-emerald-600",
  stable: "text-muted-foreground",
  declining: "text-rose-600",
  none: "text-muted-foreground",
};

export default function CompletionForecastPage() {
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/analytics/completion-forecast", { signal: controller.signal })
      .then(async (r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { if (controller.signal.aborted) return; setError(e instanceof Error ? e.message : String(e)); setLoading(false); });
    return () => controller.abort();
  }, []);

  if (loading) return <AdminLayout><div className="p-8 text-center">Загрузка...</div></AdminLayout>;
  if (error && !loading) return <AdminLayout><Card><CardContent className="py-6 text-center"><p className="text-sm text-destructive">Ошибка загрузки: {error}</p></CardContent></Card></AdminLayout>;
  if (!data) return <AdminLayout><div className="p-8 text-center">Ошибка загрузки</div></AdminLayout>;

  const filtered = filter === "all"
    ? data.forecasts
    : filter === "ontrack"
      ? data.forecasts.filter((f) => f.onTrack)
      : data.forecasts.filter((f) => !f.onTrack);

  const distData = Object.entries(data.summary.completionDistribution).map(([range, count]) => ({
    range,
    count,
  }));

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Прогноз завершения курса</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Кто успеет завершить все задания, скорость, уровень риска
            </p>
          </div>
          <PrintButton />
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1"><Users className="h-4 w-4 text-blue-600 dark:text-blue-400" /><span className="text-xs text-muted-foreground">Студенты</span></div>
              <p className="text-2xl font-bold">{data.summary.totalStudents}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1"><CheckCircle2 className="h-4 w-4 text-emerald-600" /><span className="text-xs text-muted-foreground">В графике</span></div>
              <p className="text-2xl font-bold text-emerald-600">{data.summary.onTrack}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1"><AlertTriangle className="h-4 w-4 text-rose-600" /><span className="text-xs text-muted-foreground">В зоне риска</span></div>
              <p className="text-2xl font-bold text-rose-600">{data.summary.atRisk}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1"><Target className="h-4 w-4 text-purple-600" /><span className="text-xs text-muted-foreground">Ср. завершение</span></div>
              <p className="text-2xl font-bold">{data.summary.avgCompletion}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1"><Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" /><span className="text-xs text-muted-foreground">Скорость (зад/нед)</span></div>
              <p className="text-2xl font-bold">{data.summary.avgVelocity}</p>
            </CardContent>
          </Card>
        </div>

        {/* Completion distribution */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Распределение по завершению</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={distData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="range" className="text-xs" />
                <YAxis allowDecimals={false} className="text-xs" />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {distData.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? "#ef4444" : i === 1 ? "#f97316" : i === 2 ? "#f59e0b" : i === 3 ? "#3b82f6" : "#10b981"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Filter controls */}
        <div className="flex gap-2">
          <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>
            Все ({data.forecasts.length})
          </Button>
          <Button variant={filter === "ontrack" ? "default" : "outline"} size="sm" onClick={() => setFilter("ontrack")}>
            В графике ({data.summary.onTrack})
          </Button>
          <Button variant={filter === "atrisk" ? "default" : "outline"} size="sm" onClick={() => setFilter("atrisk")}>
            Не в графике ({data.forecasts.length - data.summary.onTrack})
          </Button>
        </div>

        {/* Student forecasts table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Прогноз по студентам ({filtered.length})</CardTitle>
            <CardDescription>Отсортировано по уровню риска</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Студент</TableHead>
                    <TableHead className="text-center">Завершение</TableHead>
                    <TableHead className="text-center">Скорость</TableHead>
                    <TableHead className="text-center">Осталось недель</TableHead>
                    <TableHead className="text-center">Тренд</TableHead>
                    <TableHead className="text-center">Послед. активность</TableHead>
                    <TableHead className="text-center">В графике</TableHead>
                    <TableHead className="text-center">Риск</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((f) => {
                    const rc = riskConfig[f.riskLevel];
                    const TrendIcon = trendIcons[f.trend];
                    const trendLabel = f.trend === "improving" ? "Улучшение" : f.trend === "declining" ? "Снижение" : f.trend === "none" ? "Нет данных" : "Стабильно";
                    return (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">
                          <div>{f.name}</div>
                          <div className="text-xs text-muted-foreground">{f.group} · {f.university}</div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center gap-2 justify-center">
                            <Progress value={f.completionPct} className="w-12 h-2" />
                            <span className="text-xs font-bold">{f.completionPct}%</span>
                          </div>
                          <div className="text-xs text-muted-foreground">{f.completedTasks}/{f.totalTasks}</div>
                        </TableCell>
                        <TableCell className="text-center">
                          {f.velocity > 0 ? (
                            <span className="font-bold">{f.velocity}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {f.weeksToComplete !== null ? (
                            <span className={f.weeksToComplete > 12 ? "text-rose-600 font-bold" : "text-emerald-600"}>
                              {f.weeksToComplete} нед
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className={`flex items-center gap-1 justify-center ${trendColors[f.trend]}`}>
                            <TrendIcon className="h-4 w-4" />
                            <span className="text-xs">{trendLabel}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground text-xs">
                          {f.lastActivityDaysAgo !== null ? (
                            f.lastActivityDaysAgo === 0 ? "Сегодня" : f.lastActivityDaysAgo === 1 ? "Вчера" : `${f.lastActivityDaysAgo} дн. назад`
                          ) : (
                            "Нет активности"
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {f.onTrack ? (
                            <Badge variant="default" className="bg-emerald-600">Да</Badge>
                          ) : (
                            <Badge variant="secondary">Нет</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={rc.variant} className={rc.color}>{rc.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/admin/analytics/student/${f.id}`}>
                            <Button variant="ghost" size="sm" className="h-6 text-xs">
                              Подробнее <ArrowRight className="ml-1 h-3 w-3" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Нет студентов с выбранным фильтром</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
