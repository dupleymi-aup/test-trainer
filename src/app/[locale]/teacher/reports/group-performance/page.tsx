"use client";

import { TeacherLayout } from "@/components/teacher/teacher-layout";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronRight, TrendingUp, TrendingDown, Minus, Loader2 } from "lucide-react";
import Link from "next/link";
import { logger } from "@/lib/logger";

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

interface Group {
  id: string;
  name: string;
}

export default function GroupPerformancePage() {
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [teacherGroups, setTeacherGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/teacher/groups", { signal: controller.signal })
      .then(async (r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data) => { if (!controller.signal.aborted) { setTeacherGroups(data.groups || []); if (data.groups?.length > 0) setSelectedGroupId(data.groups[0].id); } })
      .catch((err) => { if (!controller.signal.aborted) logger.error("Failed to load groups for performance", err); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!selectedGroupId) { setLoading(false); return; }
    setLoading(true);
    const controller = new AbortController();
    fetch(`/api/teacher/reports/group-performance?groupId=${encodeURIComponent(selectedGroupId)}`, { signal: controller.signal })
      .then(async (r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data) => {
        if (!controller.signal.aborted) {
          setGroups(data.groups || []);
          setLoading(false);
        }
      })
      .catch((err) => { if (!controller.signal.aborted) { logger.error("Failed to load group performance data", err); setLoading(false); } });
    return () => controller.abort();
  }, [selectedGroupId]);

  const toggleGroup = (groupName: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupName)) {
      newExpanded.delete(groupName);
    } else {
      newExpanded.add(groupName);
    }
    setExpandedGroups(newExpanded);
  };

  const getTrendIcon = (trend: string) => {
    if (trend === "improving")
      return <TrendingUp className="h-4 w-4 text-emerald-600" />;
    if (trend === "declining")
      return <TrendingDown className="h-4 w-4 text-rose-600" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getTrendLabel = (trend: string) => {
    if (trend === "improving") return "Улучшается";
    if (trend === "declining") return "Снижается";
    return "Стабильно";
  };

  if (loading)
    return (
      <TeacherLayout>
        <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      </TeacherLayout>
    );

  return (
    <TeacherLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold">Прогресс по группам</h2>
          <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select group" />
            </SelectTrigger>
            <SelectContent>
              {teacherGroups.map((g) => (
                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {groups.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No data о студентах
            </CardContent>
          </Card>
        )}

        {groups.map((group) => (
          <Card key={group.groupName}>
            <CardHeader
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => toggleGroup(group.groupName)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {expandedGroups.has(group.groupName) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <CardTitle className="text-sm">{group.groupName}</CardTitle>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>{group.studentCount} студ.</span>
                  <span>{group.totalAttempts} попыток</span>
                  <span className="text-emerald-600">
                    {group.activeStudents} актив.
                  </span>
                  <span className="text-rose-600">
                    {group.inactiveStudents} неактив.
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-2">
                <div>
                  <span className="text-xs text-muted-foreground">
                    Ср. лучший балл
                  </span>
                  <p className="font-bold">{group.avgBestScore}%</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">
                    Ср. EC
                  </span>
                  <Progress value={group.avgEc} className="h-1.5 mt-1" />
                  <span className="text-xs">{group.avgEc}%</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">
                    Ср. BV
                  </span>
                  <Progress value={group.avgBv} className="h-1.5 mt-1" />
                  <span className="text-xs">{group.avgBv}%</span>
                </div>
              </div>
            </CardHeader>

            {expandedGroups.has(group.groupName) && (
              <CardContent className="p-0">
                <div className="divide-y">
                  {group.students.map((student) => (
                    <Link
                      key={student.id}
                      href={`/teacher/students/${student.id}`}
                      className="flex items-center gap-4 p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {student.name || student.email}
                        </p>
                        {student.university && (
                          <p className="text-xs text-muted-foreground">
                            {student.university}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {getTrendIcon(student.trend)}
                        <span className="text-xs text-muted-foreground">
                          {getTrendLabel(student.trend)}
                        </span>
                        <Badge
                          variant={
                            student.bestScore >= 75
                              ? "default"
                              : student.bestScore >= 50
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {student.bestScore}%
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {student.attemptsCount} попыток
                        </span>
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
            <CardHeader>
              <CardTitle className="text-sm">Сравнение групп</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {groups.map((group) => (
                  <div key={group.groupName} className="p-3 border rounded">
                    <p className="font-bold mb-2">{group.groupName}</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Ср. лучший:
                        </span>
                        <span className="font-bold">{group.avgBestScore}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Ср. EC:</span>
                        <span>{group.avgEc}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Ср. BV:</span>
                        <span>{group.avgBv}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Активные:</span>
                        <span>
                          {group.activeStudents}/{group.studentCount}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TeacherLayout>
  );
}
