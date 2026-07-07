"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
} from "recharts";
import { PrintButton } from "@/components/admin/analytics/print-button";
import {
  FileText,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowUpDown,
} from "lucide-react";

interface TaskAnalysis {
  taskId: string;
  taskName: string;
  declaredDifficulty: string;
  attemptsCount: number;
  uniqueStudents: number;
  avgScore: number;
  pValue: number;
  discrimination: number;
  guessability: number;
  timeEfficiency: number;
  avgTimeSeconds: number;
  stdDev: number;
  distribution: Record<string, number>;
  qualityRating: "good" | "acceptable" | "poor";
}

interface AnalysisData {
  taskAnalysis: TaskAnalysis[];
  summary: {
    totalTasks: number;
    avgDifficulty: number;
    avgDiscrimination: number;
    goodQuality: number;
    acceptableQuality: number;
    poorQuality: number;
  };
}

const qualityConfig = {
  good: { label: "Хорошее", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300", icon: CheckCircle2 },
  acceptable: { label: "Приемлемое", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300", icon: HelpCircle },
  poor: { label: "Плохое", color: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300", icon: XCircle },
};

const difficultyLabels: Record<string, string> = {
  EASY: "Лёгкое",
  MEDIUM: "Среднее",
  HARD: "Сложное",
  Unknown: "Не определено",
};

export default function ItemDifficultyPage() {
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"discrimination" | "avgScore" | "pValue">("discrimination");
  const [filterQuality, setFilterQuality] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/analytics/item-difficulty", { signal: controller.signal })
      .then(async (r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { if (controller.signal.aborted) return; setError(e instanceof Error ? e.message : String(e)); setLoading(false); });
    return () => controller.abort();
  }, []);

  if (loading) return <AdminLayout><div className="p-8 text-center">Загрузка...</div></AdminLayout>;
  if (error && !loading) return <AdminLayout><Card><CardContent className="py-6 text-center"><p className="text-sm text-destructive">Ошибка загрузки: {error}</p></CardContent></Card></AdminLayout>;
  if (!data) return <AdminLayout><div className="p-8 text-center">Ошибка загрузки</div></AdminLayout>;

  let filtered = [...data.taskAnalysis];
  if (filterQuality !== "all") {
    filtered = filtered.filter((t) => t.qualityRating === filterQuality);
  }
  filtered.sort((a, b) => {
    if (sortBy === "discrimination") return b.discrimination - a.discrimination;
    if (sortBy === "avgScore") return b.avgScore - a.avgScore;
    return a.pValue - b.pValue; // pValue: lower = harder
  });

  const scatterData = data.taskAnalysis.map((t) => ({
    name: t.taskName,
    difficulty: t.pValue,
    discrimination: t.discrimination,
    attempts: t.attemptsCount,
    quality: t.qualityRating,
  }));

  const distData = data.taskAnalysis.map((t) => ({
    name: t.taskName.length > 20 ? t.taskName.slice(0, 20) + "..." : t.taskName,
    "0-20": t.distribution["0-20"],
    "21-40": t.distribution["21-40"],
    "41-60": t.distribution["41-60"],
    "61-80": t.distribution["61-80"],
    "81-100": t.distribution["81-100"],
  }));

  const { summary } = data;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Анализ сложности заданий</h1>
            <p className="text-muted-foreground text-sm mt-1">
              IRT-анализ: сложность, дифференциация, угадываемость, эффективность времени
            </p>
          </div>
          <PrintButton />
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1"><FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" /><span className="text-xs text-muted-foreground">Всего заданий</span></div>
              <p className="text-2xl font-bold">{summary.totalTasks}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1"><TrendingUp className="h-4 w-4 text-emerald-600" /><span className="text-xs text-muted-foreground">Ср. сложность (p)</span></div>
              <p className="text-2xl font-bold">{summary.avgDifficulty}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1"><ArrowUpDown className="h-4 w-4 text-purple-600" /><span className="text-xs text-muted-foreground">Ср. дифференциация</span></div>
              <p className="text-2xl font-bold">{summary.avgDiscrimination}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1"><CheckCircle2 className="h-4 w-4 text-emerald-600" /><span className="text-xs text-muted-foreground">Хорошее качество</span></div>
              <p className="text-2xl font-bold text-emerald-600">{summary.goodQuality}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1"><AlertTriangle className="h-4 w-4 text-rose-600" /><span className="text-xs text-muted-foreground">Плохое качество</span></div>
              <p className="text-2xl font-bold text-rose-600">{summary.poorQuality}</p>
            </CardContent>
          </Card>
        </div>

        {/* Scatter: Difficulty vs Discrimination */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Карта заданий: сложность vs дифференциация</CardTitle>
            <CardDescription>
              Идеальные задания: p-value 0.3-0.7, дискриминация &gt; 0.3 (правый верхний угол)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="difficulty" name="Сложность (p)" domain={[0, 1]} tickFormatter={(v: number) => v.toFixed(1)} />
                <YAxis dataKey="discrimination" name="Дифференциация" domain={[-0.5, 1]} tickFormatter={(v: number) => v.toFixed(1)} />
                <ZAxis dataKey="attempts" range={[30, 200]} />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  formatter={(value: number, name: string) => [typeof value === "number" ? value.toFixed(2) : value, name]}
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null;
                    const d = payload[0].payload as typeof scatterData[0];
                    const qc = qualityConfig[d.quality];
                    return (
                      <div className="bg-background border rounded-lg p-2 shadow-sm text-xs">
                        <p className="font-bold">{d.name}</p>
                        <p>p-value: {d.difficulty.toFixed(2)}</p>
                        <p>Дискриминация: {d.discrimination.toFixed(2)}</p>
                        <p>Попыток: {d.attempts}</p>
                        <p className={d.quality === "good" ? "text-emerald-600" : d.quality === "poor" ? "text-rose-600" : "text-amber-600 dark:text-amber-400"}>
                          Качество: {qc.label}
                        </p>
                      </div>
                    );
                  }}
                />
                <Scatter data={scatterData}>
                  {scatterData.map((entry, index) => (
                    <Cell key={index} fill={entry.quality === "good" ? "#10b981" : entry.quality === "poor" ? "#ef4444" : "#f59e0b"} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Controls */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex gap-2">
            <Button variant={filterQuality === "all" ? "default" : "outline"} size="sm" onClick={() => setFilterQuality("all")}>Все</Button>
            <Button variant={filterQuality === "good" ? "default" : "outline"} size="sm" onClick={() => setFilterQuality("good")}>Хорошее</Button>
            <Button variant={filterQuality === "acceptable" ? "default" : "outline"} size="sm" onClick={() => setFilterQuality("acceptable")}>Приемлемое</Button>
            <Button variant={filterQuality === "poor" ? "default" : "outline"} size="sm" onClick={() => setFilterQuality("poor")}>Плохое</Button>
          </div>
          <div className="flex gap-2 ml-auto">
            <Button variant={sortBy === "discrimination" ? "default" : "outline"} size="sm" onClick={() => setSortBy("discrimination")}>По дифференциации</Button>
            <Button variant={sortBy === "avgScore" ? "default" : "outline"} size="sm" onClick={() => setSortBy("avgScore")}>По баллу</Button>
            <Button variant={sortBy === "pValue" ? "default" : "outline"} size="sm" onClick={() => setSortBy("pValue")}>По сложности</Button>
          </div>
        </div>

        {/* Task table */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Детализация по заданиям ({filtered.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Задание</TableHead>
                    <TableHead className="text-center">Сложность</TableHead>
                    <TableHead className="text-center">p-value</TableHead>
                    <TableHead className="text-center">Дискрим.</TableHead>
                    <TableHead className="text-center">Угадыв.</TableHead>
                    <TableHead className="text-center">Ср. время</TableHead>
                    <TableHead className="text-center">Балл/мин</TableHead>
                    <TableHead className="text-center">Качество</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((t) => {
                    const qc = qualityConfig[t.qualityRating];
                    const Icon = qc.icon;
                    return (
                      <TableRow key={t.taskId}>
                        <TableCell className="font-medium max-w-[200px]">
                          <div className="truncate" title={t.taskName}>{t.taskName}</div>
                          <div className="text-xs text-muted-foreground">{difficultyLabels[t.declaredDifficulty] || t.declaredDifficulty} · {t.attemptsCount} попыток · {t.uniqueStudents} студ.</div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={t.avgScore >= 75 ? "default" : t.avgScore >= 50 ? "secondary" : "destructive"}>{t.avgScore}%</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={t.pValue > 0.3 && t.pValue < 0.8 ? "text-emerald-600 font-bold" : "text-rose-600"}>
                            {t.pValue.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={t.discrimination > 0.3 ? "text-emerald-600 font-bold" : t.discrimination > 0.2 ? "text-amber-600 dark:text-amber-400" : "text-rose-600"}>
                            {t.discrimination.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={t.guessability < 20 ? "text-emerald-600" : t.guessability < 40 ? "text-amber-600 dark:text-amber-400" : "text-rose-600"}>
                            {t.guessability}%
                          </span>
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {Math.round(t.avgTimeSeconds / 60)} мин
                        </TableCell>
                        <TableCell className="text-center">{t.timeEfficiency}</TableCell>
                        <TableCell className="text-center">
                          <Badge className={qc.color}>
                            <Icon className="h-3 w-3 mr-1" />{qc.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Нет заданий с выбранным фильтром</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Score distribution per task */}
        {distData.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Распределение баллов по заданиям</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={distData.slice(0, 15)}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" angle={-45} textAnchor="end" height={80} />
                  <YAxis allowDecimals={false} className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="0-20" stackId="a" fill="#ef4444" name="0-20%" />
                  <Bar dataKey="21-40" stackId="a" fill="#f97316" name="21-40%" />
                  <Bar dataKey="41-60" stackId="a" fill="#f59e0b" name="41-60%" />
                  <Bar dataKey="61-80" stackId="a" fill="#3b82f6" name="61-80%" />
                  <Bar dataKey="81-100" stackId="a" fill="#10b981" name="81-100%" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
