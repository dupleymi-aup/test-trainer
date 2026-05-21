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
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { PrintButton } from "@/components/admin/analytics/print-button";
import {
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Minus,
  Users,
  RotateCcw,
  Clock,
  Target,
} from "lucide-react";

interface ReturnedStudent {
  id: string;
  name: string;
  group: string;
  university: string;
  gapDays: number;
  returnDate: string;
  beforeScore: number;
  afterScore: number;
  scoreChange: number;
  beforeTasks: number;
  afterTasks: number;
  trend: "improving" | "declining" | "stable";
  currentlyActive: boolean;
  daysSinceReturn: number;
  catchUpRate: number;
  totalGaps: number;
}

interface ReturnData {
  returnedStudents: ReturnedStudent[];
  summary: {
    totalReturned: number;
    currentlyActive: number;
    currentlyActivePct: number;
    improving: number;
    declining: number;
    avgGapDays: number;
    avgCatchUpRate: number;
    avgScoreChange: number;
  };
}

const trendConfig = {
  improving: { label: "Улучшение", icon: ArrowUp, color: "text-emerald-600" },
  declining: { label: "Снижение", icon: ArrowDown, color: "text-rose-600" },
  stable: { label: "Стабильно", icon: Minus, color: "text-muted-foreground" },
};

export default function StudentReturnPage() {
  const [data, setData] = useState<ReturnData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetch("/api/admin/analytics/student-return")
      .then(async (r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <AdminLayout><div className="p-8 text-center">Загрузка...</div></AdminLayout>;
  if (!data) return <AdminLayout><div className="p-8 text-center">Ошибка загрузки</div></AdminLayout>;

  const filtered = filter === "all"
    ? data.returnedStudents
    : filter === "active"
      ? data.returnedStudents.filter((r) => r.currentlyActive)
      : data.returnedStudents.filter((r) => !r.currentlyActive);

  const chartData = [
    { label: "Активные", value: data.summary.currentlyActive, color: "#10b981" },
    { label: "Неактивные", value: data.summary.totalReturned - data.summary.currentlyActive, color: "#ef4444" },
  ];

  const trendChartData = [
    { label: "Улучшение", value: data.summary.improving, color: "#10b981" },
    { label: "Снижение", value: data.summary.declining, color: "#ef4444" },
    { label: "Стабильно", value: data.summary.totalReturned - data.summary.improving - data.summary.declining, color: "#f59e0b" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Анализ возврата студентов</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Студенты, вернувшиеся после перерыва &gt;14 дней: прогресс до/после, догоняют ли
            </p>
          </div>
          <PrintButton />
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1"><RotateCcw className="h-4 w-4 text-blue-600" /><span className="text-xs text-muted-foreground">Вернулись</span></div>
              <p className="text-2xl font-bold">{data.summary.totalReturned}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1"><Users className="h-4 w-4 text-emerald-600" /><span className="text-xs text-muted-foreground">Сейчас активны</span></div>
              <p className="text-2xl font-bold text-emerald-600">{data.summary.currentlyActivePct}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1"><Clock className="h-4 w-4 text-amber-600" /><span className="text-xs text-muted-foreground">Ср. перерыв</span></div>
              <p className="text-2xl font-bold">{data.summary.avgGapDays} дн.</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1"><Target className="h-4 w-4 text-purple-600" /><span className="text-xs text-muted-foreground">Ср. догоняемость</span></div>
              <p className="text-2xl font-bold">{data.summary.avgCatchUpRate}%</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-sm">Активность после возврата</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" className="text-xs" />
                  <YAxis allowDecimals={false} className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <Bar key={i} dataKey="value" fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Тренд после возврата</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" className="text-xs" />
                  <YAxis allowDecimals={false} className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {trendChartData.map((entry, i) => (
                      <Bar key={i} dataKey="value" fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>Все ({data.returnedStudents.length})</Button>
          <Button variant={filter === "active" ? "default" : "outline"} size="sm" onClick={() => setFilter("active")}>Активные ({data.summary.currentlyActive})</Button>
          <Button variant={filter === "inactive" ? "default" : "outline"} size="sm" onClick={() => setFilter("inactive")}>Неактивные ({data.returnedStudents.length - data.summary.currentlyActive})</Button>
        </div>

        {/* Table */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Студенты, вернувшиеся после перерыва ({filtered.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Студент</TableHead>
                  <TableHead className="text-center">Перерыв</TableHead>
                  <TableHead className="text-center">Дата возврата</TableHead>
                  <TableHead className="text-center">Балл до</TableHead>
                  <TableHead className="text-center">Балл после</TableHead>
                  <TableHead className="text-center">Изменение</TableHead>
                  <TableHead className="text-center">Тренд</TableHead>
                  <TableHead className="text-center">Догоняемость</TableHead>
                  <TableHead className="text-center">Статус</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const trendConf = trendConfig[r.trend];
                  const TrendIcon = trendConf.icon;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        <div>{r.name}</div>
                        <div className="text-xs text-muted-foreground">{r.group} · {r.university}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={r.gapDays > 30 ? "destructive" : "secondary"}>{r.gapDays} дн.</Badge>
                      </TableCell>
                      <TableCell className="text-center text-xs text-muted-foreground">
                        {new Date(r.returnDate).toLocaleDateString("ru-RU")}
                        <div>{r.daysSinceReturn} дн. назад</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-muted-foreground">{r.beforeScore}%</span>
                      </TableCell>
                      <TableCell className="text-center font-bold">{r.afterScore}%</TableCell>
                      <TableCell className="text-center">
                        <span className={r.scoreChange > 0 ? "text-emerald-600 font-bold" : r.scoreChange < 0 ? "text-rose-600 font-bold" : "text-muted-foreground"}>
                          {r.scoreChange > 0 ? "+" : ""}{r.scoreChange}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className={`flex items-center gap-1 justify-center ${trendConf.color}`}>
                          <TrendIcon className="h-4 w-4" />
                          <span className="text-xs">{trendConf.label}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <Progress value={r.catchUpRate} className="w-12 h-2" />
                          <span className="text-xs font-bold">{r.catchUpRate}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {r.currentlyActive ? (
                          <Badge className="bg-emerald-600">Активен</Badge>
                        ) : (
                          <Badge variant="secondary">Неактивен</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/admin/analytics/student/${r.id}`}>
                          <Button variant="ghost" size="sm" className="h-6 text-xs">
                            Подробнее <ArrowRight className="ml-1 h-3 w-3" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">Нет студентов с выбранным фильтром</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
