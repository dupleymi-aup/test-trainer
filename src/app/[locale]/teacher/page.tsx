"use client";

import { TeacherLayout } from "@/components/teacher/teacher-layout";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, FileText, TrendingUp, Loader2 } from "lucide-react";
import Link from "next/link";
import { useSWRApi } from "@/hooks/use-swr-api";

interface Student {
  id: string;
  name: string | null;
  email: string | null;
  group: string | null;
  bestScore: number;
  avgEc: number;
  avgBv: number;
  attemptsCount: number;
  lastAttempt: string | null;
}

interface Group {
  id: string;
  name: string;
}

interface GroupsData {
  groups: Group[];
}

interface StudentsData {
  students: Student[];
}

export default function TeacherDashboardPage() {
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");

  // Fetch groups via SWR (cached across all teacher pages)
  const { data: groupsData, isLoading: groupsLoading } = useSWRApi<GroupsData>("/api/teacher/groups");

  // Set default group when data arrives
  const groups = groupsData?.groups || [];
  const effectiveGroupId = selectedGroupId || (groups.length > 0 ? groups[0].id : "");

  // Fetch students for selected group
  const { data: studentsData, isLoading: studentsLoading } = useSWRApi<StudentsData>(
    effectiveGroupId ? `/api/teacher/students?groupId=${encodeURIComponent(effectiveGroupId)}` : null
  );

  const students = studentsData?.students || [];
  const loading = groupsLoading || (effectiveGroupId && studentsLoading);

  if (loading) return <TeacherLayout><div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /><span className="ml-3 text-sm text-muted-foreground">Loading...</span></div></TeacherLayout>;

  const avgScore = students.length > 0 ? Math.round(students.reduce((s, st) => s + st.bestScore, 0) / students.length) : 0;

  return (
    <TeacherLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Select value={effectiveGroupId} onValueChange={setSelectedGroupId}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select group" />
            </SelectTrigger>
            <SelectContent>
              {groups.map((g) => (
                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Users className="h-8 w-8 text-blue-600 dark:text-blue-400" /><div><p className="text-2xl font-bold">{students.length}</p><p className="text-xs text-muted-foreground">Students</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><FileText className="h-8 w-8 text-emerald-600" /><div><p className="text-2xl font-bold">{avgScore}%</p><p className="text-xs text-muted-foreground">Average score</p></div></div></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><TrendingUp className="h-8 w-8 text-amber-600 dark:text-amber-400" /><div><p className="text-2xl font-bold">{students.filter((s) => s.bestScore >= 75).length}</p><p className="text-xs text-muted-foreground">Успешные (&ge;75%)</p></div></div></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-sm">Прогресс студентов</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {students.slice(0, 10).map((student) => (
                <Link key={student.id} href={`/teacher/students/${student.id}`}>
                  <div className="flex items-center gap-4 p-3 hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{student.name || student.email}</p>
                      {student.group && <p className="text-xs text-muted-foreground">{student.group}</p>}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-32">
                        <div className="flex justify-between text-xs mb-1">
                          <span>EC</span><span>{student.avgEc}%</span>
                        </div>
                        <Progress value={student.avgEc} className="h-1.5" />
                      </div>
                      <div className="w-32">
                        <div className="flex justify-between text-xs mb-1">
                          <span>BV</span><span>{student.avgBv}%</span>
                        </div>
                        <Progress value={student.avgBv} className="h-1.5" />
                      </div>
                      <Badge variant={student.bestScore >= 75 ? "default" : "secondary"}>{student.bestScore}%</Badge>
                      <span className="text-xs text-muted-foreground">{student.attemptsCount} попыток</span>
                    </div>
                  </div>
                </Link>
              ))}
              {students.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">Нет студентов</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </TeacherLayout>
  );
}
