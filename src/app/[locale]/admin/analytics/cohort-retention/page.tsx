"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useFetchData } from "@/hooks/use-fetch-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import dynamic from "next/dynamic";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, TrendingUp, UserCheck, UserX } from "lucide-react";

const CohortRetentionChart = dynamic(
  () => import("@/components/admin/analytics/charts/cohort-retention-chart").then((m) => m.CohortRetentionChart),
  { ssr: false, loading: () => <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Загрузка графика...</CardContent></Card> }
);

const WeeklyActivityBarChart = dynamic(
  () => import("@/components/admin/analytics/charts/weekly-activity-bar-chart").then((m) => m.WeeklyActivityBarChart),
  { ssr: false, loading: () => <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Загрузка графика...</CardContent></Card> }
);

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

interface CohortRetentionData {
  cohortChartData: CohortData[];
  weeklyTrends: WeeklyTrend[];
  groupData: GroupData[];
  totalStudents: number;
  totalCohorts: number;
}

export default function AdminCohortRetentionPage() {
  const { data, loading, error } = useFetchData<CohortRetentionData>("/api/admin/analytics/cohort-retention");

  if (loading) return <AdminLayout><div className="p-8 text-center">Загрузка...</div></AdminLayout>;

  if (error) return <AdminLayout><Card><CardContent className="py-6 text-center"><p className="text-sm text-destructive">Ошибка загрузки: {error}</p></CardContent></Card></AdminLayout>;

  if (!data) return <AdminLayout><div className="p-8 text-center">Нет данных</div></AdminLayout>;

  const { cohortChartData, weeklyTrends, groupData, totalStudents, totalCohorts } = data;

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
                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
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
            <CohortRetentionChart data={retentionCurves} />
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
            <WeeklyActivityBarChart data={weeklyTrends} />
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
