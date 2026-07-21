"use client";

import { TeacherLayout } from "@/components/teacher/teacher-layout";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Download } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { tasks } from "@/lib/tasks";

interface Student {
  id: string; name: string | null; email: string | null; group: string | null;
}
interface GradeEntry {
  id: string; userId: string; taskId: string; score: number; comment: string | null; gradedAt: string;
  user: Student; gradedBy: { id: string; name: string | null };
}
interface Group { id: string; name: string; }
interface CellEdit { userId: string; taskId: string; score: number; }

export default function GradebookMatrixPage() {
  const [grades, setGrades] = useState<GradeEntry[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [loading, setLoading] = useState(true);
  const [pendingChanges, setPendingChanges] = useState<Record<string, CellEdit>>({});
  const [saving, setSaving] = useState(false);

  const fetchData = (groupId = "", signal?: AbortSignal) => {
    setLoading(true);
    const url = groupId ? `/api/teacher/gradebook?groupId=${groupId}` : "/api/teacher/gradebook";
    Promise.all([
      fetch(url, { signal }).then((r) => r.ok ? r.json() : { grades: [], students: [] }),
      fetch("/api/teacher/groups", { signal }).then((r) => r.ok ? r.json() : { groups: [] }),
    ])
      .then(([data, groupData]) => {
        setGrades(data.grades || []);
        setStudents(data.students || []);
        setGroups(groupData.groups || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchData(undefined, controller.signal);
    return () => controller.abort();
  }, []);

  const handleGroupChange = (groupId: string) => { setSelectedGroup(groupId); fetchData(groupId); };

  const getGradeFor = (userId: string, taskId: number) => {
    const g = grades.find((g) => g.userId === userId && Number(g.taskId) === taskId);
    return g ? g.score : null;
  };

  const setCellValue = (userId: string, taskId: number, score: number) => {
    const key = `${userId}_${taskId}`;
    setPendingChanges((prev) => ({ ...prev, [key]: { userId, taskId: String(taskId), score } }));
  };

  const saveAllChanges = async () => {
    const changes = Object.values(pendingChanges);
    if (changes.length === 0) { toast.info("No changes to save"); return; }
    setSaving(true);
    let saved = 0, failed = 0;
    for (const ch of changes) {
      try {
        const res = await apiFetch("/api/teacher/gradebook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: ch.userId, taskId: ch.taskId, score: ch.score }),
        });
        if (res.ok) saved++; else failed++;
      } catch { failed++; }
    }
    setSaving(false);
    setPendingChanges({});
    if (failed === 0) toast.success(`Сохранено ${saved} оценок`);
    else toast.warning(`Сохранено ${saved} оценок, ошибок: ${failed}`);
    fetchData(selectedGroup);
  };

  const exportCSV = () => {
    const headers = ["Студент", ...tasks.map((t) => t.name), "Средний балл"];
    const rows = students.map((s) => {
      const taskScores = tasks.map((t) => {
        const g = grades.find((gr) => gr.userId === s.id && Number(gr.taskId) === t.id);
        return g ? String(g.score) : "";
      });
      const scores = taskScores.filter(Boolean).map(Number);
      const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : "";
      return [`"${(s.name || s.email || "").replace(/"/g, '""')}"`, ...taskScores, String(avg)];
    }).map((r) => r.join(","));
    const csv = "\uFEFF" + headers.join(",") + "\n" + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `gradebook-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const getScoreBadge = (score: number | null) => {
    if (score === null) return <span className="text-muted-foreground/30">—</span>;
    return <span className={`font-bold text-xs ${score >= 80 ? "text-emerald-600" : score >= 50 ? "text-amber-600 dark:text-amber-400" : "text-rose-600"}`}>{score}%</span>;
  };

  if (loading) return <TeacherLayout><div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div></TeacherLayout>;

  return (
    <TeacherLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Матрица оценок</h2>
            <p className="text-muted-foreground text-sm">Таблица Студенты × Задания для быстрой оценки</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-3 w-3 mr-1" /> CSV</Button>
            {Object.keys(pendingChanges).length > 0 && (
              <Button size="sm" onClick={saveAllChanges} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                Сохранить ({Object.keys(pendingChanges).length})
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-4">
              <CardTitle className="text-sm">Студенты × Задания</CardTitle>
              <Select value={selectedGroup} onValueChange={handleGroupChange}>
                <SelectTrigger className="w-[220px]"><SelectValue placeholder="All groups" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All groups</SelectItem>
                  {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-auto">
            {students.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">Выберите группу для отображения матрицы</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="p-2 text-left border sticky left-0 bg-muted/50 z-10 min-w-[150px]">Студент</th>
                      {tasks.map((t) => (
                        <th key={t.id} className="p-1 text-center border min-w-[70px]" title={t.name}>
                          <div className="font-medium truncate max-w-[70px]">{t.id}</div>
                          <Badge variant="outline" className="text-[9px] px-1">{t.difficulty}</Badge>
                        </th>
                      ))}
                      <th className="p-2 text-center border bg-muted/30">Ср.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s) => {
                      const avg = tasks.reduce((sum, t) => {
                        const g = getGradeFor(s.id, t.id);
                        return g !== null ? sum + g : sum;
                      }, 0);
                      const gradedCount = tasks.filter((t) => getGradeFor(s.id, t.id) !== null).length;
                      const avgVal = gradedCount > 0 ? Math.round(avg / gradedCount) : null;

                      return (
                        <tr key={s.id} className="hover:bg-muted/30">
                          <td className="p-2 border sticky left-0 bg-background z-10">
                            <div className="font-medium truncate">{s.name || s.email}</div>
                            <div className="text-muted-foreground">{s.group}</div>
                          </td>
                          {tasks.map((t) => {
                            const current = getGradeFor(s.id, t.id);
                            const key = `${s.id}_${t.id}`;
                            const pending = pendingChanges[key];
                            const display = pending ? pending.score : current;
                            const isPending = !!pending;

                            return (
                              <td key={t.id} className={`p-1 border text-center ${isPending ? "bg-amber-50 dark:bg-amber-900/10" : ""}`}>
                                <input
                                  type="number"
                                  min={0} max={100}
                                  value={display !== null ? display : ""}
                                  onChange={(e) => {
                                    const v = e.target.value === "" ? null : parseInt(e.target.value, 10);
                                    if (v === null || (v >= 0 && v <= 100)) setCellValue(s.id, t.id, v ?? 0);
                                  }}
                                  className={`w-12 text-center text-xs border rounded px-1 py-0.5 bg-transparent focus:outline-none focus:ring-1 focus:ring-primary ${isPending ? "ring-1 ring-amber-400" : ""}`}
                                  placeholder="—"
                                />
                              </td>
                            );
                          })}
                          <td className="p-1 border text-center bg-muted/20">
                            {avgVal !== null ? getScoreBadge(avgVal) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Legend</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 text-xs">
              <span><span className="inline-block w-3 h-3 bg-emerald-600 rounded mr-1" /> ≥80% — Отлично</span>
              <span><span className="inline-block w-3 h-3 bg-amber-600 rounded mr-1" /> 50-79% — Средне</span>
              <span><span className="inline-block w-3 h-3 bg-rose-600 rounded mr-1" /> &lt;50% — Низко</span>
              <span><span className="inline-block w-3 h-3 bg-amber-400 rounded mr-1" /> Изменённая ячейка</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </TeacherLayout>
  );
}
