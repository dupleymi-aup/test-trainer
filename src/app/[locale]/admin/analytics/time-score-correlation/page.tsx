"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useState } from "react";
import { useFetchData } from "@/hooks/use-fetch-data";
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
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { PrintButton } from "@/components/admin/analytics/print-button";
import {
  Clock,
  TrendingUp,
  Zap,
  Target,
  AlertTriangle,
  Users,
  Timer,
  Brain,
} from "lucide-react";

interface BehavioralSegment {
  count: number;
  pct: number;
  avgScore: number;
  avgTimeSeconds: number;
}

interface PerTaskAnalysis {
  taskId: string;
  taskName: string;
  attemptsCount: number;
  avgScore: number;
  avgTimeSeconds: number;
  avgTimeMinutes: number;
  correlation: number;
  optimalTimeRange: { min: number; max: number };
}

interface CorrelationData {
  globalCorrelation: number;
  totalAttempts: number;
  medianTimeSeconds: number;
  medianScore: number;
  segmentAnalysis: Array<{ label: string; count: number; avgScore: number; avgTimeSeconds: number }>;
  perTaskAnalysis: PerTaskAnalysis[];
  behavioralSegments: {
    rushers: BehavioralSegment;
    perfectionists: BehavioralSegment;
    efficient: BehavioralSegment;
    struggling: BehavioralSegment;
  };
  scatterData: Array<{ timeSpent: number; score: number; taskId: string; taskName: string }>;
}

const segmentConfig: Record<string, { label: string; color: string; icon: typeof Clock; description: string }> = {
  rushers: { label: "Торопыги", color: "text-rose-600", icon: Zap, description: "Быстро и плохо" },
  perfectionists: { label: "Перфекционисты", color: "text-blue-600 dark:text-blue-400", icon: Target, description: "Медленно и качественно" },
  efficient: { label: "Эффективные", color: "text-emerald-600", icon: Brain, description: "Быстро и качественно" },
  struggling: { label: "Испытывающие трудности", color: "text-amber-600 dark:text-amber-400", icon: AlertTriangle, description: "Медленно и плохо" },
};

