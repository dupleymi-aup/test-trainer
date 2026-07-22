"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Database, Users, FileText, Activity, Clock } from "lucide-react";
import { logClientError } from "@/lib/logger";

interface DBAnalytics {
  database: {
    totalUsers: number;
    usersByRole: Record<string, number>;
    usersByStatus: Record<string, number>;
    usersThisWeek: number;
    usersThisMonth: number;
    totalAttempts: number;
    attemptsToday: number;
    attemptsThisWeek: number;
    attemptsThisMonth: number;
    totalGroups: number;
    totalGroupTasks: number;
    totalActivityLogs: number;
    totalSettings: number;
    totalRecords: number;
  };
  attemptsByHour: Array<{ hour: number; count: number }>;
  topTasks: Array<{
    taskId: string;
    attemptsCount: number;
    avgScore: number;
    avgEc: number;
    avgBv: number;
  }>;
  activityByType: Array<{ action: string; count: number }>;
  groupStats: Array<{
    id: string;
    name: string;
    memberCount: number;
    taskCount: number;
  }>;
}

export default function AdminDatabaseAnalyticsPage() {
  const [data, setData] = useState<DBAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/database/analytics", { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => { if (!controller.signal.aborted) { logClientError("[AdminDBAnalytics] Failed to load analytics", err); setLoading(false); } });
    return () => controller.abort();
  }, []);

  if (loading)
    return (
      <AdminLayout>
        <div className="p-8 text-center">Loading...</div>
      </AdminLayout>
    );

  if (!data)
    return (
      <AdminLayout>
        <div className="p-8 text-center">Ошибка загрузки данных</div>
      </AdminLayout>
    );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h2 className="text-xl font-bold">Аналитика базы данных</h2>

        {/* Database Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs text-muted-foreground">Пользователи</span>
              </div>
              <p className="text-2xl font-bold">{data.database.totalUsers}</p>
              <p className="text-xs text-muted-foreground mt-1">
                +{data.database.usersThisWeek} за неделю
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-emerald-600" />
                <span className="text-xs text-muted-foreground">Attempts</span>
              </div>
              <p className="text-2xl font-bold">{data.database.totalAttempts}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {data.database.attemptsToday} сегодня
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Database className="h-4 w-4 text-purple-600" />
                <span className="text-xs text-muted-foreground">Groups</span>
              </div>
              <p className="text-2xl font-bold">{data.database.totalGroups}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {data.database.totalGroupTasks} заданий
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="text-xs text-muted-foreground">Записи</span>
              </div>
              <p className="text-2xl font-bold">{data.database.totalRecords}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {data.database.totalActivityLogs} логов
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Users by Role & Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Пользователи по ролям</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(data.database.usersByRole).map(([role, count]) => {
                  const percentage = Math.round(
                    (count / data.database.totalUsers) * 100
                  );
                  const roleLabels: Record<string, string> = {
                    STUDENT: "Students",
                    TEACHER: "Преподаватели",
                    ADMIN: "Администраторы",
                  };
                  return (
                    <div key={role}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{roleLabels[role] || role}</span>
                        <span className="font-bold">
                          {count} ({percentage}%)
                        </span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Статус пользователей</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(data.database.usersByStatus).map(
                  ([status, count]) => {
                    const percentage = Math.round(
                      (count / data.database.totalUsers) * 100
                    );
                    return (
                      <div key={status}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{status === "true" ? "Активные" : "Неактивные"}</span>
                          <span className="font-bold">
                            {count} ({percentage}%)
                          </span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  }
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Attempts by Hour */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Активность по часам (сегодня)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.attemptsByHour}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="hour"
                  className="text-xs"
                  tickFormatter={(h) => `${h}:00`}
                />
                <YAxis allowDecimals={false} className="text-xs" />
                <Tooltip
                  labelFormatter={(h) => `${h}:00`}
                  formatter={(value: number) => [value, "Attempts"]}
                />
                <Bar
                  dataKey="count"
                  fill="hsl(var(--primary))"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Tasks & Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Топ заданий по попыткам</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead className="text-right">Attempts</TableHead>
                    <TableHead className="text-right">Avg. score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topTasks.map((task) => (
                    <TableRow key={task.taskId}>
                      <TableCell className="font-mono">{task.taskId}</TableCell>
                      <TableCell className="text-right">{task.attemptsCount}</TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            task.avgScore >= 75
                              ? "default"
                              : task.avgScore >= 50
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {task.avgScore}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Активность по типам</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Действие</TableHead>
                    <TableHead className="text-right">Количество</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.activityByType.map((activity) => (
                    <TableRow key={activity.action}>
                      <TableCell className="font-medium">{activity.action}</TableCell>
                      <TableCell className="text-right font-bold">
                        {activity.count}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Group Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Статистика групп</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Group</TableHead>
                  <TableHead className="text-right">Students</TableHead>
                  <TableHead className="text-right">Задания</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.groupStats.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell className="font-medium">{group.name}</TableCell>
                    <TableCell className="text-right">{group.memberCount}</TableCell>
                    <TableCell className="text-right">{group.taskCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
