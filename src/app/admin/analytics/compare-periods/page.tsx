"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrendingUp, TrendingDown, Minus, Calendar } from "lucide-react";
import { PeriodSelector } from "@/components/admin/analytics/period-selector";

interface ComparisonData {
  period1: { start: string; end: string };
  period2: { start: string; end: string };
  period1Metrics: {
    totalAttempts: number;
    uniqueStudents: number;
    avgScore: number;
    avgEc: number;
    avgBv: number;
    avgCorrectness: number;
    avgTime: number;
    taskPerformance: Array<{ taskId: string; avgScore: number; attemptsCount: number }>;
    topicPerformance: Array<{ topic: string; avgScore: number }>;
    universityBreakdown: Record<string, { attempts: number; avgScore: number }>;
  };
  period2Metrics: {
    totalAttempts: number;
    uniqueStudents: number;
    avgScore: number;
    avgEc: number;
    avgBv: number;
    avgCorrectness: number;
    avgTime: number;
    taskPerformance: Array<{ taskId: string; avgScore: number; attemptsCount: number }>;
    topicPerformance: Array<{ topic: string; avgScore: number }>;
    universityBreakdown: Record<string, { attempts: number; avgScore: number }>;
  };
  comparison: {
    attempts: { period1: number; period2: number; change: number };
    students: { period1: number; period2: number; change: number };
    avgScore: { period1: number; period2: number; change: number };
    avgEc: { period1: number; period2: number; change: number };
    avgBv: { period1: number; period2: number; change: number };
  };
}

export default function ComparePeriodsPage() {
  const [groups, setGroups] = useState<Array<{ id: string; name: string }>>([]);
  const [universities, setUniversities] = useState<string[]>([]);
  const [groupId, setGroupId] = useState("");
  const [university, setUniversity] = useState("");
  const [period1Start, setPeriod1Start] = useState("");
  const [period1End, setPeriod1End] = useState("");
  const [period2Start, setPeriod2Start] = useState("");
  const [period2End, setPeriod2End] = useState("");
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/groups")
      .then((r) => r.json())
      .then((d) => setGroups(d.groups || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (data?.period2Metrics?.universityBreakdown) {
      const unis = Object.keys(data.period2Metrics.universityBreakdown);
      setUniversities([...new Set(unis)].filter(Boolean));
    }
  }, [data]);

  const handleCompare = () => {
    if (!period1Start || !period1End || !period2Start || !period2End) return;

    setLoading(true);
    const params = new URLSearchParams({ period1Start, period1End, period2Start, period2End });
    if (groupId) params.set("groupId", groupId);
    if (university) params.set("university", university);

    fetch(`/api/admin/analytics/compare-periods?${params}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const ChangeIndicator = ({ value, isPoints = false }: { value: number; isPoints?: boolean }) => {
    if (value > 0)
      return (
        <span className="text-emerald-600 flex items-center gap-1">
          <TrendingUp className="h-3 w-3" /> +{value}{isPoints ? " пп" : "%"}
        </span>
      );
    if (value < 0)
      return (
        <span className="text-rose-600 flex items-center gap-1">
          <TrendingDown className="h-3 w-3" /> {value}{isPoints ? " пп" : "%"}
        </span>
      );
    return (
      <span className="text-muted-foreground flex items-center gap-1">
        <Minus className="h-3 w-3" /> 0{isPoints ? " пп" : "%"}
      </span>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h2 className="text-xl font-bold">Сравнение периодов</h2>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Параметры сравнения
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Группа</label>
                <Select value={groupId} onValueChange={setGroupId}>
                  <SelectTrigger><SelectValue placeholder="Все группы" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Все группы</SelectItem>
                    {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {universities.length > 0 && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Университет</label>
                  <Select value={university} onValueChange={setUniversity}>
                    <SelectTrigger><SelectValue placeholder="Все университеты" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Все университеты</SelectItem>
                      {universities.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <PeriodSelector
              period1Start={period1Start} period1End={period1End}
              period2Start={period2Start} period2End={period2End}
              onPeriod1StartChange={setPeriod1Start} onPeriod1EndChange={setPeriod1End}
              onPeriod2StartChange={setPeriod2Start} onPeriod2EndChange={setPeriod2End}
              onCompare={handleCompare} loading={loading}
            />
          </CardContent>
        </Card>

        {loading && <div className="p-8 text-center">Загрузка...</div>}

        {data && data.comparison && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Попытки</p>
                  <p className="text-lg font-bold">{data.comparison.attempts.period1} → {data.comparison.attempts.period2}</p>
                  <ChangeIndicator value={data.comparison.attempts.change} />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Студенты</p>
                  <p className="text-lg font-bold">{data.comparison.students.period1} → {data.comparison.students.period2}</p>
                  <ChangeIndicator value={data.comparison.students.change} />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Ср. балл</p>
                  <p className="text-lg font-bold">{data.comparison.avgScore.period1}% → {data.comparison.avgScore.period2}%</p>
                  <ChangeIndicator value={data.comparison.avgScore.change} isPoints />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Ср. EC</p>
                  <p className="text-lg font-bold">{data.comparison.avgEc.period1}% → {data.comparison.avgEc.period2}%</p>
                  <ChangeIndicator value={data.comparison.avgEc.change} isPoints />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Ср. BV</p>
                  <p className="text-lg font-bold">{data.comparison.avgBv.period1}% → {data.comparison.avgBv.period2}%</p>
                  <ChangeIndicator value={data.comparison.avgBv.change} isPoints />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Сравнение по темам (период 2)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.period2Metrics.topicPerformance.sort((a, b) => b.avgScore - a.avgScore).slice(0, 8).map((topic) => {
                    const period1Topic = data.period1Metrics.topicPerformance.find((t) => t.topic === topic.topic);
                    const change = period1Topic ? topic.avgScore - period1Topic.avgScore : 0;
                    return (
                      <div key={topic.topic} className="flex items-center gap-3">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{topic.topic}</p>
                          <Progress value={topic.avgScore} className="h-2 mt-1" />
                        </div>
                        <span className="text-sm font-bold w-12 text-right">{topic.avgScore}%</span>
                        <span className={`text-xs w-16 text-right ${change >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {change >= 0 ? "+" : ""}{change} пп
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Выполнение заданий (период 2)</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Задание</TableHead>
                      <TableHead className="text-right">Ср. балл</TableHead>
                      <TableHead className="text-right">Попытки</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.period2Metrics.taskPerformance.sort((a, b) => b.avgScore - a.avgScore).map((task) => {
                      const period1Task = data.period1Metrics.taskPerformance.find((t) => t.taskId === task.taskId);
                      const change = period1Task ? task.avgScore - period1Task.avgScore : 0;
                      return (
                        <TableRow key={task.taskId}>
                          <TableCell className="font-mono">{task.taskId}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Badge variant={task.avgScore >= 75 ? "default" : task.avgScore >= 50 ? "secondary" : "destructive"}>
                                {task.avgScore}%
                              </Badge>
                              <span className={`text-xs ${change >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                {change >= 0 ? "+" : ""}{change}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{task.attemptsCount}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