export default function TimeScoreCorrelationPage() {
  const [showAllTasks, setShowAllTasks] = useState(false);
  const { data, loading, error } = useFetchData<CorrelationData>("/api/admin/analytics/time-score-correlation");

  if (loading) return <AdminLayout><div className="p-8 text-center">Загрузка...</div></AdminLayout>;
  if (error && !loading) return <AdminLayout><Card><CardContent className="py-6 text-center"><p className="text-sm text-destructive">Ошибка загрузки: {error}</p></CardContent></Card></AdminLayout>;
  if (!data) return <AdminLayout><div className="p-8 text-center">Ошибка загрузки</div></AdminLayout>;

  const { globalCorrelation, medianTimeSeconds, medianScore, segmentAnalysis, behavioralSegments, scatterData } = data;
  const topTasks = data.perTaskAnalysis.slice(0, showAllTasks ? undefined : 15);

  const corrLabel = Math.abs(globalCorrelation) > 0.5 ? "Сильная" : Math.abs(globalCorrelation) > 0.3 ? "Умеренная" : Math.abs(globalCorrelation) > 0.1 ? "Слабая" : "Отсутствует";
  const corrDirection = globalCorrelation > 0 ? "положительная" : globalCorrelation < 0 ? "отрицательная" : "";

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Корреляция времени и баллов</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Связь времени выполнения с качеством ответов, поведенческие сегменты
            </p>
          </div>
          <PrintButton />
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1"><TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" /><span className="text-xs text-muted-foreground">Корреляция (r)</span></div>
              <p className={`text-2xl font-bold ${globalCorrelation > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {globalCorrelation.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">{corrLabel} {corrDirection}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1"><Timer className="h-4 w-4 text-purple-600" /><span className="text-xs text-muted-foreground">Медиана времени</span></div>
              <p className="text-2xl font-bold">{Math.round(medianTimeSeconds / 60)} мин</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1"><Target className="h-4 w-4 text-emerald-600" /><span className="text-xs text-muted-foreground">Медиана баллов</span></div>
              <p className="text-2xl font-bold">{medianScore}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1"><Users className="h-4 w-4 text-indigo-600" /><span className="text-xs text-muted-foreground">Попыток</span></div>
              <p className="text-2xl font-bold">{data.totalAttempts}</p>
            </CardContent>
          </Card>
        </div>

        {/* Behavioral segments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Поведенческие сегменты</CardTitle>
            <CardDescription>Классификация по медиане времени ({Math.round(medianTimeSeconds / 60)} мин) и баллов ({medianScore}%)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(behavioralSegments).map(([key, seg]) => {
                const config = segmentConfig[key];
                const Icon = config.icon;
                return (
                  <div key={key} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-5 w-5 ${config.color}`} />
                      <div>
                        <p className="font-bold text-sm">{config.label}</p>
                        <p className="text-xs text-muted-foreground">{config.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Доля</span>
                      <span className="font-bold">{seg.pct}%</span>
                    </div>
                    <Progress value={seg.pct} className="h-2" />
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Ср. балл</p>
                        <p className="font-bold text-lg">{seg.avgScore}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Ср. время</p>
                        <p className="font-bold text-lg">{Math.round(seg.avgTimeSeconds / 60)} мин</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{seg.count} попыток</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Scatter plot */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Scatter: время vs балл</CardTitle>
            <CardDescription>Каждая точка — одна попытка (показано до 5000)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="timeSpent" name="Время (мин)" tickFormatter={(v: number) => `${v}м`} />
                <YAxis dataKey="score" name="Балл" domain={[0, 100]} />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null;
                    const d = payload[0].payload as typeof scatterData[0];
                    return (
                      <div className="bg-background border rounded-lg p-2 shadow-sm text-xs">
                        <p className="font-bold">{d.taskName}</p>
                        <p>Время: {d.timeSpent} мин</p>
                        <p>Балл: {d.score}%</p>
                      </div>
                    );
                  }}
                />
                <Scatter data={scatterData} fill="hsl(var(--primary))" opacity={0.4}>
                  {scatterData.map((_, i) => (
                    <Cell key={i} fill={`hsl(${220 + (i % 60)}, 70%, ${50 + (i % 20)}%)`} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Time segment analysis */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Анализ по сегментам времени</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={segmentAnalysis}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="label" className="text-xs" />
                <YAxis yAxisId="left" allowDecimals={false} className="text-xs" />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} className="text-xs" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="count" fill="hsl(var(--primary))" name="Кол-во попыток" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="avgScore" fill="#10b981" name="Ср. балл %" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Per-task correlation table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Корреляция по заданиям ({data.perTaskAnalysis.length} заданий)</CardTitle>
            <CardDescription>Отсортировано по абсолютной величине корреляции</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Задание</TableHead>
                    <TableHead className="text-center">Попыток</TableHead>
                    <TableHead className="text-center">Ср. балл</TableHead>
                    <TableHead className="text-center">Ср. время</TableHead>
                    <TableHead className="text-center">Корреляция</TableHead>
                    <TableHead className="text-center">Оптимальное время</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topTasks.map((t) => (
                    <TableRow key={t.taskId}>
                      <TableCell className="font-medium max-w-[200px]">
                        <div className="truncate" title={t.taskName}>{t.taskName}</div>
                      </TableCell>
                      <TableCell className="text-center">{t.attemptsCount}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={t.avgScore >= 75 ? "default" : t.avgScore >= 50 ? "secondary" : "destructive"}>{t.avgScore}%</Badge>
                      </TableCell>
                      <TableCell className="text-center">{t.avgTimeMinutes} мин</TableCell>
                      <TableCell className="text-center">
                        <span className={t.correlation > 0.3 ? "text-emerald-600 font-bold" : t.correlation < -0.3 ? "text-rose-600 font-bold" : "text-muted-foreground"}>
                          {t.correlation > 0 ? "+" : ""}{t.correlation.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {t.optimalTimeRange.min}-{t.optimalTimeRange.max} мин
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {data.perTaskAnalysis.length > 15 && (
              <div className="p-4 text-center">
                <Button variant="outline" size="sm" onClick={() => setShowAllTasks(!showAllTasks)}>
                  {showAllTasks ? "Показать меньше" : `Показать все ${data.perTaskAnalysis.length}`}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
