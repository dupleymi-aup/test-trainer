"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { AnalyticsFilterBar, FilterState } from "@/components/admin/analytics/analytics-filter-bar";
import {
  Lightbulb, TrendingUp, Target, ChevronDown, ChevronRight
} from "lucide-react";

interface TaskRec {
  taskId: number;
  taskName: string;
  difficulty: string;
  reason: string;
  priority: "high" | "medium" | "low";
  topics: string[];
  matchingGaps: string[];
}

interface StudentRec {
  studentId: string;
  name: string;
  email: string;
  group: string | null;
  university: string | null;
  avgScore: number;
  trend: "improving" | "stable" | "declining";
  dropoutRisk: "high" | "medium" | "low";
  recommendations: TaskRec[];
  totalGaps: number;
}

interface Summary {
  totalStudents: number;
  withRecommendations: number;
  avgRecommendationsPerStudent: number;
  topRecommendedTasks: { taskId: number; taskName: string; count: number }[];
  topGaps: { gap: string; count: number }[];
}

interface RecommendationsData {
  students: StudentRec[];
  summary: Summary;
}

const difficultyColors: Record<string, string> = {
  "Легко": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  "Средне": "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  "Сложно": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const priorityColors: Record<string, string> = {
  high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  low: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
};

const priorityLabels: Record<string, string> = {
  high: "Высокий",
  medium: "Средний",
  low: "Низкий",
};

const riskColors: Record<string, string> = {
  high: "text-rose-600",
  medium: "text-amber-600 dark:text-amber-400",
  low: "text-green-600",
};

const riskLabels: Record<string, string> = {
  high: "Высокий",
  medium: "Средний",
  low: "Низкий",
};

export default function RecommendationsPage() {
  const [data, setData] = useState<RecommendationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Partial<FilterState>>({});
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = (f: Partial<FilterState>) => {
    const params = new URLSearchParams();
    if (f.groupId) params.set("groupId", f.groupId);
    if (f.university) params.set("university", f.university);
    if (f.riskLevel) params.set("riskLevel", f.riskLevel);
    params.set("limit", "100");

    setLoading(true);
    setError(null);
    fetch(`/api/admin/analytics/recommendations?${params}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e instanceof Error ? e.message : String(e)); setLoading(false); });
  };

  useEffect(() => {
    fetchData(filters);
  }, [filters]);

  if (loading) return <AdminLayout><div className="p-8 text-center">Loading...</div></AdminLayout>;
  if (error && !loading) return <AdminLayout><Card><CardContent className="py-6 text-center"><p className="text-sm text-destructive">Load error: {error}</p></CardContent></Card></AdminLayout>;
  if (!data) return <AdminLayout><div className="p-8 text-center text-rose-600">No data</div></AdminLayout>;

  const { summary } = data;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Автоматические рекомендации</h1>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <AnalyticsFilterBar
              onFilterChange={(f) => { setFilters(f); }}
              showGroupFilter
              showUniversityFilter
              showRiskFilter
            />
          </CardContent>
        </Card>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground">Всего студентов</div>
              <div className="text-2xl font-bold">{summary.totalStudents}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Lightbulb className="h-3 w-3 text-amber-500" /> С рекомендациями
              </div>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{summary.withRecommendations}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground">Ср. рекомендаций/студ</div>
              <div className="text-2xl font-bold">{summary.avgRecommendationsPerStudent}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Target className="h-3 w-3 text-blue-500" /> Всего пробелов
              </div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {data.students.reduce((s, r) => s + r.totalGaps, 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top recommended tasks + Top gaps */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Самые рекомендуемые задания</CardTitle>
              <CardDescription>Задания, которые чаще всего рекомендуются студентам</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead className="text-right">Кол-во студентов</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.topRecommendedTasks.map((t) => (
                    <TableRow key={t.taskId}>
                      <TableCell className="font-medium">
                        <span className="text-xs text-muted-foreground mr-1">#{t.taskId}</span>
                        {t.taskName}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="default">{t.count}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {summary.topRecommendedTasks.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground py-6">
                        Нет рекомендаций
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Самые частые пробелы</CardTitle>
              <CardDescription>Наиболее распространённые проблемы среди студентов</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Пробел</TableHead>
                    <TableHead className="text-right">Встречается</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.topGaps.map((g) => (
                    <TableRow key={g.gap}>
                      <TableCell className="font-medium">{g.gap}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{g.count}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {summary.topGaps.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground py-6">
                        No data
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Student recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Рекомендации по студентам</CardTitle>
            <CardDescription>
              Персональные рекомендации заданий для каждого студента на основе пробелов в знаниях
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead>Avg. score</TableHead>
                  <TableHead>Trend</TableHead>
                  <TableHead>Риск</TableHead>
                  <TableHead className="text-right">Пробелы</TableHead>
                  <TableHead className="text-right">Рекомендации</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.students.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      Нет студентов с рекомендациями. Попробуйте изменить фильтры.
                    </TableCell>
                  </TableRow>
                )}
                {data.students.map((s) => (
                  <>
                    <TableRow
                      key={s.studentId}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setExpandedStudent(expandedStudent === s.studentId ? null : s.studentId)}
                      role="button"
                      tabIndex={0}
                      aria-label={`Показать детали студента ${s.name}`}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setExpandedStudent(expandedStudent === s.studentId ? null : s.studentId);
                        }
                      }}
                    >
                      <TableCell>
                        {expandedStudent === s.studentId
                          ? <ChevronDown className="h-4 w-4" />
                          : <ChevronRight className="h-4 w-4" />}
                      </TableCell>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-sm">{s.group || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={s.avgScore >= 75 ? "default" : s.avgScore >= 50 ? "secondary" : "destructive"}>
                          {s.avgScore}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {s.trend === "improving" && <span className="text-emerald-600 text-sm flex items-center gap-1"><TrendingUp className="h-3 w-3" />Растёт</span>}
                        {s.trend === "stable" && <span className="text-muted-foreground text-sm">Стабильно</span>}
                        {s.trend === "declining" && <span className="text-rose-600 text-sm">Снижается</span>}
                      </TableCell>
                      <TableCell>
                        <span className={`text-sm font-medium ${riskColors[s.dropoutRisk]}`}>
                          {riskLabels[s.dropoutRisk]}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{s.totalGaps}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge>{s.recommendations.length}</Badge>
                      </TableCell>
                    </TableRow>
                    {expandedStudent === s.studentId && s.recommendations.length > 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="bg-muted/30 p-0">
                          <div className="p-4 space-y-2">
                            <div className="text-sm font-medium mb-2 flex items-center gap-2">
                              <Lightbulb className="h-4 w-4 text-amber-500" />
                              Рекомендованные задания для {s.name}
                            </div>
                            {s.recommendations.map((rec, idx) => (
                              <div
                                key={idx}
                                className="flex items-start gap-3 p-3 border rounded-lg bg-background"
                              >
                                <div className="shrink-0 w-20">
                                  <Badge className={priorityColors[rec.priority]}>
                                    {priorityLabels[rec.priority]}
                                  </Badge>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs text-muted-foreground font-mono">#{rec.taskId}</span>
                                    <span className="font-medium text-sm">{rec.taskName}</span>
                                    <Badge className={difficultyColors[rec.difficulty]} variant="outline">
                                      {rec.difficulty}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground mb-1">{rec.reason}</p>
                                  <div className="flex gap-1 flex-wrap">
                                    {rec.topics.map((t) => (
                                      <Badge key={t} variant="outline" className="text-xs">
                                        {t}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
