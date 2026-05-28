"use client";

import { TeacherLayout } from "@/components/teacher/teacher-layout";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import Link from "next/link";

interface Student {
  id: string;
  name: string | null;
  email: string | null;
  group: string | null;
  bestScore: number;
  avgEc: number;
  avgBv: number;
  attemptsCount: number;
  lastAttempt: string | null;
}

export default function TeacherStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/teacher/students", { signal: controller.signal })
      .then(async (r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data) => { if (!controller.signal.aborted) { setStudents(data.students); setLoading(false); } })
      .catch(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  if (loading) return <TeacherLayout><div className="p-8 text-center">Загрузка...</div></TeacherLayout>;

  const filtered = search
    ? students.filter((s) => (s.name?.toLowerCase().includes(search.toLowerCase()) || s.email?.toLowerCase().includes(search.toLowerCase())))
    : students;

  return (
    <TeacherLayout>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Студенты</CardTitle>
          <div className="relative max-w-xs">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Поиск по имени или email..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {filtered.map((s) => (
              <Link key={s.id} href={`/teacher/students/${s.id}`}>
                <div className="flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{s.name || s.email}</p>
                    {s.group && <p className="text-xs text-muted-foreground">{s.group}</p>}
                  </div>
                  <div className="flex gap-6 items-center">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">EC</p>
                      <p className="font-bold text-sm">{s.avgEc}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">BV</p>
                      <p className="font-bold text-sm">{s.avgBv}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Лучший</p>
                      <Badge variant={s.bestScore >= 75 ? "default" : "secondary"}>{s.bestScore}%</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{s.attemptsCount} попыток</span>
                  </div>
                </div>
              </Link>
            ))}
            {filtered.length === 0 && <p className="p-8 text-center text-muted-foreground">Студенты не найдены</p>}
          </div>
        </CardContent>
      </Card>
    </TeacherLayout>
  );
}
