"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronDown, ChevronUp, GitCompare } from "lucide-react";
import { PrintButton } from "@/components/admin/analytics/print-button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface GroupMetrics {
  avgScore: number;
  avgEc: number;
  avgBv: number;
  avgTime: number;
  attemptCount: number;
  studentCount: number;
}

interface GroupData {
  groupId: string;
  groupName: string;
  metrics: GroupMetrics;
  trend: "improving" | "declining" | "stable";
  students: Array<{ studentId: string; name: string; avgScore: number; attempts: number }>;
}

interface SignificanceData {
  groupA: string;
  groupB: string;
  t: number;
  significant: boolean;
  pApprox: number;
}

interface ComparisonData {
  groups: GroupData[];
  statisticalSignificance: SignificanceData[];
}

function TrendBadge({ trend }: { trend: string }) {
  const colors = { improving: "bg-emerald-100 text-emerald-700", declining: "bg-rose-100 text-rose-700", stable: "bg-gray-100 text-gray-700" };
  const labels = { improving: "Рост", declining: "Снижение", stable: "Стабильно" };
  return <Badge className={colors[trend as keyof typeof colors]}>{labels[trend as keyof typeof labels]}</Badge>;
}

function ScoreCell({ value, isBest }: { value: number; isBest: boolean }) {
  return (
    <span className={isBest ? "font-bold text-emerald-600" : ""}>
      <Badge variant={value >= 75 ? "default" : value >= 50 ? "secondary" : "destructive"}>{value}%</Badge>
    </span>
  );
}

export default function GroupComparisonPage() {
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const fetchData = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/analytics/group-comparison");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setData(await r.json());
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Find best values per metric for highlighting
  const bestValues = data?.groups.reduce(
    (acc, g) => ({
      avgScore: Math.max(acc.avgScore, g.metrics.avgScore),
      avgEc: Math.max(acc.avgEc, g.metrics.avgEc),
      avgBv: Math.max(acc.avgBv, g.metrics.avgBv),
    }),
    { avgScore: 0, avgEc: 0, avgBv: 0 }
  ) || { avgScore: 0, avgEc: 0, avgBv: 0 };

  const chartData = data?.groups.map((g) => ({
    name: g.groupName,
    "Ср. балл": g.metrics.avgScore,
    "EC": g.metrics.avgEc,
    "BV": g.metrics.avgBv,
  })) || [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/analytics">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Назад</Button>
          </Link>
          <h2 className="text-xl font-bold flex items-center gap-2"><GitCompare className="h-5 w-5" /> Сравнение групп</h2>
          <PrintButton label="Печать" />
        </div>

        {loading && <div className="text-center py-8">Загрузка...</div>}

        {!loading && !data && (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Нет данных</CardContent></Card>
        )}

        {!loading && data && (
          <>
            {/* Comparison Chart */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Сравнение метрик</CardTitle></CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis className="text-xs" domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Ср. балл" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="EC" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="BV" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Нет данных</p>
                )}
              </CardContent>
            </Card>

            {/* Comparison Table */}
            <Card>
              <CardHeader><CardTitle className="text-sm">Матрица сравления ({data.groups.length} групп)</CardTitle></CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-2 w-8"></th>
                      <th className="text-left p-2">Группа</th>
                      <th className="text-right p-2">Ср. балл</th>
                      <th className="text-right p-2">EC</th>
                      <th className="text-right p-2">BV</th>
                      <th className="text-right p-2">Ср. время</th>
                      <th className="text-right p-2">Попытки</th>
                      <th className="text-right p-2">Студенты</th>
                      <th className="text-right p-2">Тренд</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.groups.map((g) => {
                      const isExpanded = expandedGroups.has(g.groupId);
                      return (
                        <tr key={g.groupId} className="border-b hover:bg-muted/50">
                          <td className="p-2">
                            <button onClick={() => toggleGroup(g.groupId)} className="p-1 hover:bg-muted rounded">
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>
                          </td>
                          <td className="p-2 font-medium">{g.groupName}</td>
                          <td className="p-2 text-right"><ScoreCell value={g.metrics.avgScore} isBest={g.metrics.avgScore === bestValues.avgScore} /></td>
                          <td className="p-2 text-right"><ScoreCell value={g.metrics.avgEc} isBest={g.metrics.avgEc === bestValues.avgEc} /></td>
                          <td className="p-2 text-right"><ScoreCell value={g.metrics.avgBv} isBest={g.metrics.avgBv === bestValues.avgBv} /></td>
                          <td className="p-2 text-right">{Math.round(g.metrics.avgTime / 60)}м</td>
                          <td className="p-2 text-right">{g.metrics.attemptCount}</td>
                          <td className="p-2 text-right">{g.metrics.studentCount}</td>
                          <td className="p-2 text-right"><TrendBadge trend={g.trend} /></td>
                          {isExpanded && (
                            <tr>
                              <td colSpan={9} className="p-0">
                                <div className="bg-muted/30 p-3 ml-8">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="border-b">
                                        <th className="text-left p-1">Студент</th>
                                        <th className="text-right p-1">Ср. балл</th>
                                        <th className="text-right p-1">Попытки</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {g.students.map((s) => (
                                        <tr key={s.studentId} className="border-b">
                                          <td className="p-1">{s.name}</td>
                                          <td className="p-1 text-right">
                                            <Badge variant={s.avgScore >= 75 ? "default" : s.avgScore >= 50 ? "secondary" : "destructive"}>{s.avgScore}%</Badge>
                                          </td>
                                          <td className="p-1 text-right">{s.attempts}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Statistical Significance */}
            {data.statisticalSignificance.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-sm">Статистическая значимость (t-test)</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {data.statisticalSignificance.map((s, i) => (
                      <Badge key={i} variant={s.significant ? "default" : "secondary"}>
                        {s.groupA} vs {s.groupB}: t={s.t} (p {s.pApprox <= 0.05 ? "<" : ">"} 0.05) {s.significant ? "значимо" : "не значимо"}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
