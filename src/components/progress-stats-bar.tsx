"use client";

import { memo } from "react";
import { tasks } from "@/lib/tasks";
import type { TaskProgress } from "@/lib/storage";
import { Trophy, Download, Upload, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

interface ProgressStatsBarProps {
  completedCount: number;
  totalTasks: number;
  savedProgress: Record<number, TaskProgress>;
  resetDialogOpen: boolean;
  onResetDialogOpenChange: (open: boolean) => void;
  onExport: () => void;
  onImport: () => void;
  onResetAll: () => void;
}

export const ProgressStatsBar = memo(function ProgressStatsBar({
  completedCount,
  totalTasks,
  savedProgress,
  resetDialogOpen,
  onResetDialogOpenChange,
  onExport,
  onImport,
  onResetAll,
}: ProgressStatsBarProps) {
  const percentage = (completedCount / totalTasks) * 100;

  const barGradient =
    completedCount >= 5
      ? "linear-gradient(to right, #10b981, #059669)"
      : completedCount >= 3
        ? "linear-gradient(to right, #f59e0b, #10b981)"
        : "linear-gradient(to right, #ef4444, #f59e0b)";

  return (
    <div className="mb-4 sm:mb-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm">
          <Trophy className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="font-medium">
            Выполнено: {completedCount} из {totalTasks} заданий
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
            onClick={onExport}
            title="Экспортировать прогресс"
          >
            <Download className="h-3 w-3 mr-1" />
            Экспорт
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
            onClick={onImport}
            title="Импортировать прогресс"
          >
            <Upload className="h-3 w-3 mr-1" />
            Импорт
          </Button>

          <AlertDialog open={resetDialogOpen} onOpenChange={onResetDialogOpenChange}>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-destructive"
                title="Сбросить весь прогресс"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Сбросить
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
                <AlertDialogDescription>
                  Весь прогресс будет безвозвратно удалён.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onResetAll}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Удалить всё
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%`, background: barGradient }}
        />
      </div>

      {completedCount > 0 && (
        <div className="mt-3 -mx-1 px-1">
          <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar snap-x snap-mandatory">
            {Object.entries(savedProgress).map(([taskId, progress]) => {
              const task = tasks.find((t) => t.id === Number(taskId));
              if (!task) return null;
              return (
                <span
                  key={taskId}
                  className="shrink-0 snap-start text-[10px] px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                >
                  {task.name}: {progress.score}%
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});
