"use client";

import { TeacherLayout } from "@/components/teacher/teacher-layout";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, TrendingDown, Clock, UserX, Loader2 } from "lucide-react";
import Link from "next/link";
import { logger } from "@/lib/logger";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AtRiskStudent {
  student: {
    id: string;
    name: string | null;
    email: string | null;
    group: string | null;
  };
  riskFactors: string[];
  stats: {
    bestScore: number;
    avgScore: number;
    lastAttemptDate: string | null;
    attemptsCount: number;
    trend: number;
  };
  recommendation: string;
}

interface Group {
  id: string;
  name: string;
}

const riskFactorConfig: Record<
  string,
  { label: string; icon: React.ReactNode; color: string }
> = {
  low_performer: {
    label: "Низкий балл",
    icon: <AlertTriangle className="h-3 w-3" />,
    color: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400",
  },
  declining: {
    label: "Снижение",
    icon: <TrendingDown className="h-3 w-3" />,
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  },
  inactive: {
    label: "Неактивен",
    icon: <Clock className="h-3 w-3" />,
    color:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  low_engagement: {
    label: "Мало попыток",
    icon: <UserX className="h-3 w-3" />,
    color:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  },
};

export default function AtRiskStudentsPage() {
  const [students, setStudents] = useState<AtRiskStudent[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/teacher/groups", { signal: controller.signal })
      .then(async (r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data) => { if (!controller.signal.aborted) { setGroups(data.groups || []); if (data.groups?.length > 0) setSelectedGroupId(data.groups[0].id); } })
      .catch((err) => { if (!controller.signal.aborted) logger.error("Failed to load groups for at-risk", err); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!selectedGroupId) { setLoading(false); return; }
    setLoading(true);
    const controller = new AbortController();
    fetch(`/api/teacher/reports/at-risk?groupId=${encodeURIComponent(selectedGroupId)}`, { signal: controller.signal })
      .then(async (r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data) => {
        if (!controller.signal.aborted) {
          setStudents(data.atRiskStudents || []);
          setLoading(false);
        }
      })
      .catch((err) => { if (!controller.signal.aborted) { logger.error("Failed to load at-risk data", err); setLoading(false); } });
    return () => controller.abort();
  }, [selectedGroupId]);

  if (loading)
    return (
      <TeacherLayout>
        <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      </TeacherLayout>
    );

  return (
    <TeacherLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold">Студенты группы риска</h2>
            <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
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
          <Badge variant="destructive">{students.length} студентов</Badge>
        </div>

        {students.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-emerald-600" />
              <p className="text-muted-foreground">
                Все студенты показывают хорошие результаты!
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Студент</TableHead>
                    <TableHead>Факторы риска</TableHead>
                    <TableHead className="text-right">Best score</TableHead>
                    <TableHead className="text-right">Attempts</TableHead>
                    <TableHead>Рекомендации</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.student.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {student.student.name || student.student.email}
                          </p>
                          {student.student.group && (
                            <p className="text-xs text-muted-foreground">
                              {student.student.group}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {student.riskFactors.map((factor) => {
                            const config = riskFactorConfig[factor];
                            return (
                              <Badge
                                key={factor}
                                variant="outline"
                                className={config.color}
                              >
                                {config.icon}
                                <span className="ml-1">{config.label}</span>
                              </Badge>
                            );
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            student.stats.bestScore >= 75
                              ? "default"
                              : student.stats.bestScore >= 50
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {student.stats.bestScore}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {student.stats.attemptsCount}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {student.recommendation}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/teacher/students/${student.student.id}`}
                          className="text-xs text-primary hover:underline"
                        >
                          Подробнее
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </TeacherLayout>
  );
}
