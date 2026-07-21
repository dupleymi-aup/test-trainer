"use client";

import { TeacherLayout } from "@/components/teacher/teacher-layout";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { logger } from "@/lib/logger";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Task {
  taskId: string;
  taskName: string;
  difficulty: string;
}

interface MatrixCell {
  bestScore: number;
  attemptsCount: number;
  lastAttempt: string;
}

interface MatrixData {
  students: Array<{ id: string; name: string | null; email: string | null }>;
  tasks: Task[];
  matrix: Record<string, Record<string, MatrixCell>>;
}

const difficultyColors: Record<string, string> = {
  Легко: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  Средне: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  Сложно: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400",
};

export default function CompletionMatrixPage() {
  const [groups, setGroups] = useState<Array<{ id: string; name: string }>>(
    []
  );
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [data, setData] = useState<MatrixData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/teacher/groups", { signal: controller.signal })
      .then(async (r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d) => { if (!controller.signal.aborted) setGroups(d.groups || []); })
      .catch((err) => {
        if (!controller.signal.aborted) logger.warn("Failed to fetch groups", { error: err instanceof Error ? err.message : String(err) });
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!selectedGroup) {
      setData(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/teacher/reports/completion-matrix?groupId=${selectedGroup}`, { signal: controller.signal })
      .then(async (r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d) => { if (!controller.signal.aborted) { setData(d); setLoading(false); } })
      .catch((err) => { if (!controller.signal.aborted) { logger.error("Failed to load completion matrix", err); setLoading(false); } });
    return () => controller.abort();
  }, [selectedGroup]);

  const getScoreBadge = (cell: MatrixCell | undefined) => {
    if (!cell) {
      return <span className="text-muted-foreground">—</span>;
    }
    const variant =
      cell.bestScore >= 75
        ? "default"
        : cell.bestScore >= 50
        ? "secondary"
        : "destructive";
    return (
      <div className="text-center">
        <Badge variant={variant} className="text-xs">
          {cell.bestScore}%
        </Badge>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {cell.attemptsCount} поп.
        </p>
      </div>
    );
  };

  return (
    <TeacherLayout>
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Матрица выполнения заданий</h2>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Выберите группу</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder="Select group" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {loading && (
          <div className="p-8 text-center">Loading...</div>
        )}

        {!loading && data && data.students.length > 0 && (
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">
                      Студент
                    </TableHead>
                    {data.tasks.map((task) => (
                      <TableHead key={task.taskId} className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-xs font-mono">
                            {task.taskId}
                          </span>
                          <Badge
                            variant="outline"
                            className={difficultyColors[task.difficulty] || ""}
                          >
                            {task.difficulty}
                          </Badge>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="sticky left-0 bg-background z-10 font-medium">
                        {student.name || student.email}
                      </TableCell>
                      {data.tasks.map((task) => (
                        <TableCell key={task.taskId} className="text-center">
                          {getScoreBadge(
                            data.matrix[student.id]?.[task.taskId]
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {!loading && data && data.students.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              В выбранной группе нет студентов
            </CardContent>
          </Card>
        )}

        {!loading && !data && !selectedGroup && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Выберите группу для отображения матрицы выполнения
            </CardContent>
          </Card>
        )}

        {/* Legend */}
        {data && data.students.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-xs">
                    75%+
                  </Badge>
                  <span className="text-muted-foreground">Отлично</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    50-74%
                  </Badge>
                  <span className="text-muted-foreground">Хорошо</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="text-xs">
                    &lt;50%
                  </Badge>
                  <span className="text-muted-foreground">Нуждается в улучшении</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">—</span>
                  <span className="text-muted-foreground">Не выполнено</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TeacherLayout>
  );
}
