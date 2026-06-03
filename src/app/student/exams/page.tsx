"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, FileText, Clock, Trophy } from "lucide-react";
import { logger } from "@/lib/logger";

interface ExamRecord {
  id: string;
  taskIds: string;
  timeLimit: number;
  mode: string;
  avgScore: number;
  bestTaskScore: number;
  worstTaskScore: number;
  timeSpent: number;
  createdAt: string;
}

export default function StudentExamHistoryPage() {
  const { status } = useSession();
  const router = useRouter();
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status !== "authenticated") return;

    const controller = new AbortController();
    fetch("/api/student/exams", { signal: controller.signal })
      .then(async (r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data) => { if (!controller.signal.aborted) { setExams(data.exams || []); setLoading(false); } })
      .catch((err) => { if (!controller.signal.aborted) { logger.error("Failed to load exam history", err instanceof Error ? err : undefined); setLoading(false); } });
    return () => controller.abort();
  }, [status, router]);

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/student"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-xl font-bold">История экзаменов</h1>
      </div>

      {exams.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p>Нет сохранённых результатов экзаменов</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {exams.map((exam) => {
            const taskIds: number[] = (() => { try { return JSON.parse(exam.taskIds); } catch { return []; } })();
            return (
              <Card key={exam.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={exam.mode === "exam" ? "default" : "secondary"}>{exam.mode === "exam" ? "Экзамен" : "Тренировка"}</Badge>
                      <span className="text-sm text-muted-foreground">{new Date(exam.createdAt).toLocaleString("ru-RU")}</span>
                    </div>
                    <div className="flex gap-4 mt-2 text-sm">
                      <span className="flex items-center gap-1"><Trophy className="h-3 w-3 text-amber-600 dark:text-amber-400" /> {exam.avgScore}%</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {Math.round(exam.timeSpent / 60)}мин</span>
                      <span className="text-muted-foreground">{taskIds.length} заданий</span>
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>Лучшее: {exam.bestTaskScore}%</p>
                    <p>Худшее: {exam.worstTaskScore}%</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
