"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
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
  AlertTriangle, AlertCircle, Info, ArrowRight, RefreshCw, Filter,
  TrendingDown, Clock, UserX, Users, BookOpen, GraduationCap, Target, CalendarClock,
} from "lucide-react";

interface SystemAlert {
  id: string;
  severity: "critical" | "warning" | "info";
  category: string;
  title: string;
  description: string;
  entity: { type: string; id: string; name: string };
  createdAt: string;
  actionable: boolean;
  actionUrl?: string;
}

interface Summary {
  critical: number;
  warning: number;
  info: number;
  total: number;
  actionable: number;
  categories: string[];
}

interface AlertsData {
  alerts: SystemAlert[];
  summary: Summary;
}

const severityConfig = {
  critical: { icon: <AlertTriangle className="h-4 w-4" />, label: "Критический", color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-950/50 border-rose-200" },
  warning: { icon: <AlertCircle className="h-4 w-4" />, label: "Предупреждение", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/50 border-amber-200" },
  info: { icon: <Info className="h-4 w-4" />, label: "Информация", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/50 border-blue-200" },
};

const categoryIcons: Record<string, React.ReactNode> = {
  STUDENT_RISK: <TrendingDown className="h-4 w-4" />,
  STUDENT_DECLINE: <TrendingDown className="h-4 w-4" />,
  STUDENT_ENGAGEMENT: <UserX className="h-4 w-4" />,
  GROUP_PERFORMANCE: <Users className="h-4 w-4" />,
  GROUP_INACTIVE: <Clock className="h-4 w-4" />,
  TASK_DIFFICULTY: <BookOpen className="h-4 w-4" />,
  TEACHER_INACTIVE: <GraduationCap className="h-4 w-4" />,
  DEADLINE_OVERDUE: <CalendarClock className="h-4 w-4" />,
  DEADLINE_APPROACHING: <CalendarClock className="h-4 w-4" />,
};

const categoryLabels: Record<string, string> = {
  STUDENT_RISK: "Студент с риском",
  STUDENT_DECLINE: "Снижение студента",
  STUDENT_ENGAGEMENT: "Вовлечённость студента",
  GROUP_PERFORMANCE: "Успеваемость группы",
  GROUP_INACTIVE: "Неактивность группы",
  TASK_DIFFICULTY: "Сложность задания",
  TEACHER_INACTIVE: "Неактивность преподавателя",
  DEADLINE_OVERDUE: "Просроченный дедлайн",
  DEADLINE_APPROACHING: "Приближающийся дедлайн",
};

export default function AdminAlertsPage() {
  const [data, setData] = useState<AlertsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  const fetchAlerts = () => {
    setLoading(true);
    fetch("/api/admin/alerts")
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  if (loading) return <AdminLayout><div className="p-8 text-center">Загрузка...</div></AdminLayout>;
  if (!data) return <AdminLayout><div className="p-8 text-center text-rose-600">Нет данных</div></AdminLayout>;

  const filtered = severityFilter === "all"
    ? data.alerts
    : data.alerts.filter((a) => a.severity === severityFilter);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Системные алерты</h2>
          <Button variant="outline" size="sm" onClick={fetchAlerts}>
            <RefreshCw className="h-4 w-4 mr-1" /> Обновить
          </Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground">Всего алертов</div>
              <div className="text-2xl font-bold">{data.summary.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-rose-600" /> Критические
              </div>
              <div className="text-2xl font-bold text-rose-600">{data.summary.critical}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertCircle className="h-3 w-3 text-amber-600" /> Предупреждения
              </div>
              <div className="text-2xl font-bold text-amber-600">{data.summary.warning}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3 text-blue-600" /> Информационные
              </div>
              <div className="text-2xl font-bold text-blue-600">{data.summary.info}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-xs text-muted-foreground">Требуют действий</div>
              <div className="text-2xl font-bold">{data.summary.actionable}</div>
            </CardContent>
          </Card>
        </div>

        {/* Severity filter */}
        <Tabs value={severityFilter} onValueChange={setSeverityFilter}>
          <div className="flex items-center gap-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <TabsList>
              <TabsTrigger value="all">Все ({data.alerts.length})</TabsTrigger>
              <TabsTrigger value="critical">Критические ({data.summary.critical})</TabsTrigger>
              <TabsTrigger value="warning">Предупреждения ({data.summary.warning})</TabsTrigger>
              <TabsTrigger value="info">Информация ({data.summary.info})</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={severityFilter}>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Список алертов</CardTitle>
                <CardDescription>
                  Автоматически обнаруженные проблемы и рекомендации
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {filtered.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Info className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    Нет алертов данной категории
                  </div>
                ) : (
                  <div className="space-y-2 p-4">
                    {filtered.map((alert) => {
                      const config = severityConfig[alert.severity];
                      return (
                        <div
                          key={alert.id}
                          className={`border rounded-lg p-4 ${config.bg}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={config.color}>
                              {config.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">{alert.title}</span>
                                <Badge
                                  variant={alert.severity === "critical" ? "destructive" : alert.severity === "warning" ? "secondary" : "outline"}
                                  className="text-xs"
                                >
                                  {config.label}
                                </Badge>
                                <Badge variant="outline" className="text-xs flex items-center gap-1">
                                  {categoryIcons[alert.category]}
                                  {categoryLabels[alert.category] || alert.category}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{alert.description}</p>
                              <div className="flex items-center gap-3 mt-2">
                                <span className="text-xs text-muted-foreground">
                                  {new Date(alert.createdAt).toLocaleString("ru-RU")}
                                </span>
                                {alert.actionable && alert.actionUrl && (
                                  <Link href={alert.actionUrl}>
                                    <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                                      Перейти <ArrowRight className="h-3 w-3 ml-1" />
                                    </Button>
                                  </Link>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Category breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Алерты по категориям</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {data.summary.categories.map((cat) => {
                const count = data.alerts.filter((a) => a.category === cat).length;
                const criticalCount = data.alerts.filter((a) => a.category === cat && a.severity === "critical").length;
                return (
                  <div key={cat} className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      {categoryIcons[cat] || <Info className="h-4 w-4" />}
                      <span className="text-sm font-medium">{categoryLabels[cat] || cat}</span>
                    </div>
                    <div className="text-xl font-bold">{count}</div>
                    {criticalCount > 0 && (
                      <div className="text-xs text-rose-600">{criticalCount} критических</div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
