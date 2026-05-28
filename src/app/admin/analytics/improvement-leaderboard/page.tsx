"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ScoreBadge } from "@/components/admin/analytics/score-badge";
import { TrendingUp, Trophy } from "lucide-react";

interface ImprovementData {
  studentImprovement: { studentId: string; name: string; group: string | null; university: string | null; firstAvg: number; lastAvg: number; scoreDelta: number; percentChange: number; attemptsCount: number }[];
  groupImprovement: { groupName: string; avgDelta: number; studentCount: number }[];
  universityImprovement: { university: string; avgDelta: number; studentCount: number }[];
}

export default function ImprovementLeaderboardPage() {
  const [data, setData] = useState<ImprovementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/analytics/improvement-leaderboard")
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      }).then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e instanceof Error ? e.message : String(e)); setLoading(false); });
  }, []);

  if (loading) return <AdminLayout><div className="p-8 text-center">Загрузка...</div></AdminLayout>;
  if (error && !loading) return <AdminLayout><Card><CardContent className="py-6 text-center"><p className="text-sm text-destructive">Ошибка загрузки: {error}</p></CardContent></Card></AdminLayout>;
  if (!data) return <AdminLayout><div className="p-8 text-center text-rose-600">Нет данных</div></AdminLayout>;

  const improving = data.studentImprovement.filter((s) => s.scoreDelta > 0).length;
  const declining = data.studentImprovement.filter((s) => s.scoreDelta < 0).length;
  const avgDelta = Math.round(data.studentImprovement.reduce((s, i) => s + i.scoreDelta, 0) / Math.max(1, data.studentImprovement.length));

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-xl font-bold">Лидеры улучшений</h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Всего студентов</div><div className="text-2xl font-bold">{data.studentImprovement.length}</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Улучшают</div><div className="text-2xl font-bold text-emerald-600 flex items-center gap-1"><TrendingUp className="h-5 w-5" />{improving}</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Снижают</div><div className="text-2xl font-bold text-rose-600">{declining}</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-xs text-muted-foreground">Ср. дельта</div><div className={`text-2xl font-bold ${avgDelta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{avgDelta >= 0 ? "+" : ""}{avgDelta}</div></CardContent></Card>
        </div>

        {/* Top students */}
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-500" /> Топ улучшений по студентам</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead className="w-10">#</TableHead><TableHead>Студент</TableHead><TableHead>Группа</TableHead><TableHead className="text-right">Было</TableHead><TableHead className="text-right">Стало</TableHead><TableHead className="text-right">Дельта</TableHead><TableHead className="text-right">% изм.</TableHead><TableHead className="text-right">Попытки</TableHead></TableRow></TableHeader>
              <TableBody>
                {data.studentImprovement.slice(0, 20).map((s, i) => (
                  <TableRow key={s.studentId}>
                    <TableCell className="font-bold">{i + 1}</TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-sm">{s.group || "—"}</TableCell>
                    <TableCell className="text-right"><ScoreBadge score={s.firstAvg} size="sm" /></TableCell>
                    <TableCell className="text-right"><ScoreBadge score={s.lastAvg} size="sm" /></TableCell>
                    <TableCell className="text-right"><span className={`font-bold ${s.scoreDelta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{s.scoreDelta >= 0 ? "+" : ""}{s.scoreDelta}</span></TableCell>
                    <TableCell className="text-right"><span className={`text-sm ${s.percentChange >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{s.percentChange >= 0 ? "+" : ""}{s.percentChange}%</span></TableCell>
                    <TableCell className="text-right text-sm">{s.attemptsCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Group improvement */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Улучшения по группам</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {data.groupImprovement.map((g) => (
                <div key={g.groupName} className="flex items-center gap-3">
                  <span className="text-sm font-medium flex-1">{g.groupName}</span>
                  <span className="text-xs text-muted-foreground">{g.studentCount} студ.</span>
                  <span className={`font-bold text-sm ${g.avgDelta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{g.avgDelta >= 0 ? "+" : ""}{g.avgDelta}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* University improvement */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Улучшения по университетам</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {data.universityImprovement.map((u) => (
                <div key={u.university} className="flex items-center gap-3">
                  <span className="text-sm font-medium flex-1">{u.university || "Не указан"}</span>
                  <span className="text-xs text-muted-foreground">{u.studentCount} студ.</span>
                  <span className={`font-bold text-sm ${u.avgDelta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{u.avgDelta >= 0 ? "+" : ""}{u.avgDelta}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
