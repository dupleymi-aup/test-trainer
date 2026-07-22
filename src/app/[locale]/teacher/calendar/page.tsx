"use client";

import { TeacherLayout } from "@/components/teacher/teacher-layout";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Plus, Trash2, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { logClientError } from "@/lib/logger";

interface Deadline {
  id: string; title: string; description: string | null; dueDate: string; type: string;
  groupId: string | null; taskId: number | null; reminderSchedule: string | null;
  group: { id: string; name: string } | null;
}

interface Group { id: string; name: string; }

const DEADLINE_TYPES = ["EXAM", "TEST", "ASSIGNMENT", "COURSE_END", "REGISTRATION_END"];
const typeLabels: Record<string, string> = {
  EXAM: "Экзамен", TEST: "Тест", ASSIGNMENT: "Задание", COURSE_END: "Окончание курса", REGISTRATION_END: "Регистрация",
};
const typeColors: Record<string, string> = {
  EXAM: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400",
  TEST: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  ASSIGNMENT: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  COURSE_END: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  REGISTRATION_END: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
};

export default function TeacherCalendarPage() {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formType, setFormType] = useState("ASSIGNMENT");
  const [formGroupId, setFormGroupId] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = (signal?: AbortSignal) => {
    setLoading(true);
    Promise.all([
      apiFetch("/api/teacher/notifications").then((r) => r.ok ? r.json() : null),
      fetch("/api/teacher/groups", { signal }).then((r) => r.ok ? r.json() : { groups: [] }),
    ])
      .then(([dlData, groupData]) => {
        if (dlData?.deadlines) setDeadlines(dlData.deadlines);
        setGroups(groupData.groups || []);
        setLoading(false);
      })
      .catch((err) => { logClientError("[TeacherCalendar] Failed to load data", err); setLoading(false); });
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, []);

  const handleCreate = async () => {
    if (!formTitle || !formDate) { toast.error("Fill in the title and date"); return; }
    setSaving(true);
    try {
      const res = await apiFetch("/api/admin/deadlines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle, description: formDesc || undefined, dueDate: formDate,
          type: formType, groupId: formGroupId || undefined, reminderSchedule: [7, 3, 1, 0],
        }),
      });
      if (res.ok) {
        toast.success("Deadline created");
        setShowCreate(false); setFormTitle(""); setFormDesc(""); setFormDate(""); setFormType("ASSIGNMENT"); setFormGroupId("");
        fetchData();
      } else {
        const j = await res.json(); toast.error(j.error || "Error");
      }
    } catch { toast.error("Error creating"); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete deadline?")) return;
    try {
      const res = await apiFetch(`/api/admin/deadlines?id=${id}`, { method: "DELETE" });
      if (res.ok) { toast.success("Deleted"); fetchData(); } else toast.error("Error");
    } catch { toast.error("Error deleting"); }
  };

  const prevMonth = () => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1));
  const nextMonth = () => setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1));

  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const monthLabel = monthStart.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });

  const days: (number | null)[] = [];
  const startDay = monthStart.getDay() === 0 ? 6 : monthStart.getDay() - 1;
  for (let i = 0; i < startDay; i++) days.push(null);
  for (let d = 1; d <= monthEnd.getDate(); d++) days.push(d);

  const getDeadlinesForDay = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const dateStr = date.toISOString().slice(0, 10);
    return deadlines.filter((dl) => dl.dueDate.slice(0, 10) === dateStr);
  };

  const upcomingDeadlines = deadlines
    .filter((d) => new Date(d.dueDate) >= new Date())
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 10);

  if (loading) return <TeacherLayout><div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div></TeacherLayout>;

  return (
    <TeacherLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Календарь</h2>
            <p className="text-muted-foreground text-sm">Дедлайны и расписание</p>
          </div>
          <Button onClick={() => setShowCreate(true)} size="sm"><Plus className="h-3 w-3 mr-1" /> Добавить дедлайн</Button>
        </div>

        {/* Create form */}
        {showCreate && (
          <Card className="border-primary/30">
            <CardHeader><CardTitle className="text-base">Новый дедлайн</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Название</Label><Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} /></div>
              <div><Label>Описание</Label><Textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} rows={2} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Date</Label><Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} /></div>
                <div><Label>Тип</Label><Select value={formType} onValueChange={setFormType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DEADLINE_TYPES.map((t) => <SelectItem key={t} value={t}>{typeLabels[t]}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div><Label>Group</Label><Select value={formGroupId} onValueChange={setFormGroupId}><SelectTrigger><SelectValue placeholder="All groups" /></SelectTrigger><SelectContent><SelectItem value="">All groups</SelectItem>{groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="flex gap-2"><Button onClick={handleCreate} disabled={saving}>{saving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}Create</Button><Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button></div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Calendar grid */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
                <CardTitle className="text-base capitalize">{monthLabel}</CardTitle>
                <Button variant="ghost" size="sm" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 text-center text-xs font-medium text-muted-foreground mb-1">
                {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((d) => <div key={d}>{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-px bg-muted">
                {days.map((day, idx) => {
                  if (day === null) return <div key={`e${idx}`} className="p-2 min-h-[60px] bg-background" />;
                  const dayDeadlines = getDeadlinesForDay(day);
                  const today = new Date().toISOString().slice(0, 10);
                  const dateStr = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).toISOString().slice(0, 10);
                  const isToday = dateStr === today;
                  return (
                    <div key={day} className={`p-1 min-h-[60px] bg-background text-xs ${isToday ? "ring-2 ring-primary ring-inset" : ""}`}>
                      <span className={`font-bold ${isToday ? "text-primary" : ""}`}>{day}</span>
                      <div className="space-y-0.5 mt-0.5">
                        {dayDeadlines.slice(0, 2).map((dl) => (
                          <Badge key={dl.id} variant="outline" className={`text-[9px] px-1 py-0 block truncate ${typeColors[dl.type] || ""}`} title={dl.title}>
                            {dl.title.length > 12 ? dl.title.slice(0, 12) + "…" : dl.title}
                          </Badge>
                        ))}
                        {dayDeadlines.length > 2 && <span className="text-[9px] text-muted-foreground">+{dayDeadlines.length - 2}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming deadlines */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Ближайшие дедлайны</CardTitle></CardHeader>
            <CardContent>
              {upcomingDeadlines.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No upcoming deadlines</p>
              ) : (
                <div className="space-y-2">
                  {upcomingDeadlines.map((dl) => (
                    <div key={dl.id} className="flex items-start gap-2 p-2 rounded hover:bg-muted/50 group">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{dl.title}</p>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          <Badge variant="outline" className={`text-[10px] ${typeColors[dl.type] || ""}`}>{typeLabels[dl.type]}</Badge>
                          {dl.group && <Badge variant="outline" className="text-[10px]">{dl.group.name}</Badge>}
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(dl.dueDate).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                          {(() => {
                            const daysLeft = Math.ceil((new Date(dl.dueDate).getTime() - Date.now()) / 86400000);
                            if (daysLeft <= 0) return <Badge variant="destructive" className="text-[10px] ml-1">Overdue</Badge>;
                            if (daysLeft <= 3) return <Badge variant="destructive" className="text-[10px] ml-1">{daysLeft} дн</Badge>;
                            return <span className="text-emerald-600 ml-1">{daysLeft} дн</span>;
                          })()}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 shrink-0 h-6 w-6 p-0" onClick={() => handleDelete(dl.id)}>
                        <Trash2 className="h-3 w-3 text-rose-600" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* All deadlines list */}
        {deadlines.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Все дедлайны ({deadlines.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {deadlines.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).map((dl) => (
                  <div key={dl.id} className="flex items-center gap-3 p-3 hover:bg-muted/50">
                    <Badge variant="outline" className={`shrink-0 ${typeColors[dl.type] || ""}`}>{typeLabels[dl.type]}</Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{dl.title}</p>
                      {dl.description && <p className="text-xs text-muted-foreground line-clamp-1">{dl.description}</p>}
                    </div>
                    {dl.group && <Badge variant="outline" className="text-xs">{dl.group.name}</Badge>}
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(dl.dueDate).toLocaleDateString("ru-RU")}</span>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleDelete(dl.id)}><Trash2 className="h-3 w-3 text-rose-600" /></Button>
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
