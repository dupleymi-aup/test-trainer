"use client";

import { AdminLayout } from "@/components/admin/admin-layout";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Log {
  id: string;
  action: string;
  entity: string | null;
  details: string | null;
  createdAt: string;
  user: { name: string | null; email: string | null; role: string };
}

export default function AdminActivityPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/activity-log")
      .then((r) => r.json())
      .then((data) => {
        setLogs(data.logs);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <AdminLayout><div className="p-8 text-center">Загрузка...</div></AdminLayout>;

  return (
    <AdminLayout>
      <Card>
        <CardHeader><CardTitle className="text-sm">Журнал действий</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Действие</TableHead>
                <TableHead>Пользователь</TableHead>
                <TableHead>Сущность</TableHead>
                <TableHead>Дата</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell><Badge variant="outline">{log.action}</Badge></TableCell>
                  <TableCell>{log.user.name || log.user.email}</TableCell>
                  <TableCell>{log.entity || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString("ru-RU")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
