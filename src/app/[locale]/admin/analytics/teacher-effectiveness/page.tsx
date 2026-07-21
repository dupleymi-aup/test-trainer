"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useFetchData } from "@/hooks/use-fetch-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  Legend,
} from "recharts";
import { PrintButton } from "@/components/admin/analytics/print-button";
import {
  GraduationCap,
  TrendingUp,
  Target,
  Award,
} from "lucide-react";

interface TeacherData {
  teacherId: string;
  name: string;
  university: string;
  groupsCount: number;
  studentsCount: number;
  totalAttempts: number;
  attemptsPerStudent: number;
  avgStudentScore: number;
  improvementRate: number;
  retentionRate: number;
  riskRate: number;
  compositeScore: number;
  grade: string;
}

interface EffectivenessData {
  teachers: TeacherData[];
  summary: {
    totalTeachers: number;
    avgComposite: number;
    topTeacher: string;
    avgImprovementRate: number;
    avgRetentionRate: number;
  };
}

const gradeColors: Record<string, string> = {
  A: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
  B: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  C: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  D: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300",
};

export default function TeacherEffectivenessPage() {
  const { data, loading, error } = useFetchData<EffectivenessData>("/api/admin/analytics/teacher-effectiveness");

  if (loading) return <AdminLayout><div className="p-8 text-center">Loading...</div></AdminLayout>;
  if (error && !loading) return <AdminLayout><Card><CardContent className="py-6 text-center"><p className="text-sm text-destructive">Load error: {error}</p></CardContent></Card></AdminLayout>;
  if (!data) return <AdminLayout><div className="p-8 text-center">Ошибка загрузки</div></AdminLayout>;

  const radarData = data.teachers.slice(0, 5).map((t) => ({
    subject: t.name.length > 15 ? t.name.slice(0, 15) + "..." : t.name,
    score: t.avgStudentScore,
    improvement: t.improvementRate,
    retention: t.retentionRate,
    lowRisk: 100 - t.riskRate,
  }));

  const barData = data.teachers.slice(0, 10).map((t) => ({
    name: t.name.length > 15 ? t.name.slice(0, 15) + "..." : t.name,
    composite: t.compositeScore,
  }));

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Эффективность преподавателей</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Влияние на прогресс студентов, композитный score, рейтинг
            </p>
          </div>
          <PrintButton />
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1"><GraduationCap className="h-4 w-4 text-amber-600 dark:text-amber-400" /><span className="text-xs text-muted-foreground">Преподаватели</span></div>
              <p className="text-2xl font-bold">{data.summary.totalTeachers}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1"><Award className="h-4 w-4 text-emerald-600" /><span className="text-xs text-muted-foreground">Ср. композит</span></div>
              <p className="text-2xl font-bold">{data.summary.avgComposite}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1"><TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" /><span className="text-xs text-muted-foreground">Ср. улучшение</span></div>
              <p className="text-2xl font-bold">{data.summary.avgImprovementRate}%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-1"><Target className="h-4 w-4 text-purple-600" /><span className="text-xs text-muted-foreground">Ср. удержание</span></div>
              <p className="text-2xl font-bold">{data.summary.avgRetentionRate}%</p>
            </CardContent>
          </Card>
        </div>

        {/* Radar chart for top 5 */}
        {radarData.length >= 2 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Радар топ-5 преподавателей</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" className="text-xs" />
                  <Radar name="Avg. Score" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                  <Radar name="Improvement" dataKey="improvement" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                  <Radar name="Retention" dataKey="retention" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
                  <Radar name="Low Risk" dataKey="lowRisk" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Bar chart */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Композитный score преподавателей</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis domain={[0, 100]} className="text-xs" />
                <Tooltip />
                <Bar dataKey="composite" radius={[4, 4, 0, 0]}>
                  {barData.map((entry, i) => (
                    <Bar key={i} dataKey="composite" fill={entry.composite >= 80 ? "#10b981" : entry.composite >= 65 ? "#3b82f6" : entry.composite >= 50 ? "#f59e0b" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Teacher ranking table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Рейтинг преподавателей</CardTitle>
            <CardDescription>Композитный score: 30% ср. балл + 25% улучшение + 25% удержание + 20% низкий риск</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Преподаватель</TableHead>
                  <TableHead className="text-center">Groups</TableHead>
                  <TableHead className="text-center">Students</TableHead>
                  <TableHead className="text-center">Попыток/студ</TableHead>
                  <TableHead className="text-center">Avg. score</TableHead>
                  <TableHead className="text-center">Улучшение</TableHead>
                  <TableHead className="text-center">Удержание</TableHead>
                  <TableHead className="text-center">Риск</TableHead>
                  <TableHead className="text-center">Score</TableHead>
                  <TableHead className="text-center">Grade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.teachers.map((t, i) => (
                  <TableRow key={t.teacherId}>
                    <TableCell className="font-bold text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">
                      <div>{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.university}</div>
                    </TableCell>
                    <TableCell className="text-center">{t.groupsCount}</TableCell>
                    <TableCell className="text-center">{t.studentsCount}</TableCell>
                    <TableCell className="text-center">{t.attemptsPerStudent}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={t.avgStudentScore >= 75 ? "default" : t.avgStudentScore >= 50 ? "secondary" : "destructive"}>{t.avgStudentScore}%</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={t.improvementRate >= 40 ? "text-emerald-600 font-bold" : t.improvementRate >= 20 ? "text-amber-600 dark:text-amber-400" : "text-rose-600"}>
                        {t.improvementRate}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center gap-2 justify-center">
                        <Progress value={t.retentionRate} className="w-12 h-2" />
                        <span className="text-xs font-bold">{t.retentionRate}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={t.riskRate <= 20 ? "text-emerald-600" : t.riskRate <= 40 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 font-bold"}>
                        {t.riskRate}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-lg font-bold">{t.compositeScore}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={gradeColors[t.grade]}>{t.grade}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {data.teachers.length === 0 && (
                  <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">Нет преподавателей</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
