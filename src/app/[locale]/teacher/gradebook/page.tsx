"use client";

import { TeacherLayout } from "@/components/teacher/teacher-layout";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { BookOpen, Loader2, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { tasks } from "@/lib/tasks";
import { logClientError } from "@/lib/logger";

interface Student {
  id: string;
  name: string | null;
  email: string | null;
  group: string | null;
}

interface Grade {
  id: string;
  userId: string;
  taskId: string;
  score: number;
  comment: string | null;
  gradedAt: string;
  user: Student;
  gradedBy: { id: string; name: string | null };
}

interface Group {
  id: string;
  name: string;
}

export default function TeacherGradebookPage() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [editingGrade, setEditingGrade] = useState<{ userId: string; taskId: string } | null>(null);
  const [gradeScore, setGradeScore] = useState("");
  const [gradeComment, setGradeComment] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = (groupId = "") => {
    setLoading(true);
    const url = groupId ? `/api/teacher/gradebook?groupId=${groupId}` : "/api/teacher/gradebook";
    Promise.all([
      fetch(url).then((r) => r.ok ? r.json() : { grades: [], students: [] }),
      fetch("/api/teacher/groups").then((r) => r.ok ? r.json() : { groups: [] }),
    ])
      .then(([data, groupData]) => {
        setGrades(data.grades || []);
        setStudents(data.students || []);
        setGroups(groupData.groups || []);
        setLoading(false);
      })
      .catch((err) => { logClientError("[TeacherGradebook] Failed to load data", err); setLoading(false); });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGroupChange = (groupId: string) => {
    setSelectedGroup(groupId);
    fetchData(groupId);
  };

  const handleSaveGrade = async () => {
    if (!editingGrade || !gradeScore) return;
    const score = parseInt(gradeScore, 10);
    if (isNaN(score) || score < 0 || score > 100) {
      toast.error("Score must be between 0 and 100");
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch("/api/teacher/gradebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: editingGrade.userId,
          taskId: editingGrade.taskId,
          score,
          comment: gradeComment || undefined,
        }),
      });
      if (res.ok) {
        toast.success("Grade saved");
        setEditingGrade(null);
        setGradeScore("");
        setGradeComment("");
        fetchData(selectedGroup);
      } else {
        const json = await res.json();
        toast.error(json.error || "Error");
      }
    } catch {
      toast.error("Error saving");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGrade = async (userId: string, taskId: string) => {
    if (!confirm("Delete this grade?")) return;
    try {
      const res = await apiFetch(`/api/teacher/gradebook?userId=${userId}&taskId=${taskId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Grade deleted");
        fetchData(selectedGroup);
      } else {
        toast.error("Error deleting");
      }
    } catch {
      toast.error("Error deleting");
    }
  };

  const getTaskName = (taskId: string) => {
    const task = tasks.find((t) => t.id === Number(taskId));
    return task?.name || `Task #${taskId}`;
  };

  const getTaskDifficulty = (taskId: string) => {
    const task = tasks.find((t) => t.id === Number(taskId));
    return task?.difficulty || "";
  };

  return (
    <TeacherLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Журнал оценок</h2>
            <p className="text-muted-foreground">
              Выставляйте и управляйте оценками студентов
            </p>
          </div>
        </div>

        {/* Group Filter */}
        <Card>
          <CardHeader>
            <CardTitle>Фильтр по группе</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedGroup} onValueChange={handleGroupChange}>
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder="All groups" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All groups</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Edit Modal */}
        {editingGrade && (
          <Card className="border-emerald-300 dark:border-emerald-700">
            <CardHeader>
              <CardTitle className="text-base">
                {getTaskName(editingGrade.taskId)} — {students.find((s) => s.id === editingGrade.userId)?.name || "Student"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Балл (0–100)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={gradeScore}
                  onChange={(e) => setGradeScore(e.target.value)}
                />
              </div>
              <div>
                <Label>Комментарий (необязательно)</Label>
                <Textarea
                  value={gradeComment}
                  onChange={(e) => setGradeComment(e.target.value)}
                  rows={2}
                  maxLength={500}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveGrade} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Сохранить
                </Button>
                <Button variant="outline" onClick={() => { setEditingGrade(null); setGradeScore(""); setGradeComment(""); }}>
                  Отмена
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Grades Table */}
        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : grades.length === 0 ? (
          <Card>
            <CardContent className="pt-8 text-center">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No grades</h3>
              <p className="text-muted-foreground">
                Выберите группу и начните выставлять оценки
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Оценки ({grades.length})</CardTitle>
              <CardDescription>Все выставленные оценки</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Балл</TableHead>
                    <TableHead>Комментарий</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grades.map((grade) => (
                    <TableRow key={grade.id}>
                      <TableCell>
                        <div className="font-medium">{grade.user.name || grade.user.email}</div>
                        <div className="text-xs text-muted-foreground">{grade.user.group}</div>
                      </TableCell>
                      <TableCell>
                        <div>{getTaskName(grade.taskId)}</div>
                        <Badge variant="outline" className="text-xs mt-1">{getTaskDifficulty(grade.taskId)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={grade.score >= 80 ? "default" : grade.score >= 50 ? "secondary" : "destructive"}>
                          {grade.score}%
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                        {grade.comment || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(grade.gradedAt).toLocaleDateString("ru-RU")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingGrade({ userId: grade.userId, taskId: grade.taskId });
                              setGradeScore(String(grade.score));
                              setGradeComment(grade.comment || "");
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteGrade(grade.userId, grade.taskId)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
