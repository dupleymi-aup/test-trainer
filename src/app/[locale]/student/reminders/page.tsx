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
import { useLocale, useTranslations } from "next-intl";
import { MS_PER_DAY } from "@/lib/time-constants";
import { logClientError } from "@/lib/logger";

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

function getTypeConfig(t: (key: string) => string): Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> {
  return {
    EXAM: { label: t("typeExam"), icon: <GraduationCap className="h-4 w-4" />, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/30 border-rose-200" },
    TEST: { label: t("typeTest"), icon: <FileText className="h-4 w-4" />, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200" },
    ASSIGNMENT: { label: t("typeAssignment"), icon: <BookOpen className="h-4 w-4" />, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-200" },
    COURSE_END: { label: t("typeCourseEnd"), icon: <CalendarClock className="h-4 w-4" />, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/30 border-purple-200" },
    REGISTRATION_END: { label: t("typeRegistrationEnd"), icon: <Clock className="h-4 w-4" />, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/30 border-orange-200" },
  };
}

function formatDate(dateStr: string, locale: string) {
  const date = new Date(dateStr);
  return date.toLocaleString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTimeRemaining(dueDateStr: string, t: (key: string, params?: Record<string, number>) => string) {
  const now = new Date();
  const due = new Date(dueDateStr);
  const diffMs = due.getTime() - now.getTime();

  if (diffMs < 0) {
    const daysOverdue = Math.floor(Math.abs(diffMs) / MS_PER_DAY);
    return { text: t("overdueBy", { days: daysOverdue }), isOverdue: true, color: "text-rose-600 dark:text-rose-400" };
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / MS_PER_DAY);

  if (hours < 24) return { text: t("hoursLeft", { hours }), isOverdue: false, color: "text-amber-600 dark:text-amber-400" };
  if (days === 1) return { text: t("oneDayLeft"), isOverdue: false, color: "text-amber-600 dark:text-amber-400" };
  if (days <= 7) return { text: t("daysLeft", { days }), isOverdue: false, color: "text-blue-600 dark:text-blue-400" };
  return { text: t("daysLeft", { days }), isOverdue: false, color: "text-muted-foreground" };
}

export default function StudentRemindersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("reminders");
  const [data, setData] = useState<RemindersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const typeConfig = getTypeConfig(t);

  const fetchReminders = () => {
    setLoading(true);
    fetch("/api/student/reminders")
      .then(async (r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d) => { setData(d); setLoading(false); })
      .catch((err) => { logClientError("[StudentReminders] Failed to load reminders", err); setLoading(false); });
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
          <p className="text-muted-foreground">{t("loading")}</p>
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
            <h2 className="text-xl font-semibold mb-2">{t("emptyTitle")}</h2>
            <p className="text-muted-foreground mb-4">
              {t("emptySubtitle")}
            </p>
            <Button onClick={fetchReminders} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" /> {t("refresh")}
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
              {t("title")}
            </h1>
            <p className="text-muted-foreground mt-1">{t("subtitle")}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchReminders} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-1" /> {t("refresh")}
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
                      toast.success(t("markAllReadSuccess"));
                      fetchReminders();
                    })
                    .catch((e) => { logClientError("Failed to mark all reminders as read", e); toast.error(t("updateError")); });
                }}
                variant="outline"
                size="sm"
              >
                <CheckCircle className="h-4 w-4 mr-1" /> {t("markAllRead")}
              </Button>
            )}
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Bell className="h-3 w-3" /> {t("total")}
              </div>
              <div className="text-2xl font-bold">{data.counts.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Bell className="h-3 w-3 text-amber-600 dark:text-amber-400" /> {t("unread")}
              </div>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{data.counts.unread}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-rose-600 dark:text-rose-400" /> {t("overdue")}
              </div>
              <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{data.counts.overdue}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3 text-blue-600 dark:text-blue-400" /> {t("next7Days")}
              </div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{data.counts.nextWeek}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="all">{t("tabAll", { count: data.reminders.length })}</TabsTrigger>
            <TabsTrigger value="overdue">{t("tabOverdue", { count: data.counts.overdue })}</TabsTrigger>
            <TabsTrigger value="upcoming">{t("tabUpcoming", { count: data.counts.nextWeek })}</TabsTrigger>
            <TabsTrigger value="read">{t("tabRead", { count: data.reminders.filter((r) => r.read).length })}</TabsTrigger>
          </TabsList>

          <TabsContent value={tab}>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t("listTitle")}</CardTitle>
                <CardDescription>
                  {tab === "overdue" && t("tabDescOverdue")}
                  {tab === "upcoming" && t("tabDescUpcoming")}
                  {tab === "read" && t("tabDescRead")}
                  {tab === "all" && t("tabDescAll")}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {reminders.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500 dark:text-green-400" />
                    {t("categoryEmpty")}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("colType")}</TableHead>
                        <TableHead>{t("colName")}</TableHead>
                        <TableHead>{t("colDue")}</TableHead>
                        <TableHead>{t("colRemaining")}</TableHead>
                        <TableHead>{t("colStatus")}</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reminders.map((reminder) => {
                        const config = typeConfig[reminder.deadline.type] || typeConfig.ASSIGNMENT;
                        const timeRemaining = getTimeRemaining(reminder.deadline.dueDate, t);

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
                                  {t("groupLabel", { name: reminder.deadline.group.name })}
                                </div>
                              )}
                              {reminder.deadline.taskId && (
                                <div className="text-xs text-muted-foreground">
                                  {t("taskLabel", { id: reminder.deadline.taskId })}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {formatDate(reminder.deadline.dueDate, locale)}
                            </TableCell>
                            <TableCell>
                              <span className={`font-medium ${timeRemaining.color}`}>
                                {timeRemaining.text}
                              </span>
                            </TableCell>
                            <TableCell>
                              {reminder.read ? (
                                <Badge variant="outline" className="text-green-600 dark:text-green-400">
                                  <CheckCircle className="h-3 w-3 mr-1" /> {t("read")}
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-amber-600 dark:text-amber-400">
                                  <Bell className="h-3 w-3 mr-1" /> {t("new")}
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
                                      .catch((e) => { logClientError("Failed to mark reminder as read", e); toast.error(t("markReadError")); });
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
            <ChevronRight className="h-4 w-4 rotate-180" /> {t("backHome")}
          </Link>
        </div>
      </div>
    </div>
  );
}
