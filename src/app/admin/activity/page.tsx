"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useEffect, useState, useCallback } from "react";
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
import { ChevronLeft, ChevronRight, RefreshCw, Search } from "lucide-react";

interface Log {
  id: string;
  action: string;
  entity: string | null;
  details: string | null;
  createdAt: string;
  user: { name: string | null; email: string | null; role: string };
}

interface Pagination { page: number; limit: number; total: number; totalPages: number; }

const actionLabels: Record<string, string> = {
  LOGIN: "Вход",
  LOGOUT: "Выход",
  USER_CREATE: "Создание пользователя",
  USER_UPDATE: "Обновление пользователя",
  USER_DELETE: "Удаление пользователя",
  GROUP_CREATE: "Создание группы",
  GROUP_UPDATE: "Обновление группы",
  GROUP_DELETE: "Удаление группы",
  TASK_ASSIGN: "Назначение задания",
  TASK_UNASSIGN: "Отмена задания",
  SETTINGS_UPDATE: "Обновление настроек",
  EXPORT: "Экспорт",
};

const roleLabels: Record<string, string> = {
  ADMIN: "Админ",
  TEACHER: "Преподаватель",
  STUDENT: "Студент",
};

export default function AdminActivityPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");
  const [search, setSearch] = useState("");
  const [userId, setUserId] = useState("");

  const fetchLogs = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(pagination.page),
      limit: String(pagination.limit),
    });
    if (actionFilter) params.set("action", actionFilter);
    if (userId) params.set("userId", userId);

    fetch(`/api/admin/activity-log?${params}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        let filtered = data.logs || [];
        if (search) {
          const lower = search.toLowerCase();
          filtered = filtered.filter(
            (l: Log) =>
              (l.user.name || "").toLowerCase().includes(lower) ||
              (l.user.email || "").toLowerCase().includes(lower) ||
              (l.entity || "").toLowerCase().includes(lower) ||
              (l.details || "").toLowerCase().includes(lower)
          );
        }
        setLogs(filtered);
        setPagination(data.pagination);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [pagination.page, pagination.limit, actionFilter, userId, search]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const uniqueActions = [...new Set(logs.map((l) => l.action))];

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Журнал действий</h2>
          <Button variant="outline" size="sm" onClick={fetchLogs}>
            <RefreshCw className="h-4 w-4 mr-1" /> Обновить
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Фильтры</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Поиск</label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Пользователь, сущность..."
                    className="pl-8"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && fetchLogs()}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Тип действия</label>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger><SelectValue placeholder="Все действия" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Все действия</SelectItem>
                    {uniqueActions.map((a) => (
                      <SelectItem key={a} value={a}>{actionLabels[a] || a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Лимит на странице</label>
                <Select value={String(pagination.limit)} onValueChange={(v) => setPagination({ ...pagination, limit: parseInt(v), page: 1 })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button variant="outline" size="sm" onClick={() => { setSearch(""); setActionFilter(""); setUserId(""); }}>
                  Сбросить
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logs table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Действие</TableHead>
                  <TableHead>Пользователь</TableHead>
                  <TableHead>Сущность</TableHead>
                  <TableHead>Детали</TableHead>
                  <TableHead>Дата</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Записи не найдены</TableCell></TableRow>
                ) : logs.map((log) => {
                  const roleColor = log.user.role === "ADMIN" ? "bg-rose-100 text-rose-800" : log.user.role === "TEACHER" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800";
                  return (
                    <TableRow key={log.id}>
                      <TableCell><Badge variant="outline">{actionLabels[log.action] || log.action}</Badge></TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{log.user.name || log.user.email}</p>
                          <Badge className={`${roleColor} text-xs`}>{roleLabels[log.user.role] || log.user.role}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{log.entity || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{log.details || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString("ru-RU")}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

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
