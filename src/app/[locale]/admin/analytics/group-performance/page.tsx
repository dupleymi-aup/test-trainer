"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useFetchData } from "@/hooks/use-fetch-data";
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
  const t = useTranslations("adminNav");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const { data: groupsData, loading, error } = useFetchData<{ groups: GroupData[] }>("/api/admin/analytics/group-performance");

  const groups = groupsData?.groups || [];

  if (loading) return <AdminLayout><div className="p-8 text-center">Loading...</div></AdminLayout>;
  if (error) return <AdminLayout><div className="p-8 text-center"><p className="text-destructive">Error: {error}</p></div></AdminLayout>;

  const toggleGroup = (groupName: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupName)) newExpanded.delete(groupName);
    else newExpanded.add(groupName);
    setExpandedGroups(newExpanded);
  };

  return (
    <AdminLayout>
      <div className="space-y-4">
        <h1 className="text-xl font-bold">{t("groupPerformance")}</h1>

        {groups.length === 0 && (
          <Card><CardContent className="p-8 text-center text-muted-foreground">{t("common.noResults")}</CardContent></Card>
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
                  <span>{group.studentCount} students</span>
                  <span>{group.totalAttempts} attempts</span>
                  <span className="text-emerald-600">{group.activeStudents} active</span>
                  <span className="text-rose-600">{group.inactiveStudents} inactive</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-2">
                <div>
                  <span className="text-xs text-muted-foreground">Avg. Best Score</span>
                  <p className="font-bold">{group.avgBestScore}%</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Avg. EC</span>
                  <Progress value={group.avgEc} className="h-1.5 mt-1" />
                  <span className="text-xs">{group.avgEc}%</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Avg. BV</span>
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
                        <span className="text-xs text-muted-foreground">{student.attemptsCount} attempts</span>
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
            <CardHeader><CardTitle className="text-sm">Group Comparison</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {groups.map((group) => (
                  <div key={group.groupName} className="p-3 border rounded">
                    <p className="font-bold mb-2">{group.groupName}</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Avg. Best:</span><span className="font-bold">{group.avgBestScore}%</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Avg. EC:</span><span>{group.avgEc}%</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Avg. BV:</span><span>{group.avgBv}%</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Active:</span><span>{group.activeStudents}/{group.studentCount}</span></div>
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
