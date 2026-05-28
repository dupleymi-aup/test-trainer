"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowUpDown } from "lucide-react";
import { PrintButton } from "@/components/admin/analytics/print-button";

interface PerformanceDashboardData {
  students: Array<{
    studentId: string;
    name: string;
    group: string;
    university: string;
    registeredAt: string;
    metrics: {
      avgScore: number; bestScore: number; avgEc: number; avgBv: number;
      totalAttempts: number; attemptsLast7Days: number; lastAttemptDate: string | null;
      trend: string; riskLevel: string; riskScore: number;
    };
  }>;
  summary: { totalStudents: number; avgScore: number; highRisk: number; mediumRisk: number; lowRisk: number; activeLast7Days: number; inactive: number };
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

function RiskBadge({ level }: { level: string }) {
  const colors = { high: "bg-rose-100 text-rose-700", medium: "bg-amber-100 text-amber-700", low: "bg-emerald-100 text-emerald-700" };
  const labels = { high: "Высокий", medium: "Средний", low: "Низкий" };
  return <Badge className={colors[level as keyof typeof colors]}>{labels[level as keyof typeof labels]}</Badge>;
}

function TrendBadge({ trend }: { trend: string }) {
  const colors = { improving: "bg-emerald-100 text-emerald-700", declining: "bg-rose-100 text-rose-700", stable: "bg-gray-100 text-gray-700" };
  const labels = { improving: "Рост", declining: "Снижение", stable: "Стабильно" };
  return <Badge className={colors[trend as keyof typeof colors]}>{labels[trend as keyof typeof labels]}</Badge>;
}

export default function PerformanceDashboardPage() {
  const [data, setData] = useState<PerformanceDashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("avgScore");
  const [sortOrder, setSortOrder] = useState("desc");
  const [search, setSearch] = useState("");
  const [filterRisk, setFilterRisk] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), limit: "50", sortBy, sortOrder });
    if (search) params.set("search", search);
    if (filterRisk) params.set("riskLevel", filterRisk);
    try {
      const r = await fetch(`/api/admin/analytics/performance-dashboard?${params.toString()}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setData(await r.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [page, sortBy, sortOrder]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/analytics">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Назад</Button>
          </Link>
          <h1 className="text-xl font-bold">Успеваемость студентов</h1>
          <PrintButton label="Печать" />
        </div>

        {loading && <div className="text-center py-8">Загрузка...</div>}

        {error && !loading && (
          <Card><CardContent className="py-6 text-center"><p className="text-sm text-destructive">Ошибка загрузки: {error}</p></CardContent></Card>
        )}

        {!loading && !data && (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Нет данных</CardContent></Card>
        )}

        {!loading && data && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Всего</div><div className="text-2xl font-bold">{data.summary.totalStudents}</div></CardContent></Card>
              <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Ср. балл</div><div className="text-2xl font-bold">{data.summary.avgScore}%</div></CardContent></Card>
              <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground text-emerald-600">Низкий риск</div><div className="text-2xl font-bold text-emerald-600">{data.summary.lowRisk}</div></CardContent></Card>
              <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground text-amber-600">Средний риск</div><div className="text-2xl font-bold text-amber-600">{data.summary.mediumRisk}</div></CardContent></Card>
              <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground text-rose-600">Высокий риск</div><div className="text-2xl font-bold text-rose-600">{data.summary.highRisk}</div></CardContent></Card>
              <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground text-blue-600">Активные (7д)</div><div className="text-2xl font-bold text-blue-600">{data.summary.activeLast7Days}</div></CardContent></Card>
              <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground dark:text-zinc-400">Неактивные</div><div className="text-2xl font-bold dark:text-zinc-300">{data.summary.inactive}</div></CardContent></Card>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Поиск по имени/email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 border rounded px-3 py-2 text-sm"
              />
              <Button onClick={fetchData}>Найти</Button>
              <Button variant="outline" onClick={() => { setSearch(""); setFilterRisk(""); }}>Сброс</Button>
            </div>

            {/* Table */}
            <Card>
              <CardContent className="p-0">
                <div className="max-h-[600px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-background z-10">
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-2">
                          <button onClick={() => handleSort("name")} className="flex items-center gap-1">Студент <ArrowUpDown className="h-3 w-3" /></button>
                        </th>
                        <th className="text-left p-2">Группа</th>
                        <th className="text-right p-2">
                          <button onClick={() => handleSort("avgScore")} className="flex items-center gap-1 ml-auto">Ср. балл <ArrowUpDown className="h-3 w-3" /></button>
                        </th>
                        <th className="text-right p-2">
                          <button onClick={() => handleSort("bestScore")} className="flex items-center gap-1 ml-auto">Лучший <ArrowUpDown className="h-3 w-3" /></button>
                        </th>
                        <th className="text-right p-2">
                          <button onClick={() => handleSort("avgEc")} className="flex items-center gap-1 ml-auto">EC <ArrowUpDown className="h-3 w-3" /></button>
                        </th>
                        <th className="text-right p-2">
                          <button onClick={() => handleSort("avgBv")} className="flex items-center gap-1 ml-auto">BV <ArrowUpDown className="h-3 w-3" /></button>
                        </th>
                        <th className="text-right p-2">
                          <button onClick={() => handleSort("totalAttempts")} className="flex items-center gap-1 ml-auto">Попытки <ArrowUpDown className="h-3 w-3" /></button>
                        </th>
                        <th className="text-right p-2">
                          <button onClick={() => handleSort("attemptsLast7Days")} className="flex items-center gap-1 ml-auto">7 дней <ArrowUpDown className="h-3 w-3" /></button>
                        </th>
                        <th className="text-right p-2">Тренд</th>
                        <th className="text-right p-2">Риск</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.students.map((s) => (
                        <tr key={s.studentId} className="border-b hover:bg-muted/50">
                          <td className="p-2 font-medium">
                            <Link href={`/admin/analytics/student/${s.studentId}`} className="text-primary hover:underline">{s.name}</Link>
                          </td>
                          <td className="p-2 text-sm">{s.group}</td>
                          <td className="p-2 text-right">
                            <Badge variant={s.metrics.avgScore >= 75 ? "default" : s.metrics.avgScore >= 50 ? "secondary" : "destructive"}>{s.metrics.avgScore}%</Badge>
                          </td>
                          <td className="p-2 text-right">{s.metrics.bestScore}%</td>
                          <td className="p-2 text-right">{s.metrics.avgEc}%</td>
                          <td className="p-2 text-right">{s.metrics.avgBv}%</td>
                          <td className="p-2 text-right">{s.metrics.totalAttempts}</td>
                          <td className="p-2 text-right">{s.metrics.attemptsLast7Days}</td>
                          <td className="p-2 text-right"><TrendBadge trend={s.metrics.trend} /></td>
                          <td className="p-2 text-right"><RiskBadge level={s.metrics.riskLevel} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Pagination */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Показано {((page - 1) * 50) + 1}–{Math.min(page * 50, data.pagination.total)} из {data.pagination.total}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page <= 1}>Предыдущая</Button>
                <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page >= data.pagination.total}>Следующая</Button>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
