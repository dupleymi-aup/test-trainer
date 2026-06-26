"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { ScoreBadge } from "@/components/admin/analytics/score-badge";
import { TrendIndicator } from "@/components/admin/analytics/trend-indicator";

interface Student {
  id: string;
  name: string | null;
  email: string | null;
  group: string | null;
  university: string | null;
  bestScore: number;
  avgScore: number;
  avgEc: number;
  avgBv: number;
  attemptsCount: number;
  lastAttemptDate: string | null;
  trend: "improving" | "stable" | "declining";
}

interface GroupData {
  groupName: string;
  studentCount: number;
  avgBestScore: number;
  avgEc: number;
  avgBv: number;
  totalAttempts: number;
  activeStudents: number;
  inactiveStudents: number;
  students: Student[];
}

export default function AdminGroupPerformancePage() {
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/analytics/group-performance", { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => { setGroups(data.groups || []); setLoading(false); })
      .catch((e) => { if (controller.signal.aborted) return; setError(e instanceof Error ? e.message : "Unknown error"); setLoading(false); });
    return () => controller.abort();
  }, []);

  const toggleGroup = (groupName: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupName)) newExpanded.delete(groupName);
    else newExpanded.add(groupName);
    setExpandedGroups(newExpanded);
  };

  if (loading) return <AdminLayout><div className="p-8 text-center">Загрузка...</div></AdminLayout>;
  if (error) return <AdminLayout><div className="p-8 text-center"><p className="text-destructive">Ошибка: {error}</p></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-4">
        <h1 className="text-xl font-bold">Успеваемость групп</h1>

        {groups.length === 0 && (
          <Card><CardContent className="p-8 text-center text-muted-foreground">Нет данных о студентах</CardContent></Card>
        )}

        {groups.map((group) => (
          <Card key={group.groupName}>
            <CardHeader className="cursor-pointer hover:bg-muted/50" onClick={() => toggleGroup(group.groupName)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {expandedGroups.has(group.groupName) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <CardTitle className="text-sm">{group.groupName}</CardTitle>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>{group.studentCount} студ.</span>
                  <span>{group.totalAttempts} попыток</span>
                  <span className="text-emerald-600">{group.activeStudents} актив.</span>
                  <span className="text-rose-600">{group.inactiveStudents} неактив.</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-2">
                <div>
                  <span className="text-xs text-muted-foreground">Ср. лучший балл</span>
                  <p className="font-bold">{group.avgBestScore}%</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Ср. EC</span>
                  <Progress value={group.avgEc} className="h-1.5 mt-1" />
                  <span className="text-xs">{group.avgEc}%</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Ср. BV</span>
                  <Progress value={group.avgBv} className="h-1.5 mt-1" />
                  <span className="text-xs">{group.avgBv}%</span>
                </div>
              </div>
            </CardHeader>

            {expandedGroups.has(group.groupName) && (
              <CardContent className="p-0">
                <div className="divide-y">
                  {group.students.map((student) => (
                    <Link key={student.id} href={`/admin/analytics/student/${student.id}`} className="flex items-center gap-4 p-3 hover:bg-muted/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{student.name || student.email}</p>
                        {student.university && <p className="text-xs text-muted-foreground">{student.university}</p>}
                      </div>
                      <div className="flex items-center gap-3">
                        <TrendIndicator trend={student.trend} compact />
                        <ScoreBadge score={student.bestScore} />
                        <span className="text-xs text-muted-foreground">{student.attemptsCount} попыток</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        ))}

        {groups.length > 1 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Сравнение групп</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {groups.map((group) => (
                  <div key={group.groupName} className="p-3 border rounded">
                    <p className="font-bold mb-2">{group.groupName}</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Ср. лучший:</span><span className="font-bold">{group.avgBestScore}%</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Ср. EC:</span><span>{group.avgEc}%</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Ср. BV:</span><span>{group.avgBv}%</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Активные:</span><span>{group.activeStudents}/{group.studentCount}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
