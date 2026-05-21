"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useState, useEffect } from "react";
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
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  FunnelChart,
  Funnel,
  LabelList,
  Cell,
} from "recharts";
import { PrintButton } from "@/components/admin/analytics/print-button";
import {
  Filter,
  TrendingDown,
  Users,
  Target,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

interface FunnelStep {
  taskId: string;
  taskName: string;
  order: number;
  uniqueStudents: number;
  completionRate: number;
  totalAttempts: number;
  avgScore: number;
  passRate: number;
  passCount: number;
  failCount: number;
  dropOff: number;
  avgAttempts: number;
}

interface FunnelData {
  totalStudents: number;
  totalTasks: number;
  funnel: FunnelStep[];
  bottlenecks: FunnelStep[];
  taskCompletionDistribution: Record<string, number>;
  overallCompletionRate: number;
}

const funnelColors = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "#6366f1",
  "#8b5cf6",
  "#a78bfa",
  "#c4b5fd",
  "#ddd6fe",
];

export default function CompletionFunnelPage() {
  const [data, setData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBottlenecks, setShowBottlenecks] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics/completion-funnel")
      .then(async (r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <AdminLayout><div className="p-8 text-center">Загрузка...</div></AdminLayout>;
  if (!data) return <AdminLayout><div className="p-8 text-center">Ошибка загрузки</div></AdminLayout>;

  const funnelChartData = data.funnel.map((step, i) => ({
    name: `Задание ${step.order}`,
    value: step.uniqueStudents,
    fill: funnelColors[i % funnelColors.length],
  }));

  const distributionData = Object.entries(data.taskCompletionDistribution).map(([bucket, count]) => ({
    bucket,
    count,
    pct: Math.round((count / data.totalStudents) * 100),
  }));

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Воронка прохождения заданий</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Где студенты сходят, bottleneck-задания, распределение完成任务
            </p>
          </div>
          <PrintButton />
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1"><Users className="h-4 w-4 text-blue-600" /><span className="text-xs text-muted-foreground">Всего студентов</span></div>
              <p className="text-2xl font-bold">{data.totalStudents}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1"><Target className="h-4 w-4 text-emerald-600" /><span className="text-xs text-muted-foreground">Всего заданий</span></div>
              <p className="text-2xl font-bold">{data.totalTasks}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1"><CheckCircle2 className="h-4 w-4 text-teal-600" /><span className="text-xs text-muted-foreground">Завершили все</span></div>
              <p className="text-2xl font-bold text-teal-600">{data.overallCompletionRate}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1"><AlertTriangle className="h-4 w-4 text-rose-600" /><span className="text-xs text-muted-foreground">Bottleneck-ей</span></div>
              <p className="text-2xl font-bold text-rose-600">{data.bottlenecks.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Funnel chart */}
        {funnelChartData.length > 0 && funnelChartData.length <= 10 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Воронка прохождения</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <FunnelChart>
                  <Funnel
                    dataKey="value"
                    data={funnelChartData}
                    isAnimationActive
                  >
                    <LabelList position="right" fill="hsl(var(--foreground))" stroke="none" dataKey="name" className="text-xs" />
                    {funnelChartData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Funnel bar chart (works better for many tasks) */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Студенты по заданиям</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.funnel}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="taskName" className="text-xs" angle={-45} textAnchor="end" height={80} />
                <YAxis allowDecimals={false} className="text-xs" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null;
                    const d = payload[0].payload as FunnelStep;
                    return (
                      <div className="bg-background border rounded-lg p-2 shadow-sm text-xs">
                        <p className="font-bold">{d.taskName}</p>
                        <p>Студентов: {d.uniqueStudents}</p>
                        <p>Попыток: {d.totalAttempts}</p>
                        <p>Ср. балл: {d.avgScore}%</p>
                        <p>Проход: {d.passRate}%</p>
                        <p>Отток: {d.dropOff}%</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="uniqueStudents" fill="hsl(var(--primary))" name="Студенты" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bottleneck tasks */}
        {data.bottlenecks.length > 0 && (
          <Card className="border-amber-200">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Критические bottleneck-задания
              </CardTitle>
              <CardDescription>Задания с наибольшим оттоком студентов</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.bottlenecks.map((b, i) => (
                  <div key={b.taskId} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="text-xs">#{i + 1}</Badge>
                        <span className="font-bold text-sm">{b.taskName}</span>
                      </div>
                      <Badge variant="destructive">Отток {b.dropOff}%</Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div>
                        <p className="text-muted-foreground">Студентов</p>
                        <p className="font-bold">{b.uniqueStudents}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Ср. балл</p>
                        <p className="font-bold">{b.avgScore}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Проход</p>
                        <p className="font-bold">{b.passRate}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Ср. попыток</p>
                        <p className="font-bold">{b.avgAttempts}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Task completion distribution */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Распределение: сколько заданий выполнил каждый студент</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={distributionData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="bucket" className="text-xs" />
                <YAxis allowDecimals={false} className="text-xs" />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--chart-2))" name="Студенты" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Full funnel table */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Детальная воронка ({data.funnel.length} заданий)</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Задание</TableHead>
                    <TableHead className="text-center">Студенты</TableHead>
                    <TableHead className="text-center">Окончание %</TableHead>
                    <TableHead className="text-center">Попытки</TableHead>
                    <TableHead className="text-center">Ср. балл</TableHead>
                    <TableHead className="text-center">Проход %</TableHead>
                    <TableHead className="text-center">Отток %</TableHead>
                    <TableHead className="text-center">Ср. попыток</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.funnel.map((step) => (
                    <TableRow key={step.taskId}>
                      <TableCell className="text-muted-foreground">{step.order}</TableCell>
                      <TableCell className="font-medium max-w-[200px]">
                        <div className="truncate" title={step.taskName}>{step.taskName}</div>
                      </TableCell>
                      <TableCell className="text-center">{step.uniqueStudents}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <Progress value={step.completionRate} className="w-16 h-2" />
                          <span className="text-xs font-bold">{step.completionRate}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{step.totalAttempts}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={step.avgScore >= 75 ? "default" : step.avgScore >= 50 ? "secondary" : "destructive"}>{step.avgScore}%</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={step.passRate >= 70 ? "text-emerald-600 font-bold" : step.passRate >= 50 ? "text-amber-600" : "text-rose-600"}>
                          {step.passRate}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {step.dropOff > 20 ? (
                          <Badge variant="destructive">{step.dropOff}%</Badge>
                        ) : step.dropOff > 10 ? (
                          <Badge variant="secondary">{step.dropOff}%</Badge>
                        ) : (
                          <span className="text-emerald-600">{step.dropOff}%</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">{step.avgAttempts}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
