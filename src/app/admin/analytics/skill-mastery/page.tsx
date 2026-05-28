"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalyticsFilterBar, FilterState } from "@/components/admin/analytics/analytics-filter-bar";
import { TrendIndicator } from "@/components/admin/analytics/trend-indicator";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Target, ChevronDown, ChevronRight, TrendingUp, TrendingDown, Award } from "lucide-react";

interface EcSkill {
  ecId: string;
  ecName: string;
  taskId: number;
  taskName: string;
  difficulty: string;
  firstAttempt: string | null;
  lastAttempt: string | null;
  attemptsCount: number;
  avgScore: number;
  coverageRate: number;
  trend: "improving" | "stable" | "declining" | "none";
  scoreProgression: Array<{ date: string; score: number }>;
}

interface BvSkill {
  bvDescription: string;
  taskId: number;
  taskName: string;
  difficulty: string;
  firstAttempt: string | null;
  lastAttempt: string | null;
  attemptsCount: number;
  avgScore: number;
  coverageRate: number;
  trend: "improving" | "stable" | "declining" | "none";
  scoreProgression: Array<{ date: string; score: number }>;
}

interface Summary {
  totalEcSkills: number;
  masteredEc: number;
  weakEc: number;
  totalBvSkills: number;
  masteredBv: number;
  weakBv: number;
  improvingEc: EcSkill[];
  decliningEc: EcSkill[];
}

interface SkillMasteryData {
  ecSkills: EcSkill[];
  bvSkills: BvSkill[];
  summary: Summary;
}

