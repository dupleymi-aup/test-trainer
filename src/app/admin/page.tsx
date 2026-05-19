"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  FileText,
  FolderKanban,
  Activity,
  ArrowRight,
  BarChart3,
  AlertTriangle,
  GitCompare,
  Table2,
  Trophy,
  Zap,
  Route,
  GraduationCap,
  Bell,
} from "lucide-react";

interface Stats {
  totalUsers: number;
  usersByRole: Record<string, number>;
  totalAttempts: number;
  totalGroups: number;
  recentActivity: Array<{
    id: string;
    action: string;
    entity: string | null;
    createdAt: string;
    user: { name: string | null; email: string | null; role: string };
  }>;
}

interface RiskData {
  lowPerformers: number;
  declining: number;
  inactive: number;
  lowEngagement: number;
  total: number;
}

interface NotifData {
  notifications: Array<{ id: string; type: string; createdAt: string }>;
  unreadCount: number;
}

const roleLabels: Record<string, string> = {
  STUDENT: "Студент",
  TEACHER: "Преподаватель",
  ADMIN: "Администратор",
};

const roleColors: Record<string, string> = {
  STUDENT: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  TEACHER: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  ADMIN: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300",
};

const quickReports = [
  { href: "/admin/analytics/comprehensive", title: "Обзор платформы", icon: BarChart3, color: "text-blue-600" },
  { href: "/admin/analytics/predictions", title: "Риск-анализ", icon: AlertTriangle, color: "text-rose-600" },
  { href: "/admin/analytics/compare-periods", title: "Сравнение периодов", icon: GitCompare, color: "text-cyan-600" },
  { href: "/admin/analytics/completion-matrix", title: "Матрица выполнения", icon: Table2, color: "text-orange-600" },
  { href: "/admin/analytics/group-performance", title: "Успеваемость групп", icon: FolderKanban, color: "text-teal-600" },
  { href: "/admin/analytics/improvement-leaderboard", title: "Лидеры улучшений", icon: Trophy, color: "text-amber-500" },
  { href: "/admin/analytics/velocity", title: "Скорость обучения", icon: Zap, color: "text-yellow-600" },
  { href: "/admin/analytics/learning-path", title: "Путь обучения", icon: Route, color: "text-violet-600" },
];

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [riskData, setRiskData] = useState<RiskData | null>(null);
  const [notifData, setNotifData] = useState<NotifData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/stats").then((r) => r.json()),
      fetch("/api/admin/analytics/predictions").then((r) => r.json()).catch(() => null),
      fetch("/api/teacher/notifications").then((r) => r.json()).catch(() => null),
    ]).then(([statsData, riskResp, notifResp]) => {
      setStats(statsData);
      if (riskResp?.riskOverview) setRiskData(riskResp.riskOverview);
      if (notifResp?.notifications !== undefined) setNotifData(notifResp);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <AdminLayout><div className="p-8 text-center">Загрузка...</div></AdminLayout>;
  if (!stats) return <AdminLayout><div className="p-8 text-center">Ошибка загрузки</div></AdminLayout>;

  const statCards = [
    { label: "Студенты", value: stats.usersByRole["STUDENT"] || 0, icon: Users, color: "text-blue-600", href: "/admin/users" },
    { label: "Попытки", value: stats.totalAttempts, icon: FileText, color: "text-emerald-600", href: "/admin/analytics/comprehensive" },
    { label: "Группы", value: stats.totalGroups, icon: FolderKanban, color: "text-purple-600", href: "/admin/groups" },
    { label: "Преподаватели", value: stats.usersByRole["TEACHER"] || 0, icon: GraduationCap, color: "text-amber-600", href: "/admin/analytics/teacher-performance" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <Link key={card.label} href={card.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <card.icon className={`h-8 w-8 ${card.color}`} />
                    <div>
                      <p className="text-2xl font-bold">{card.value}</p>
                      <p className="text-xs text-muted-foreground">{card.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Risk alerts */}
        {riskData && riskData.total > 0 && (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Студенты в зоне риска
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center">
                  <p className="text-2xl font-bold text-rose-600">{riskData.lowPerformers}</p>
                  <p className="text-xs text-muted-foreground">Низкая успеваемость</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-600">{riskData.declining}</p>
                  <p className="text-xs text-muted-foreground">Снижение прогресса</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">{riskData.inactive}</p>
                  <p className="text-xs text-muted-foreground">Неактивность</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">{riskData.lowEngagement}</p>
                  <p className="text-xs text-muted-foreground">Низкая вовлечённость</p>
                </div>
              </div>
              <div className="mt-3 text-center">
                <Link href="/admin/analytics/predictions">
                  <Button variant="outline" size="sm">
                    Полный анализ рисков <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notifications */}
        {notifData && notifData.notifications.length > 0 && (
          <Card className={notifData.unreadCount > 0 ? "border-amber-200 bg-amber-50/30" : ""}>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Уведомления
                {notifData.unreadCount > 0 && (
                  <Badge variant="destructive" className="text-xs">{notifData.unreadCount} новых</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {notifData.notifications.slice(0, 5).map((n) => (
                  <div key={n.id} className="flex items-start gap-2 text-sm">
                    <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs">{n.type.replace(/_/g, " ")}</p>
                      <p className="text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString("ru-RU")}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-center">
                <Link href="/admin/notifications">
                  <Button variant="outline" size="sm">
                    Все уведомления <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick access to reports */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Быстрый доступ к отчётам</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {quickReports.map((report) => (
                <Link key={report.href} href={report.href}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full border-dashed">
                    <CardContent className="pt-4 flex flex-col items-center text-center gap-2">
                      <report.icon className={`h-6 w-6 ${report.color}`} />
                      <p className="text-xs font-medium">{report.title}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Users by role */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Пользователи по ролям</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 flex-wrap">
              {Object.entries(stats.usersByRole).map(([role, count]) => (
                <div key={role} className="flex items-center gap-2">
                  <Badge className={roleColors[role]}>{roleLabels[role]}</Badge>
                  <span className="text-lg font-bold">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Последние действия</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Нет действий</p>
              ) : (
                stats.recentActivity.map((log) => (
                  <div key={log.id} className="flex items-center gap-3 text-sm p-2 rounded bg-muted/30">
                    <Badge variant="outline" className="text-xs">{log.action}</Badge>
                    <span className="text-muted-foreground">{log.user.name || log.user.email}</span>
                    {log.entity && <span className="text-muted-foreground">→ {log.entity}</span>}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString("ru-RU")}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
