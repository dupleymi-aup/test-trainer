"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
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
import { Search, TrendingUp, Users, Target, FolderKanban } from "lucide-react";

interface GroupSummary {
  groupId: string;
  groupName: string;
  studentCount: number;
  tasksAttempted: number;
  avgScore: number;
  avgPassRate: number;
  avgDelta: number;
}

interface MatrixData {
  matrix: Array<{
    groupId: string;
    groupName: string;
    taskId: string;
    taskName: string;
    studentCount: number;
    attemptedCount: number;
    passedCount: number;
    avgScore: number;
    bestScore: number;
    platformAvg: number;
    delta: number;
    passRate: number;
  }>;
  groupSummary: GroupSummary[];
}

export default function GroupTaskMatrixPage() {
  const [data, setData] = useState<MatrixData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/analytics/group-task-matrix")
      .then(async (r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e instanceof Error ? e.message : String(e)); setLoading(false); });
  }, []);

  if (loading) return <AdminLayout><div className="p-8 text-center">Загрузка...</div></AdminLayout>;
  if (error && !loading) return <AdminLayout><Card><CardContent className="py-6 text-center"><p className="text-sm text-destructive">Ошибка загрузки: {error}</p></CardContent></Card></AdminLayout>;
  if (!data) return <AdminLayout><div className="p-8 text-center">Ошибка загрузки</div></AdminLayout>;

  const filteredMatrix = data.matrix.filter((m) => {
    const groupMatch = selectedGroup === "all" || m.groupId === selectedGroup;
    const searchMatch = !search || m.taskName.toLowerCase().includes(search.toLowerCase()) || m.groupName.toLowerCase().includes(search.toLowerCase());
    return groupMatch && searchMatch;
  }).slice(0, 100);

  const chartData = data.groupSummary.slice(0, 10).map((g) => ({
    name: g.groupName.length > 15 ? g.groupName.slice(0, 15) + "..." : g.groupName,
    avgScore: g.avgScore,
    passRate: g.avgPassRate,
  }));

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Сравнение групп по задачам</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Матрица группы × задания, сравнение со средним по платформе
            </p>
          </div>
          <PrintButton />
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1"><FolderKanban className="h-4 w-4 text-teal-600" /><span className="text-xs text-muted-foreground">Группы</span></div>
              <p className="text-2xl font-bold">{data.groupSummary.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1"><Target className="h-4 w-4 text-emerald-600" /><span className="text-xs text-muted-foreground">Ср. балл (лучшая)</span></div>
              <p className="text-2xl font-bold">{data.groupSummary[0]?.avgScore || 0}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1"><TrendingUp className="h-4 w-4 text-blue-600" /><span className="text-xs text-muted-foreground">Ср. проход (лучшая)</span></div>
              <p className="text-2xl font-bold">{data.groupSummary[0]?.avgPassRate || 0}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1"><Users className="h-4 w-4 text-purple-600" /><span className="text-xs text-muted-foreground">Δ от платформы (лучшая)</span></div>
              <p className={`text-2xl font-bold ${data.groupSummary[0]?.avgDelta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {data.groupSummary[0]?.avgDelta >= 0 ? "+" : ""}{data.groupSummary[0]?.avgDelta || 0}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Group comparison chart */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Сравнение групп: балл и проход</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis domain={[0, 100]} className="text-xs" />
                <Tooltip />
                <Legend />
                <Bar dataKey="avgScore" fill="hsl(var(--primary))" name="Ср. балл %" radius={[4, 4, 0, 0]} />
                <Bar dataKey="passRate" fill="#10b981" name="Проход %" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex gap-3 items-center">
          <div className="flex-1 max-w-xs">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Поиск группы или задачи..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
            </div>
          </div>
          <select
            className="border rounded-md px-3 py-2 text-sm"
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
          >
            <option value="all">Все группы</option>
            {data.groupSummary.map((g) => (
              <option key={g.groupId} value={g.groupId}>{g.groupName}</option>
            ))}
          </select>
        </div>

        {/* Matrix table */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Матрица групп × задания ({filteredMatrix.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Группа</TableHead>
                    <TableHead>Задание</TableHead>
                    <TableHead className="text-center">Попыток</TableHead>
                    <TableHead className="text-center">Прошли</TableHead>
                    <TableHead className="text-center">Ср. балл</TableHead>
                    <TableHead className="text-center">Лучший</TableHead>
                    <TableHead className="text-center">Платформа</TableHead>
                    <TableHead className="text-center">Δ</TableHead>
                    <TableHead className="text-center">Проход %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMatrix.map((m, _i) => (
                    <TableRow key={`${m.groupId}-${m.taskId}`}>
                      <TableCell className="font-medium">{m.groupName}</TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="truncate" title={m.taskName}>{m.taskName}</div>
                      </TableCell>
                      <TableCell className="text-center">{m.attemptedCount}/{m.studentCount}</TableCell>
                      <TableCell className="text-center">{m.passedCount}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={m.avgScore >= 75 ? "default" : m.avgScore >= 50 ? "secondary" : "destructive"}>{m.avgScore}%</Badge>
                      </TableCell>
                      <TableCell className="text-center">{m.bestScore}%</TableCell>
                      <TableCell className="text-center text-muted-foreground">{m.platformAvg}%</TableCell>
                      <TableCell className="text-center">
                        <span className={m.delta > 0 ? "text-emerald-600 font-bold" : m.delta < 0 ? "text-rose-600 font-bold" : "text-muted-foreground"}>
                          {m.delta > 0 ? "+" : ""}{m.delta}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <Progress value={m.passRate} className="w-12 h-2" />
                          <span className="text-xs font-bold">{m.passRate}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredMatrix.length === 0 && (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Нет данных</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Group summary */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Сводка по группам</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Группа</TableHead>
                  <TableHead className="text-center">Студенты</TableHead>
                  <TableHead className="text-center">Заданий</TableHead>
                  <TableHead className="text-center">Ср. балл</TableHead>
                  <TableHead className="text-center">Ср. проход</TableHead>
                  <TableHead className="text-center">Δ от платформы</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.groupSummary.map((g, i) => (
                  <TableRow key={g.groupId}>
                    <TableCell className="font-bold text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{g.groupName}</TableCell>
                    <TableCell className="text-center">{g.studentCount}</TableCell>
                    <TableCell className="text-center">{g.tasksAttempted}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={g.avgScore >= 75 ? "default" : g.avgScore >= 50 ? "secondary" : "destructive"}>{g.avgScore}%</Badge>
                    </TableCell>
                    <TableCell className="text-center">{g.avgPassRate}%</TableCell>
                    <TableCell className="text-center">
                      <span className={g.avgDelta >= 0 ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
                        {g.avgDelta >= 0 ? "+" : ""}{g.avgDelta}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
