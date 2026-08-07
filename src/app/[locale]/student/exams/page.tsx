"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, FileText, Clock, Trophy } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSWRApi } from "@/hooks/use-swr-api";

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

interface ExamsData {
  exams: ExamRecord[];
}

export default function StudentExamHistoryPage() {
  const t = useTranslations("exams");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { status } = useSession();
  const router = useRouter();

  const { data, isLoading } = useSWRApi<ExamsData>(
    status === "authenticated" ? "/api/student/exams" : null
  );

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  if (status === "loading" || isLoading) {
    return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  const exams = data?.exams || [];

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/student"><Button variant="ghost" size="icon" aria-label={tc("back")}><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-xl font-bold">{t("title")}</h1>
      </div>

      {exams.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p>{t("empty")}</p>
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
                      <Badge variant={exam.mode === "exam" ? "default" : "secondary"}>{exam.mode === "exam" ? t("modeExam") : t("modePractice")}</Badge>
                      <span className="text-sm text-muted-foreground">{new Date(exam.createdAt).toLocaleString(locale)}</span>
                    </div>
                    <div className="flex gap-4 mt-2 text-sm">
                      <span className="flex items-center gap-1"><Trophy className="h-3 w-3 text-amber-600 dark:text-amber-400" /> {exam.avgScore}%</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {t("minutes", { count: Math.round(exam.timeSpent / 60) })}</span>
                      <span className="text-muted-foreground">{t("tasksCount", { count: taskIds.length })}</span>
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>{t("best", { score: exam.bestTaskScore })}</p>
                    <p>{t("worst", { score: exam.worstTaskScore })}</p>
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
