"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Target,
  Flame,
  Clock,
  ArrowRight,
  TrendingDown,
  Minus,
  ChevronDown,
} from "lucide-react";
import { tasks } from "@/lib/tasks";
import type { AttemptRecord, StreakData } from "@/lib/storage";
import { getTaskHistory, loadStreak } from "@/lib/storage";

interface StatisticsPanelProps {
  attempts: AttemptRecord[];
}

export function StatisticsPanel({ attempts }: StatisticsPanelProps) {
  const [streak] = useState<StreakData>(() => loadStreak());
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());

  // Load history once and memoize task stats
  const taskStats = useMemo(() => {
    const allHistory = loadAttemptHistory();
    return tasks.map((task) => {
      const history = allHistory.filter((r) => r.taskId === task.id);
      const bestScore = history.reduce((max, r) => Math.max(max, r.score), 0);
      const avgScore = history.length > 0
        ? Math.round(history.reduce((sum, r) => sum + r.score, 0) / history.length)
        : 0;
      const attemptsCount = history.length;
      const trend = history.length >= 2
        ? history[history.length - 1].score - history[history.length - 2].score
        : 0;
      const sparklineData = history.map((h) => h.score);

      return { task, bestScore, avgScore, attempts: attemptsCount, trend, history, sparklineData };
    });
  }, [attempts]);

  const totalAttempts = attempts.length;
  const avgOverallScore = totalAttempts > 0
    ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / totalAttempts)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Summary */}
      <Card className="border-emerald-200 dark:border-emerald-800">
        <CardContent className="pt-6">
          <div className="text-center mb-4">
            <h2 className="text-lg font-bold flex items-center justify-center gap-2">
              <BarChart3 className="h-5 w-5 text-emerald-600" />
              Статистика
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              История ваших попыток и прогресс по заданиям
            </p>
          </div>

          {/* Streak display */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-bold text-orange-700 dark:text-orange-400">
                {streak.currentStreak}
              </span>
              <span className="text-xs text-orange-600 dark:text-orange-500">
                дн. подряд
              </span>
            </div>
            {streak.longestStreak > 0 && (
              <span className="text-xs text-muted-foreground">
                Рекорд: {streak.longestStreak} дн.
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-emerald-600">{totalAttempts}</p>
              <p className="text-xs text-muted-foreground">Попыток</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-teal-600">{avgOverallScore}%</p>
              <p className="text-xs text-muted-foreground">Средний балл</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">
                {taskStats.filter((t) => t.bestScore >= 90).length}/{tasks.length}
              </p>
              <p className="text-xs text-muted-foreground">Отлично</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent attempts timeline */}
      {attempts.length > 0 && (
        <Card>
          <CardContent className="pt-5 pb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4" />
              Последние попытки
            </h3>
            <div className="space-y-2">
              {attempts.slice(-10).reverse().map((attempt, i) => {
                const task = tasks.find((t) => t.id === attempt.taskId);
                const date = new Date(attempt.timestamp);
                const now = new Date();
                const diffMs = now.getTime() - date.getTime();
                const diffMin = Math.floor(diffMs / 60000);
                const diffHr = Math.floor(diffMs / 3600000);
                const diffDay = Math.floor(diffMs / 86400000);

                let timeLabel: string;
                if (diffMin < 1) timeLabel = "только что";
                else if (diffMin < 60) timeLabel = `${diffMin} мин. назад`;
                else if (diffHr < 24) timeLabel = `${diffHr} ч. назад`;
                else if (diffDay < 7) timeLabel = `${diffDay} дн. назад`;
                else timeLabel = date.toLocaleDateString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

                // Find previous attempt for same task to compute trend
                const taskHistory = attempts.filter((a) => a.taskId === attempt.taskId);
                const thisIdx = taskHistory.findIndex((a) => a.timestamp === attempt.timestamp);
                const prevAttempt = thisIdx > 0 ? taskHistory[thisIdx - 1] : null;
                const trendDiff = prevAttempt ? attempt.score - prevAttempt.score : 0;

                const scoreColor = attempt.score >= 90
                  ? "text-emerald-600 dark:text-emerald-400"
                  : attempt.score >= 60
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-rose-600 dark:text-rose-400";

                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors"
                  >
                    <div className="shrink-0 w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        {attempt.taskId}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium truncate">
                          {task?.name ?? `Задание ${attempt.taskId}`}
                        </span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className={`text-sm font-bold ${scoreColor}`}>
                          {attempt.score}%
                        </span>
                        {trendDiff !== 0 && (
                          <span className={`text-[10px] font-medium flex items-center gap-0.5 ${trendDiff > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                            {trendDiff > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {trendDiff > 0 ? "+" : ""}{trendDiff}%
                          </span>
                        )}
                        {trendDiff === 0 && thisIdx > 0 && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Minus className="h-3 w-3" />0%
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span>EC: {attempt.ecCoverage}%</span>
                        <span>BV: {attempt.bvCoverage}%</span>
                        <span>{attempt.testCasesCount} тест{attempt.testCasesCount === 1 ? "" : attempt.testCasesCount >= 2 && attempt.testCasesCount <= 4 ? "а" : "ов"}</span>
                      </div>
                    </div>
                    <span className="shrink-0 text-[11px] text-muted-foreground whitespace-nowrap">
                      {timeLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Per-task stats */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Target className="h-4 w-4" />
          Детализация по заданиям
        </h3>
        {taskStats.map(({ task, bestScore, avgScore, attempts: count, trend, history, sparklineData }) => {
          const isExpanded = expandedTasks.has(task.id);
          return (
          <Card key={task.id}>
            <CardContent className="pt-4 pb-4">
              <button
                onClick={() => {
                  if (history.length === 0) return;
                  const next = new Set(expandedTasks);
                  if (next.has(task.id)) next.delete(task.id);
                  else next.add(task.id);
                  setExpandedTasks(next);
                }}
                className="w-full"
                disabled={history.length === 0}
              >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{task.name}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {task.difficulty}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {trend !== 0 && (
                    <span className={`text-[10px] font-medium ${trend > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {trend > 0 ? "↑" : "↓"}{Math.abs(trend)}%
                    </span>
                  )}
                  {bestScore > 0 && (
                    <Badge className="bg-amber-100 text-amber-800 text-[10px] dark:bg-amber-900/30 dark:text-amber-400">
                      {bestScore}%
                    </Badge>
                  )}
                  {history.length > 0 && (
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <Progress value={bestScore} className="h-1.5 flex-1" />
                <span>{count} попыт{count === 1 ? "ка" : count >= 2 && count <= 4 ? "ки" : "ок"}</span>
                {avgScore > 0 && <span>Ср: {avgScore}%</span>}
              </div>
              {sparklineData.length >= 2 && (
                <div className="flex items-end gap-px h-4 mt-1.5">
                  {sparklineData.slice(-8).map((score, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t-sm min-w-[3px]"
                      style={{
                        height: `${Math.max(2, (score / 100) * 16)}px`,
                        backgroundColor:
                          score >= 90
                            ? "#10b981"
                            : score >= 60
                              ? "#f59e0b"
                              : "#ef4444",
                        opacity: i === sparklineData.slice(-8).length - 1 ? 1 : 0.5 + (i / sparklineData.slice(-8).length) * 0.5,
                      }}
                      title={`Попытка: ${score}%`}
                    />
                  ))}
                </div>
              )}
              </button>
              {isExpanded && history.length > 0 && (
                <div className="mt-3 pt-3 border-t space-y-1.5">
                  {history.slice().reverse().map((h, i) => {
                    const date = new Date(h.timestamp);
                    const scoreColor = h.score >= 90
                      ? "text-emerald-600 dark:text-emerald-400"
                      : h.score >= 60
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-rose-600 dark:text-rose-400";
                    return (
                      <div key={i} className="flex items-center justify-between text-xs p-1.5 rounded bg-muted/30">
                        <div className="flex items-center gap-3">
                          <span className={`font-bold ${scoreColor}`}>{h.score}%</span>
                          <span className="text-muted-foreground">EC: {h.ecCoverage}%</span>
                          <span className="text-muted-foreground">BV: {h.bvCoverage}%</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span>{h.testCasesCount} тестов</span>
                          <span className="text-[10px]">
                            {date.toLocaleDateString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
          );
        })}
      </div>

      {totalAttempts === 0 && (
        <Card>
          <CardContent className="py-10 text-center">
            <Calendar className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Пока нет попыток. Начните с первого задания!
            </p>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