const difficultyColors: Record<string, string> = {
  "Легко": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  "Средне": "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  "Сложно": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

export default function SkillMasteryPage() {
  const [data, setData] = useState<SkillMasteryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Partial<FilterState>>({});
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);

  const fetchData = (f: Partial<FilterState>) => {
    const params = new URLSearchParams();
    if (f.groupId) params.set("groupId", f.groupId);
    if (f.university) params.set("university", f.university);

    setError(null);
    setLoading(true);
    fetch(`/api/admin/analytics/skill-mastery?${params}`)
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

  if (loading) return <AdminLayout><div className="p-8 text-center">Загрузка...</div></AdminLayout>;
  if (error && !loading) return <AdminLayout><Card><CardContent className="py-6 text-center"><p className="text-sm text-destructive">Ошибка загрузки: {error}</p></CardContent></Card></AdminLayout>;
  if (!data) return <AdminLayout><div className="p-8 text-center text-rose-600">Нет данных</div></AdminLayout>;

  const { summary } = data;
  const ecCoverageRate = summary.totalEcSkills > 0 ? Math.round((summary.masteredEc / summary.totalEcSkills) * 100) : 0;
  const bvCoverageRate = summary.totalBvSkills > 0 ? Math.round((summary.masteredBv / summary.totalBvSkills) * 100) : 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-xl font-bold">Освоение навыков (EC/BV)</h1>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <AnalyticsFilterBar
              onFilterChange={setFilters}
              showGroupFilter
              showUniversityFilter
            />
          </CardContent>
        </Card>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Target className="h-3 w-3" /> EC освоено
              </div>
              <div className="text-2xl font-bold">{summary.masteredEc}/{summary.totalEcSkills}</div>
              <Progress value={ecCoverageRate} className="h-1 mt-2" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground">EC слабые</div>
              <div className="text-2xl font-bold text-rose-600">{summary.weakEc}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Award className="h-3 w-3" /> BV освоено
              </div>
              <div className="text-2xl font-bold">{summary.masteredBv}/{summary.totalBvSkills}</div>
              <Progress value={bvCoverageRate} className="h-1 mt-2" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground">BV слабые</div>
              <div className="text-2xl font-bold text-rose-600">{summary.weakBv}</div>
            </CardContent>
          </Card>
        </div>

        {/* Improving vs Declining */}
        {summary.improvingEc.length > 0 && summary.decliningEc.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-600" /> Улучшающиеся навыки
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Навык</TableHead>
                      <TableHead>Задание</TableHead>
                      <TableHead className="text-right">Покрытие</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.improvingEc.map((s) => (
                      <TableRow key={s.ecId}>
                        <TableCell className="font-medium text-xs">{s.ecName}</TableCell>
                        <TableCell className="text-xs">
                          <span className="text-muted-foreground mr-1">#{s.taskId}</span>
                          {s.taskName}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="default">{s.coverageRate}%</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-rose-600" /> Снижающиеся навыки
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Навык</TableHead>
                      <TableHead>Задание</TableHead>
                      <TableHead className="text-right">Покрытие</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.decliningEc.map((s) => (
                      <TableRow key={s.ecId}>
                        <TableCell className="font-medium text-xs">{s.ecName}</TableCell>
                        <TableCell className="text-xs">
                          <span className="text-muted-foreground mr-1">#{s.taskId}</span>
                          {s.taskName}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="destructive">{s.coverageRate}%</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* EC and BV Skills Tables */}
        <Tabs defaultValue="ec">
          <TabsList>
            <TabsTrigger value="ec">Классы эквивалентности (EC)</TabsTrigger>
            <TabsTrigger value="bv">Граничные значения (BV)</TabsTrigger>
          </TabsList>

          <TabsContent value="ec">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Классы эквивалентности</CardTitle>
                <CardDescription>
                  Покрытие каждого класса эквивалентности с прогрессией по времени
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>EC</TableHead>
                      <TableHead>Задание</TableHead>
                      <TableHead>Сложность</TableHead>
                      <TableHead className="text-right">Попытки</TableHead>
                      <TableHead className="text-right">Покрытие</TableHead>
                      <TableHead className="text-right">Ср. балл</TableHead>
                      <TableHead>Тренд</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.ecSkills.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          Нет данных
                        </TableCell>
                      </TableRow>
                    )}
                    {data.ecSkills.map((s) => (
                      <>
                        <TableRow
                          key={s.ecId}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setExpandedSkill(expandedSkill === s.ecId ? null : s.ecId)}
                        >
                          <TableCell>
                            {expandedSkill === s.ecId
                              ? <ChevronDown className="h-4 w-4" />
                              : <ChevronRight className="h-4 w-4" />}
                          </TableCell>
                          <TableCell className="font-medium text-xs max-w-[200px] truncate">{s.ecName}</TableCell>
                          <TableCell className="text-xs">
                            <span className="text-muted-foreground mr-1">#{s.taskId}</span>
                            {s.taskName}
                          </TableCell>
                          <TableCell>
                            <Badge className={difficultyColors[s.difficulty]} variant="outline">{s.difficulty}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{s.attemptsCount}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={s.coverageRate >= 80 ? "default" : s.coverageRate >= 50 ? "secondary" : "destructive"}>
                              {s.coverageRate}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{s.avgScore}%</TableCell>
                          <TableCell>
                            <TrendIndicator trend={s.trend} />
                          </TableCell>
                        </TableRow>
                        {expandedSkill === s.ecId && s.scoreProgression.length > 0 && (
                          <TableRow>
                            <TableCell colSpan={8} className="bg-muted/30 p-4">
                              <div className="text-xs text-muted-foreground mb-2">Прогрессия балла по времени</div>
                              <ResponsiveContainer width="100%" height={150}>
                                <LineChart data={s.scoreProgression}>
                                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                  <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                                  <YAxis domain={[0, 100]} className="text-xs" />
                                  <Tooltip />
                                  <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                                </LineChart>
                              </ResponsiveContainer>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bv">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Граничные значения</CardTitle>
                <CardDescription>
                  Покрытие каждого граничного значения с прогрессией по времени
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>BV</TableHead>
                      <TableHead>Задание</TableHead>
                      <TableHead>Сложность</TableHead>
                      <TableHead className="text-right">Попытки</TableHead>
                      <TableHead className="text-right">Покрытие</TableHead>
                      <TableHead className="text-right">Ср. балл</TableHead>
                      <TableHead>Тренд</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.bvSkills.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          Нет данных
                        </TableCell>
                      </TableRow>
                    )}
                    {data.bvSkills.map((s) => (
                      <>
                        <TableRow
                          key={s.bvDescription}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setExpandedSkill(expandedSkill === s.bvDescription ? null : s.bvDescription)}
                        >
                          <TableCell>
                            {expandedSkill === s.bvDescription
                              ? <ChevronDown className="h-4 w-4" />
                              : <ChevronRight className="h-4 w-4" />}
                          </TableCell>
                          <TableCell className="font-medium text-xs max-w-[200px] truncate">{s.bvDescription}</TableCell>
                          <TableCell className="text-xs">
                            <span className="text-muted-foreground mr-1">#{s.taskId}</span>
                            {s.taskName}
                          </TableCell>
                          <TableCell>
                            <Badge className={difficultyColors[s.difficulty]} variant="outline">{s.difficulty}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{s.attemptsCount}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={s.coverageRate >= 80 ? "default" : s.coverageRate >= 50 ? "secondary" : "destructive"}>
                              {s.coverageRate}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{s.avgScore}%</TableCell>
                          <TableCell>
                            <TrendIndicator trend={s.trend} />
                          </TableCell>
                        </TableRow>
                        {expandedSkill === s.bvDescription && s.scoreProgression.length > 0 && (
                          <TableRow>
                            <TableCell colSpan={8} className="bg-muted/30 p-4">
                              <div className="text-xs text-muted-foreground mb-2">Прогрессия балла по времени</div>
                              <ResponsiveContainer width="100%" height={150}>
                                <LineChart data={s.scoreProgression}>
                                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                  <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                                  <YAxis domain={[0, 100]} className="text-xs" />
                                  <Tooltip />
                                  <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                                </LineChart>
                              </ResponsiveContainer>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
