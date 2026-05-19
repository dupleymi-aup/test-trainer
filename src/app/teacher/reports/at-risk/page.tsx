"use client";

import { TeacherLayout } from "@/components/teacher/teacher-layout";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingDown, Clock, UserX } from "lucide-react";
import Link from "next/link";
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/teacher/reports/at-risk")
      .then(async (r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data) => {
        setStudents(data.atRiskStudents || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <TeacherLayout>
        <div className="p-8 text-center">Загрузка...</div>
      </TeacherLayout>
    );

  return (
    <TeacherLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Студенты группы риска</h2>
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
                    <TableHead className="text-right">Лучший балл</TableHead>
                    <TableHead className="text-right">Попытки</TableHead>
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
