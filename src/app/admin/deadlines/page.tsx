"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useState, useEffect, useCallback } from "react";
import { logger } from "@/lib/logger";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { apiFetch } from "@/lib/api-client";
import {
  Plus, Trash2, Edit, Send, Clock, AlertTriangle, CheckCircle, CalendarDays
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

interface Deadline {
  id: string;
  title: string;
  description: string | null;
  dueDate: string;
  type: string;
  groupId: string | null;
  taskId: number | null;
  reminderSchedule: string | null;
  createdAt: string;
  group: { id: string; name: string } | null;
  creator: { name: string | null; email: string | null };
  _count: { reminders: number };
}

const deadlineSchema = z.object({
  title: z.string().min(1, "Название обязательно"),
  description: z.string().optional(),
  dueDate: z.string().min(1, "Дата обязательна"),
  type: z.enum(["EXAM", "TEST", "ASSIGNMENT", "COURSE_END", "REGISTRATION_END"]),
  groupId: z.string().optional(),
  taskId: z.string().optional(),
  targetUsers: z.enum(["ALL_STUDENTS", "GROUP_MEMBERS", "SPECIFIC"]).optional(),
  reminderSchedule: z.array(z.number()).optional(),
});

type DeadlineForm = z.infer<typeof deadlineSchema>;

const typeLabels: Record<string, string> = {
  EXAM: "Экзамен",
  TEST: "Зачёт",
  ASSIGNMENT: "Задание",
  COURSE_END: "Окончание курса",
  REGISTRATION_END: "Окончание регистрации",
};

const typeColors: Record<string, string> = {
  EXAM: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  TEST: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  ASSIGNMENT: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  COURSE_END: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  REGISTRATION_END: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
};

export default function AdminDeadlinesPage() {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [groups, setGroups] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDeadline, setEditingDeadline] = useState<Deadline | null>(null);
  const [showPast, setShowPast] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<DeadlineForm>({
    resolver: zodResolver(deadlineSchema),
    defaultValues: {
      title: "",
      description: "",
      dueDate: "",
      type: "ASSIGNMENT",
      groupId: "",
      taskId: "",
      targetUsers: "ALL_STUDENTS",
      reminderSchedule: [7, 3, 1, 0, -1],
    },
  });

  const fetchDeadlines = useCallback(() => {
    const params = new URLSearchParams();
    if (showPast) params.set("showPast", "true");

    fetch(`/api/admin/deadlines?${params}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => { setDeadlines(d.deadlines || []); setLoading(false); })
      .catch((_error) => {
        toast.error("Не удалось загрузить дедлайны");
        setLoading(false);
      });
  }, [showPast]);

  const fetchGroups = useCallback(() => {
    fetch("/api/admin/groups")
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => setGroups(d.groups || []))
      .catch(() => {
        // Non-critical: groups filter is optional, but log for debugging
        logger.warn("Failed to fetch groups — group filter will be unavailable");
      });
  }, []);

  useEffect(() => { fetchDeadlines(); fetchGroups(); }, [showPast, fetchDeadlines, fetchGroups]);

  const handleSubmit = async (data: DeadlineForm) => {
    setIsSubmitting(true);
    try {
      const body = {
        ...data,
        taskId: data.taskId ? parseInt(data.taskId) : null,
        groupId: data.groupId || null,
        dueDate: new Date(data.dueDate).toISOString(),
      };

      const res = editingDeadline
        ? await apiFetch(`/api/admin/deadlines?id=${editingDeadline.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await apiFetch("/api/admin/deadlines", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

      if (res.ok) {
        toast.success(editingDeadline ? "Дедлайн обновлён" : "Дедлайн создан");
        setShowCreateModal(false);
        setEditingDeadline(null);
        form.reset();
        fetchDeadlines();
      }
    } catch {
      toast.error("Ошибка при сохранении");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await apiFetch(`/api/admin/deadlines?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Дедлайн удалён");
      fetchDeadlines();
    }
  };

  const handleSendReminders = async () => {
    setSendingReminders(true);
    try {
      const res = await apiFetch("/api/admin/deadlines/send-reminders?hoursAhead=48", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Отправлено ${data.sentCount} напоминаний`);
      }
    } catch {
      toast.error("Ошибка при отправке");
    } finally {
      setSendingReminders(false);
    }
  };

  const openEdit = (dl: Deadline) => {
    setEditingDeadline(dl);
    const schedule = dl.reminderSchedule ? (() => { try { return JSON.parse(dl.reminderSchedule) as number[]; } catch { return [7, 3, 1, 0, -1]; } })() : [7, 3, 1, 0, -1];
    form.reset({
      title: dl.title,
      description: dl.description || "",
      dueDate: dl.dueDate?.slice(0, 16) || "",
      type: dl.type as DeadlineForm["type"],
      groupId: dl.groupId || "",
      taskId: dl.taskId?.toString() || "",
      targetUsers: "ALL_STUDENTS",
      reminderSchedule: schedule,
    });
    setShowCreateModal(true);
  };

  if (loading) return <AdminLayout><div className="p-8 text-center">Загрузка...</div></AdminLayout>;

  const now = new Date();
  const upcoming = deadlines.filter((d) => new Date(d.dueDate) >= now);
  const overdue = deadlines.filter((d) => new Date(d.dueDate) < now);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Дедлайны и напоминания</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSendReminders} disabled={sendingReminders}>
              <Send className="h-4 w-4 mr-1" />
              {sendingReminders ? "Отправка..." : "Отправить напоминания"}
            </Button>
            <Button size="sm" onClick={() => { setEditingDeadline(null); form.reset(); setShowCreateModal(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Создать дедлайн
            </Button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <CalendarDays className="h-3 w-3" /> Всего дедлайнов
              </div>
              <div className="text-2xl font-bold">{deadlines.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3 text-amber-600" /> Предстоящие
              </div>
              <div className="text-2xl font-bold text-amber-600">{upcoming.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-rose-600" /> Просроченные
              </div>
              <div className="text-2xl font-bold text-rose-600">{overdue.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Deadlines table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm">Список дедлайнов</CardTitle>
                <CardDescription>Управление сроками и напоминаниями</CardDescription>
              </div>
              <Button variant={showPast ? "default" : "outline"} size="sm" onClick={() => setShowPast(!showPast)}>
                {showPast ? "Скрыть прошлые" : "Показать прошлые"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Срок</TableHead>
                  <TableHead>Группа</TableHead>
                  <TableHead className="text-right">Напоминания</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deadlines.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Нет дедлайнов. Нажмите "Создать дедлайн" для добавления.
                    </TableCell>
                  </TableRow>
                )}
                {deadlines.map((dl) => {
                  const dueDate = new Date(dl.dueDate);
                  const isOverdue = dueDate < now;
                  const daysLeft = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

                  return (
                    <TableRow key={dl.id}>
                      <TableCell className="font-medium">
                        {dl.title}
                        {dl.description && (
                          <div className="text-xs text-muted-foreground truncate max-w-xs">{dl.description}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={typeColors[dl.type]}>{typeLabels[dl.type]}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{dueDate.toLocaleDateString("ru-RU")}</div>
                        <div className="text-xs text-muted-foreground">{dueDate.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</div>
                      </TableCell>
                      <TableCell>{dl.group?.name || "Все"}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{dl._count.reminders}</Badge>
                      </TableCell>
                      <TableCell>
                        {dl.reminderSchedule ? (
                          <div className="flex gap-1 flex-wrap">
                            {(() => {
                              try {
                                const schedule: number[] = JSON.parse(dl.reminderSchedule);
                                return schedule.map((offset) => (
                                  <Badge key={offset} variant="outline" className="text-xs">
                                    {offset > 0 ? `${offset}д` : offset === 0 ? "день" : "проср."}
                                  </Badge>
                                ));
                              } catch {
                                return null;
                              }
                            })()}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">По умолч.</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isOverdue ? (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> Просрочен
                          </Badge>
                        ) : daysLeft <= 3 ? (
                          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {daysLeft} дн.
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" /> {daysLeft} дн.
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(dl)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(dl.id)}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingDeadline ? "Редактировать дедлайн" : "Создать дедлайн"}</DialogTitle>
              <DialogDescription>
                {editingDeadline ? "Измените параметры дедлайна" : "Установите срок и создайте напоминания для студентов"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dl-title">Название *</Label>
                <Input id="dl-title" {...form.register("title")} />
                {form.formState.errors.title && <p className="text-xs text-rose-600">{form.formState.errors.title.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dl-desc">Описание</Label>
                <Textarea id="dl-desc" {...form.register("description")} rows={2} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dl-type">Тип *</Label>
                  <Select onValueChange={(v) => form.setValue("type", v as DeadlineForm["type"])} defaultValue={form.getValues("type")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dl-date">Срок *</Label>
                  <Input id="dl-date" type="datetime-local" {...form.register("dueDate")} />
                  {form.formState.errors.dueDate && <p className="text-xs text-rose-600">{form.formState.errors.dueDate.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dl-group">Группа (необязательно)</Label>
                <Select onValueChange={(v) => form.setValue("groupId", v === "all" ? "" : v)} defaultValue={form.getValues("groupId") || "all"}>
                  <SelectTrigger><SelectValue placeholder="Все студенты" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все студенты</SelectItem>
                    {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dl-task">Задание (необязательно)</Label>
                <Input id="dl-task" type="number" min="1" placeholder="Номер задания" {...form.register("taskId")} />
              </div>

              <div className="space-y-2">
                <Label>Кому отправить напоминания</Label>
                <Select onValueChange={(v) => form.setValue("targetUsers", v as DeadlineForm["targetUsers"])} defaultValue={form.getValues("targetUsers")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL_STUDENTS">Всем студентам</SelectItem>
                    <SelectItem value="GROUP_MEMBERS">Только группе</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Напоминать</Label>
                <div className="flex flex-wrap gap-4">
                  {([
                    { value: 7, label: "За 7 дней" },
                    { value: 3, label: "За 3 дня" },
                    { value: 1, label: "За 1 день" },
                    { value: 0, label: "В день дедлайна" },
                    { value: -1, label: "При просрочке" },
                  ]).map((option) => (
                    <div key={option.value} className="flex items-center gap-2">
                      <Checkbox
                        id={`reminder-${option.value}`}
                        checked={(form.watch("reminderSchedule") ?? []).includes(option.value)}
                        onCheckedChange={(checked) => {
                          const current = form.getValues("reminderSchedule") ?? [];
                          if (checked) {
                            form.setValue("reminderSchedule", [...current, option.value]);
                          } else {
                            form.setValue("reminderSchedule", current.filter((v) => v !== option.value));
                          }
                        }}
                      />
                      <Label htmlFor={`reminder-${option.value}`} className="text-sm cursor-pointer">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => { setShowCreateModal(false); setEditingDeadline(null); }}>Отмена</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Сохранение..." : editingDeadline ? "Обновить" : "Создать"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
