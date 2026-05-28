"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnalyticsFilterBar, FilterState } from "@/components/admin/analytics/analytics-filter-bar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrendingUp, Flame, CheckCircle2, AlertTriangle } from "lucide-react";

interface TopicGroupData {
  avgScore: number;
  avgEc: number;
  avgBv: number;
  count: number;
}

interface TopicRow {
  topic: string;
  groups: Record<string, TopicGroupData>;
}

interface GroupTaskData {
  taskId: number;
  taskName: string;
  difficulty: string;
  avgScore: number;
  count: number;
}

interface GroupMastery {
  groupId: string;
  groupName: string;
  tasks: GroupTaskData[];
}

interface TopicSummary {
  topic: string;
  avgScore: number;
  avgEc: number;
  avgBv: number;
  totalAttempts: number;
}

function HeatmapCell({ value, count }: { value: number; count: number }) {
  if (count === 0) return <div className="text-xs text-muted-foreground">—</div>;

  let bg = "";
  if (value >= 80) bg = "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300";
  else if (value >= 60) bg = "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300";
  else if (value >= 40) bg = "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300";
  else bg = "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300";

  return (
    <div className={`inline-flex items-center justify-center min-w-[3rem] px-2 py-1 rounded text-xs font-bold ${bg}`}>
      {value}%
    </div>
  );
}

export default function AdminTopicHeatmapPage() {
  const [matrix, setMatrix] = useState<TopicRow[]>([]);
  const [groupMastery, setGroupMastery] = useState<GroupMastery[]>([]);
  const [topicSummary, setTopicSummary] = useState<TopicSummary[]>([]);
  const [groupNames, setGroupNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [_filters, setFilters] = useState<Partial<FilterState>>({});

  const fetchData = (f: Partial<FilterState>) => {
    setFilters(f);
    const params = new URLSearchParams();
    if (f.dateFrom) params.set("startDate", f.dateFrom);
    if (f.dateTo) params.set("endDate", f.dateTo);

    setError(null);
    fetch(`/api/admin/analytics/topic-heatmap?${params}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setMatrix(data.matrix || []);
        setGroupMastery(data.groupMastery || []);
        setTopicSummary(data.topicSummary || []);
        setGroupNames(data.groupNames || []);
        setLoading(false);
      })
      .catch((e) => { setError(e instanceof Error ? e.message : String(e)); setLoading(false); });
  };

  useEffect(() => {
    fetchData({});
  }, []);

  if (loading) return <AdminLayout><div className="p-8 text-center">Загрузка...</div></AdminLayout>;
  if (error && !loading) return <AdminLayout><Card><CardContent className="py-6 text-center"><p className="text-sm text-destructive">Ошибка загрузки: {error}</p></CardContent></Card></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold">Тепловая карта тем</h1>
          <p className="text-sm text-muted-foreground">
            Успеваемость по темам тестирования в разрезе групп
          </p>
        </div>

        <AnalyticsFilterBar onFilterChange={fetchData} />

        {/* Topic Heatmap Matrix */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Матрица: Тема × Группа</CardTitle>
            <CardDescription>Средний балл по каждой теме для каждой группы</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Тема</TableHead>
                  {groupNames.map((name) => (
                    <TableHead key={name} className="text-center min-w-[80px]">{name}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {matrix.map((row) => (
                  <TableRow key={row.topic}>
                    <TableCell className="font-medium">{row.topic}</TableCell>
                    {groupNames.map((name) => (
                      <TableCell key={name} className="text-center">
                        <HeatmapCell value={row.groups[name]?.avgScore || 0} count={row.groups[name]?.count || 0} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Topic Difficulty Legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>Легенда:</span>
          <div className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-green-100" /> ≥ 80%</div>
          <div className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-yellow-100" /> 60–79%</div>
          <div className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-orange-100" /> 40–59%</div>
          <div className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-red-100" /> &lt; 40%</div>
        </div>

        {/* Weakest Topics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Flame className="h-4 w-4 text-red-500" />
              Наиболее проблемные темы
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Тема</TableHead>
                  <TableHead className="text-right">Ср. балл</TableHead>
                  <TableHead className="text-right">Ср. EC</TableHead>
                  <TableHead className="text-right">Ср. BV</TableHead>
                  <TableHead className="text-right">Попытки</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topicSummary.slice(0, 5).map((t) => (
                  <TableRow key={t.topic}>
                    <TableCell className="font-medium">{t.topic}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={t.avgScore >= 75 ? "default" : t.avgScore >= 50 ? "secondary" : "destructive"}>
                        {t.avgScore}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{t.avgEc}%</TableCell>
                    <TableCell className="text-right">{t.avgBv}%</TableCell>
                    <TableCell className="text-right text-muted-foreground">{t.totalAttempts}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Group Task Mastery */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Усвоение заданий по группам</CardTitle>
            <CardDescription>Средний балл по каждому заданию для каждой группы</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {groupMastery.map((group) => (
              <div key={group.groupId}>
                <h4 className="font-medium text-sm mb-2">{group.groupName}</h4>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Задание</TableHead>
                        <TableHead>Сложность</TableHead>
                        <TableHead className="text-right">Ср. балл</TableHead>
                        <TableHead className="text-right">Попытки</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.tasks.map((task) => (
                        <TableRow key={task.taskId}>
                          <TableCell className="font-medium">{task.taskName}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              task.difficulty === "Легко" ? "text-green-600" :
                              task.difficulty === "Средне" ? "text-amber-600" : "text-red-600"
                            }>
                              {task.difficulty}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <HeatmapCell value={task.avgScore} count={task.count} />
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">{task.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Insights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-xs text-muted-foreground">Лучшая тема</span>
              </div>
              {topicSummary.length > 0 && (
                <>
                  <p className="text-lg font-bold">{topicSummary[topicSummary.length - 1].topic}</p>
                  <p className="text-sm text-muted-foreground">{topicSummary[topicSummary.length - 1].avgScore}% ср. балл</p>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-xs text-muted-foreground">Худшая тема</span>
              </div>
              {topicSummary.length > 0 && (
                <>
                  <p className="text-lg font-bold">{topicSummary[0].topic}</p>
                  <p className="text-sm text-muted-foreground">{topicSummary[0].avgScore}% ср. балл</p>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                <span className="text-xs text-muted-foreground">Всего тем</span>
              </div>
              <p className="text-2xl font-bold">{topicSummary.length}</p>
              <p className="text-sm text-muted-foreground">{groupMastery.length} групп</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
