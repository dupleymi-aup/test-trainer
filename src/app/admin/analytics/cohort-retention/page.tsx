"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, TrendingUp, UserCheck, UserX } from "lucide-react";

interface CohortData {
  cohort: string;
  students: number;
  day1: number; day3: number; day7: number; day14: number;
  day30: number; day60: number; day90: number;
  retention1: number; retention7: number; retention30: number; retention90: number;
}

interface WeeklyTrend {
  week: string;
  activeStudents: number;
  attempts: number;
  avgScore: number;
  newStudents: number;
}

interface GroupData {
  groupId: string;
  groupName: string;
  total: number;
  active: number;
  inactive: number;
  retentionRate: number;
}

const monthLabels: Record<string, string> = {
  "01": "Янв", "02": "Фев", "03": "Мар", "04": "Апр", "05": "Май", "06": "Июн",
  "07": "Июл", "08": "Авг", "09": "Сен", "10": "Окт", "11": "Ноя", "12": "Дек",
};

function formatCohort(cohort: string) {
  const [year, month] = cohort.split("-");
  return `${monthLabels[month] || month} ${year}`;
}

function RetentionBadge({ value }: { value: number }) {
  const variant = value >= 70 ? "default" : value >= 40 ? "secondary" : "destructive";
  return <Badge variant={variant}>{value}%</Badge>;
}

export default function AdminCohortRetentionPage() {
  const [cohortChartData, setCohortChartData] = useState<CohortData[]>([]);
  const [weeklyTrends, setWeeklyTrends] = useState<WeeklyTrend[]>([]);
  const [groupData, setGroupData] = useState<GroupData[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalCohorts, setTotalCohorts] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics/cohort-retention")
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setCohortChartData(data.cohortChartData || []);
        setWeeklyTrends(data.weeklyTrends || []);
        setGroupData(data.groupData || []);
        setTotalStudents(data.totalStudents || 0);
        setTotalCohorts(data.totalCohorts || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <AdminLayout><div className="p-8 text-center">Загрузка...</div></AdminLayout>;

  // Prepare retention curve data
  const retentionCurves = cohortChartData.map((c) => ({
    cohort: formatCohort(c.cohort),
    "Регистрация": c.students,
    "День 1": c.day1,
    "День 7": c.day7,
    "День 30": c.day30,
    "День 90": c.day90,
  }));

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold">Когортный анализ удержения</h1>
          <p className="text-sm text-muted-foreground">
            Как студенты остаются активными с течением времени по когортам регистрации
          </p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="text-xs text-muted-foreground">Всего студентов</span>
              </div>
              <p className="text-2xl font-bold">{totalStudents}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                <span className="text-xs text-muted-foreground">Когорт</span>
              </div>
              <p className="text-2xl font-bold">{totalCohorts}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <UserCheck className="h-4 w-4 text-green-600" />
                <span className="text-xs text-muted-foreground">Ср. удержание (7д)</span>
              </div>
              <p className="text-2xl font-bold">
                {cohortChartData.length > 0 ? Math.round(cohortChartData.reduce((s, c) => s + c.retention7, 0) / cohortChartData.length) : 0}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <UserX className="h-4 w-4 text-red-600" />
                <span className="text-xs text-muted-foreground">Ср. удержание (30д)</span>
              </div>
              <p className="text-2xl font-bold">
                {cohortChartData.length > 0 ? Math.round(cohortChartData.reduce((s, c) => s + c.retention30, 0) / cohortChartData.length) : 0}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Retention Curves */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Кривые удержания по когортам</CardTitle>
            <CardDescription>Количество активных студентов через 1, 7, 30 и 90 дней</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={retentionCurves}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="cohort" className="text-xs" />
                <YAxis allowDecimals={false} className="text-xs" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Регистрация" stroke="hsl(var(--primary))" strokeWidth={2} />
                <Line type="monotone" dataKey="День 1" stroke="#22c55e" strokeWidth={2} />
                <Line type="monotone" dataKey="День 7" stroke="#eab308" strokeWidth={2} />
                <Line type="monotone" dataKey="День 30" stroke="#f97316" strokeWidth={2} />
                <Line type="monotone" dataKey="День 90" stroke="#ef4444" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Retention Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Таблица удержания по когортам</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Когорта</TableHead>
                  <TableHead className="text-right">Студентов</TableHead>
                  <TableHead className="text-center">День 1</TableHead>
                  <TableHead className="text-center">День 7</TableHead>
                  <TableHead className="text-center">День 30</TableHead>
                  <TableHead className="text-center">День 90</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cohortChartData.map((c) => (
                  <TableRow key={c.cohort}>
                    <TableCell className="font-medium">{formatCohort(c.cohort)}</TableCell>
                    <TableCell className="text-right font-bold">{c.students}</TableCell>
                    <TableCell className="text-center"><RetentionBadge value={c.retention1} /></TableCell>
                    <TableCell className="text-center"><RetentionBadge value={c.retention7} /></TableCell>
                    <TableCell className="text-center"><RetentionBadge value={c.retention30} /></TableCell>
                    <TableCell className="text-center"><RetentionBadge value={c.retention90} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Weekly Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Еженедельная активность (12 недель)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyTrends}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="week" className="text-xs" />
                <YAxis allowDecimals={false} className="text-xs" />
                <Tooltip />
                <Legend />
                <Bar dataKey="activeStudents" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} name="Активные студенты" />
                <Bar dataKey="newStudents" fill="#22c55e" radius={[2, 2, 0, 0]} name="Новые студенты" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Group Retention */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Удержание по группам</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Группа</TableHead>
                  <TableHead className="text-right">Всего</TableHead>
                  <TableHead className="text-right">Активные</TableHead>
                  <TableHead className="text-right">Неактивные</TableHead>
                  <TableHead className="min-w-[150px]">Удержание</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupData.map((g) => (
                  <TableRow key={g.groupId}>
                    <TableCell className="font-medium">{g.groupName}</TableCell>
                    <TableCell className="text-right">{g.total}</TableCell>
                    <TableCell className="text-right text-green-600">{g.active}</TableCell>
                    <TableCell className="text-right text-red-600">{g.inactive}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={g.retentionRate} className="h-2 flex-1" />
                        <span className="text-sm font-bold w-10 text-right">{g.retentionRate}%</span>
                      </div>
                    </TableCell>
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
