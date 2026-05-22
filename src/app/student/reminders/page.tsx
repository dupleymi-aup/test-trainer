"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell, CalendarClock, AlertTriangle, Clock, CheckCircle, BookOpen,
  GraduationCap, FileText, ChevronRight, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

interface Reminder {
  id: string;
  deadlineId: string;
  userId: string;
  offsetDays: number;
  sent: boolean;
  sentAt: string | null;
  read: boolean;
  readAt: string | null;
  createdAt: string;
  deadline: {
    id: string;
    title: string;
    description: string | null;
    dueDate: string;
    type: string;
    taskId: number | null;
    group: { id: string; name: string } | null;
  };
}

interface Counts {
  total: number;
  unread: number;
  overdue: number;
  nextWeek: number;
}

interface RemindersData {
  reminders: Reminder[];
  upcoming: Reminder[];
  overdue: Reminder[];
  nextWeek: Reminder[];
  counts: Counts;
}

const typeConfig: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  EXAM: { label: "Экзамен", icon: <GraduationCap className="h-4 w-4" />, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/30 border-rose-200" },
  TEST: { label: "Зачёт", icon: <FileText className="h-4 w-4" />, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200" },
  ASSIGNMENT: { label: "Задание", icon: <BookOpen className="h-4 w-4" />, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-200" },
  COURSE_END: { label: "Окончание курса", icon: <CalendarClock className="h-4 w-4" />, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/30 border-purple-200" },
  REGISTRATION_END: { label: "Окончание регистрации", icon: <Clock className="h-4 w-4" />, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/30 border-orange-200" },
};

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTimeRemaining(dueDateStr: string) {
  const now = new Date();
  const due = new Date(dueDateStr);
  const diffMs = due.getTime() - now.getTime();

  if (diffMs < 0) {
    const daysOverdue = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60 * 24));
    return { text: `Просрочен на ${daysOverdue} дн.`, isOverdue: true, color: "text-rose-600 dark:text-rose-400" };
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (hours < 24) return { text: `Осталось ${hours} ч.`, isOverdue: false, color: "text-amber-600 dark:text-amber-400" };
  if (days === 1) return { text: "Остался 1 день", isOverdue: false, color: "text-amber-600 dark:text-amber-400" };
  if (days <= 7) return { text: `Осталось ${days} дн.`, isOverdue: false, color: "text-blue-600 dark:text-blue-400" };
  return { text: `Осталось ${days} дн.`, isOverdue: false, color: "text-muted-foreground" };
}

export default function StudentRemindersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<RemindersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");

  const fetchReminders = () => {
    setLoading(true);
    fetch("/api/student/reminders")
      .then(async (r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchReminders();
  }, []);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role !== "STUDENT") {
      // Redirect non-students to their dashboards
      if (session.user.role === "ADMIN") router.push("/admin/analytics");
      else if (session.user.role === "TEACHER") router.push("/teacher");
    }
  }, [status, session, router]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Bell className="h-8 w-8 mx-auto mb-4 animate-pulse text-muted-foreground" />
          <p className="text-muted-foreground">Загрузка напоминаний...</p>
        </div>
      </div>
    );
  }

  if (!data || data.reminders.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-8 text-center">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h2 className="text-xl font-semibold mb-2">Нет напоминаний</h2>
            <p className="text-muted-foreground mb-4">
              У вас нет активных напоминаний о дедлайнах
            </p>
            <Button onClick={fetchReminders} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" /> Обновить
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getRemindersForTab = () => {
    switch (tab) {
      case "overdue": return data.overdue;
      case "upcoming": return [...data.nextWeek, ...data.upcoming.filter((r) => !data.nextWeek.includes(r))];
      case "read": return data.reminders.filter((r) => r.read);
      default: return data.reminders;
    }
  };

  const reminders = getRemindersForTab();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto max-w-5xl py-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              Напоминания
            </h1>
            <p className="text-muted-foreground mt-1">Сроки экзаменов, зачётов и заданий</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchReminders} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-1" /> Обновить
            </Button>
            {data.counts.unread > 0 && (
              <Button
                onClick={() => {
                  fetch("/api/student/reminders", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "mark_all_read" }),
                  })
                    .then(() => {
                      toast.success("Все напоминания отмечены как прочитанные");
                      fetchReminders();
                    })
                    .catch(() => toast.error("Ошибка при обновлении"));
                }}
                variant="outline"
                size="sm"
              >
                <CheckCircle className="h-4 w-4 mr-1" /> Прочитать всё
              </Button>
            )}
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Bell className="h-3 w-3" /> Всего
              </div>
              <div className="text-2xl font-bold">{data.counts.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Bell className="h-3 w-3 text-amber-600 dark:text-amber-400" /> Непрочитанные
              </div>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{data.counts.unread}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-rose-600 dark:text-rose-400" /> Просроченные
              </div>
              <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{data.counts.overdue}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3 text-blue-600 dark:text-blue-400" /> Ближайшие 7 дн.
              </div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{data.counts.nextWeek}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="all">Все ({data.reminders.length})</TabsTrigger>
            <TabsTrigger value="overdue">Просроченные ({data.counts.overdue})</TabsTrigger>
            <TabsTrigger value="upcoming">Ближайшие ({data.counts.nextWeek})</TabsTrigger>
            <TabsTrigger value="read">Прочитанные ({data.reminders.filter((r) => r.read).length})</TabsTrigger>
          </TabsList>

          <TabsContent value={tab}>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Список напоминаний</CardTitle>
                <CardDescription>
                  {tab === "overdue" && "Просроченные дедлайны — требуют немедленного внимания"}
                  {tab === "upcoming" && "Дедлайны в ближайшие 7 дней"}
                  {tab === "read" && "Прочитанные напоминания"}
                  {tab === "all" && "Все ваши напоминания о дедлайнах"}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {reminders.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500 dark:text-green-400" />
                    Нет напоминаний в этой категории
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Тип</TableHead>
                        <TableHead>Название</TableHead>
                        <TableHead>Срок</TableHead>
                        <TableHead>Осталось</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reminders.map((reminder) => {
                        const config = typeConfig[reminder.deadline.type] || typeConfig.ASSIGNMENT;
                        const timeRemaining = getTimeRemaining(reminder.deadline.dueDate);

                        return (
                          <TableRow
                            key={reminder.id}
                            className={!reminder.read ? "bg-amber-50/50 dark:bg-amber-950/10" : ""}
                          >
                            <TableCell>
                              <Badge variant="outline" className={`${config.color} flex items-center gap-1`}>
                                {config.icon}
                                {config.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{reminder.deadline.title}</div>
                              {reminder.deadline.description && (
                                <div className="text-xs text-muted-foreground truncate max-w-xs">
                                  {reminder.deadline.description}
                                </div>
                              )}
                              {reminder.deadline.group && (
                                <div className="text-xs text-muted-foreground">
                                  Группа: {reminder.deadline.group.name}
                                </div>
                              )}
                              {reminder.deadline.taskId && (
                                <div className="text-xs text-muted-foreground">
                                  Задание #{reminder.deadline.taskId}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {formatDate(reminder.deadline.dueDate)}
                            </TableCell>
                            <TableCell>
                              <span className={`font-medium ${timeRemaining.color}`}>
                                {timeRemaining.text}
                              </span>
                            </TableCell>
                            <TableCell>
                              {reminder.read ? (
                                <Badge variant="outline" className="text-green-600 dark:text-green-400">
                                  <CheckCircle className="h-3 w-3 mr-1" /> Прочитано
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-amber-600 dark:text-amber-400">
                                  <Bell className="h-3 w-3 mr-1" /> Новое
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {!reminder.read && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    fetch("/api/student/reminders", {
                                      method: "PATCH",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ reminderId: reminder.id, action: "mark_read" }),
                                    })
                                      .then(() => fetchReminders())
                                      .catch(() => toast.error("Ошибка"));
                                  }}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Back to main page link */}
        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1">
            <ChevronRight className="h-4 w-4 rotate-180" /> На главную
          </Link>
        </div>
      </div>
    </div>
  );
}
