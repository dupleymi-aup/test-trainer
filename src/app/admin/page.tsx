"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, FileText, FolderKanban, Activity } from "lucide-react";

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

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <AdminLayout><div className="p-8 text-center">Загрузка...</div></AdminLayout>;
  if (!stats) return <AdminLayout><div className="p-8 text-center">Ошибка загрузки</div></AdminLayout>;

  const statCards = [
    { label: "Пользователи", value: stats.totalUsers, icon: Users, color: "text-blue-600" },
    { label: "Попытки", value: stats.totalAttempts, icon: FileText, color: "text-emerald-600" },
    { label: "Группы", value: stats.totalGroups, icon: FolderKanban, color: "text-purple-600" },
    { label: "Действия", value: stats.recentActivity.length, icon: Activity, color: "text-amber-600" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <Card key={card.label}>
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
          ))}
        </div>

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
