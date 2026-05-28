"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Minus,
  Clock,
  UserX,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface RiskStudent {
  id: string;
  name: string;
  email: string;
  group: string;
  university: string;
  stats: { bestScore: number; avgScore: number; attemptsCount: number; lastAttemptDate: string | null };
  riskLevel: "high" | "medium" | "low" | "none";
  trend: "improving" | "declining" | "stable";
}

interface Pagination { page: number; limit: number; total: number; totalPages: number; }

const _riskFactorConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  low_performer: { label: "Низкий балл", icon: <AlertTriangle className="h-3 w-3" />, color: "bg-rose-100 text-rose-800" },
  declining: { label: "Снижение", icon: <TrendingDown className="h-3 w-3" />, color: "bg-amber-100 text-amber-800" },
  inactive: { label: "Неактивен", icon: <Clock className="h-3 w-3" />, color: "bg-blue-100 text-blue-800" },
  low_engagement: { label: "Мало попыток", icon: <UserX className="h-3 w-3" />, color: "bg-purple-100 text-purple-800" },
};

const riskLevelConfig: Record<string, { label: string; variant: "destructive" | "default" | "secondary" | "outline" }> = {
  high: { label: "Высокий", variant: "destructive" },
  medium: { label: "Средний", variant: "default" },
  low: { label: "Низкий", variant: "secondary" },
  none: { label: "Нет риска", variant: "outline" },
};

export default function AdminAtRiskPage() {
  const [students, setStudents] = useState<RiskStudent[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [riskLevel, setRiskLevel] = useState("");
  const [university, setUniversity] = useState("");

  const fetchStudents = () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(pagination.page),
      limit: String(pagination.limit),
    });
    if (search) params.set("search", search);
    if (riskLevel) params.set("riskLevel", riskLevel);
    if (university) params.set("university", university);

    fetch(`/api/admin/reports/students?${params}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setStudents(data.students || []);
        setPagination(data.pagination || pagination);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchStudents(); }, [pagination.page, riskLevel, university]);

  const handleSearch = () => { fetchStudents(); };

  if (loading) return <AdminLayout><div className="p-8 text-center">Загрузка...</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Студенты группы риска</h2>
          <Badge variant="destructive">{pagination.total} студентов</Badge>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Фильтры</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Поиск</label>
                <Input placeholder="Имя или email" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Уровень риска</label>
                <Select value={riskLevel} onValueChange={setRiskLevel}>
                  <SelectTrigger><SelectValue placeholder="Все уровни" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Все уровни</SelectItem>
                    <SelectItem value="high">Высокий</SelectItem>
                    <SelectItem value="medium">Средний</SelectItem>
                    <SelectItem value="low">Низкий</SelectItem>
                    <SelectItem value="none">Без риска</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Университет</label>
                <Input placeholder="Название" value={university} onChange={(e) => setUniversity(e.target.value)} />
              </div>
              <div className="flex items-end gap-2">
                <Button size="sm" onClick={handleSearch}>Найти</Button>
                <Button variant="outline" size="sm" onClick={() => { setSearch(""); setRiskLevel(""); setUniversity(""); }}>Сброс</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Students table */}
        {students.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-emerald-600" />
              <p className="text-muted-foreground">Студенты группы риска не найдены</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Студент</TableHead>
                    <TableHead>Уровень риска</TableHead>
                    <TableHead>Тренд</TableHead>
                    <TableHead className="text-right">Лучший балл</TableHead>
                    <TableHead className="text-right">Ср. балл</TableHead>
                    <TableHead className="text-right">Попытки</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((s) => {
                    const rl = riskLevelConfig[s.riskLevel];
                    return (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{s.name}</p>
                            {s.group && <p className="text-xs text-muted-foreground">{s.group}</p>}
                            {s.university && <p className="text-xs text-muted-foreground">{s.university}</p>}
                          </div>
                        </TableCell>
                        <TableCell><Badge variant={rl.variant}>{rl.label}</Badge></TableCell>
                        <TableCell>
                          {s.trend === "improving" && <TrendingUp className="h-4 w-4 text-green-600 inline" />}
                          {s.trend === "declining" && <TrendingDown className="h-4 w-4 text-rose-600 inline" />}
                          {s.trend === "stable" && <Minus className="h-4 w-4 text-muted-foreground inline" />}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={s.stats.bestScore >= 75 ? "default" : s.stats.bestScore >= 50 ? "secondary" : "destructive"}>
                            {s.stats.bestScore}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{s.stats.avgScore}%</TableCell>
                        <TableCell className="text-right">{s.stats.attemptsCount}</TableCell>
                        <TableCell>
                          <Link href={`/admin/analytics/student/${s.id}`} className="text-xs text-primary hover:underline">
                            Подробнее
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Страница {pagination.page} из {pagination.totalPages} ({pagination.total} записей)
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Назад
              </Button>
              <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}>
                Вперёд <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
