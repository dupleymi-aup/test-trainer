"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, BookOpen, Clock, CheckCircle2, Loader2 } from "lucide-react";
import { tasks } from "@/lib/tasks";
import { logger } from "@/lib/logger";

interface TemplateAssignment {
  id: string;
  template: {
    id: string;
    name: string;
    description: string | null;
    taskIds: string;
    topics: string | null;
    estimatedHours: number | null;
  };
  group: {
    id: string;
    name: string;
  };
  assignedAt: string;
}

interface TemplateProgress {
  templateId: string;
  completedTasks: number;
  totalTasks: number;
}

export default function StudentLearningPathPage() {
  const { status } = useSession();
  const router = useRouter();
  const [assignments, setAssignments] = useState<TemplateAssignment[]>([]);
  const [progress, setProgress] = useState<Record<string, TemplateProgress>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status !== "authenticated") return;

    const controller = new AbortController();
    Promise.all([
      fetch("/api/student/learning-path", { signal: controller.signal }).then(async (r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); }),
    ])
      .then(([data]) => {
        if (!controller.signal.aborted) {
          setAssignments(data.assignments || []);
          setProgress(data.progress || {});
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          logger.error("Failed to load learning path", err instanceof Error ? err : undefined);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [status, router]);

  const getTaskName = (taskId: number) => {
    const task = tasks.find((t) => t.id === taskId);
    return task?.name || `Задание ${taskId}`;
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/student"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-xl font-bold">Учебный план</h1>
      </div>

      {assignments.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p>У вас пока нет назначенных учебных планов</p>
          <p className="text-xs mt-1">Преподаватель может назначить вам курс с последовательностью заданий</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          {assignments.map((assignment) => {
            const prog = progress[assignment.template.id];
            const taskIds: number[] = JSON.parse(assignment.template.taskIds || "[]");
            const completed = prog?.completedTasks || 0;
            const total = taskIds.length;
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

            return (
              <Card key={assignment.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{assignment.template.name}</h3>
                      {assignment.template.description && (
                        <p className="text-xs text-muted-foreground">{assignment.template.description}</p>
                      )}
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{assignment.group.name}</Badge>
                        {assignment.template.estimatedHours && (
                          <Badge variant="outline" className="text-xs gap-1"><Clock className="h-3 w-3" /> {assignment.template.estimatedHours}ч</Badge>
                        )}
                      </div>
                    </div>
                    <Badge variant={pct >= 100 ? "default" : "secondary"}>{completed}/{total}</Badge>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Прогресс</span><span>{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>

                  <div className="space-y-1">
                    {taskIds.map((taskId, idx) => {
                      const task = tasks.find((t) => t.id === taskId);
                      const isCompleted = false; // We'd need per-task progress from the API
                      return (
                        <Link key={taskId} href={`/trainer?task=${taskId}`} className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 text-sm">
                          <CheckCircle2 className={`h-4 w-4 ${isCompleted ? "text-emerald-600" : "text-muted-foreground/30"}`} />
                          <span className="flex-1">{idx + 1}. {getTaskName(taskId)}</span>
                          {task && <Badge variant="outline" className="text-[10px]">{task.difficulty}</Badge>}
                        </Link>
                      );
                    })}
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
