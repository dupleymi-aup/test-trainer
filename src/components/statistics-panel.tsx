"use client";

import { useState, useMemo, memo } from "react";
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
  Download,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import { ru, enUS, zhCN } from "date-fns/locale";
import { useLocale, useTranslations } from "next-intl";
import { tasks } from "@/lib/tasks";
import { loadStreak, type AttemptRecord, type StreakData } from "@/lib/storage";
import { downloadJSON, downloadCSV } from "@/lib/export";
import { toast } from "sonner";

interface StatisticsPanelProps {
  attempts: AttemptRecord[];
}

export const StatisticsPanel = memo(function StatisticsPanel({ attempts }: StatisticsPanelProps) {
  const locale = useLocale();
  const t = useTranslations("stats");
  const [streak] = useState<StreakData>(() => loadStreak());
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());

  const dateLocale = locale === "zh" ? zhCN : locale === "en" ? enUS : ru;

  // Derive task stats from attempts prop so it stays fresh
  const taskStats = useMemo(() => {
    return tasks.map((task) => {
      const history = attempts.filter((r) => r.taskId === task.id);
      const bestScore = history.reduce((max, r) => Math.max(max, r.score), 0);
      const avgScore = history.length > 0
        ? Math.round(history.reduce((sum, r) => sum + r.score, 0) / history.length)
        : 0;
      const attemptsCount = history.length;
      const trend = history.length >= 2
        ? history[history.length - 1].score - history[history.length - 2].score
        : 0;
      const sparklineData = history.map((h) => h.score);
      // Time analytics per task
      const timedAttempts = history.filter((h) => h.timeSpentMs && h.timeSpentMs > 0);
      const avgTimeMs = timedAttempts.length > 0
        ? timedAttempts.reduce((sum, h) => sum + (h.timeSpentMs ?? 0), 0) / timedAttempts.length
        : 0;

      return { task, bestScore, avgScore, attempts: attemptsCount, trend, history, sparklineData, avgTimeMs };
    });
  }, [attempts]);

  const categoryDistribution = useMemo(() => {
    const catTotals: Record<string, number> = { "normal": 0, "boundary": 0, "exception": 0, "invalidType": 0 };
    attempts.forEach((a) => {
      if (a.categoryDistribution) {
        Object.entries(a.categoryDistribution).forEach(([cat, count]) => {
          // Map legacy Russian keys to canonical English keys
          const key = cat === "Нормальное значение" ? "normal"
            : cat === "Граничное значение" ? "boundary"
            : cat === "Исключение" ? "exception"
            : cat === "Недопустимый тип" ? "invalidType"
            : cat;
          catTotals[key] = (catTotals[key] || 0) + count;
        });
      }
    });
    const totalCats = Object.values(catTotals).reduce((s, v) => s + v, 0);
    if (totalCats === 0) return null;

    const imbalance = Object.values(catTotals).some((v) => v > 0 && v / totalCats < 0.1);
    return { catTotals, totalCats, imbalance };
  }, [attempts]);

  const totalAttempts = attempts.length;
  const avgOverallScore = totalAttempts > 0
    ? Math.round(attempts.reduce((s, a) => s + a.score, 0) / totalAttempts)
    : 0;

  // Total and average time across all attempts
  const totalTimeMs = attempts.filter((a) => a.timeSpentMs).reduce((sum, a) => sum + (a.timeSpentMs ?? 0), 0);
  const timedAttemptsCount = attempts.filter((a) => a.timeSpentMs && a.timeSpentMs > 0).length;
  const avgTimeMs = timedAttemptsCount > 0 ? totalTimeMs / timedAttemptsCount : 0;

  // Weakness radar: group tasks by primary topic, compute avg best score per topic
  const weaknessRadar = useMemo(() => {
    const topicMap: Record<string, { tasks: number[]; scores: number[] }> = {
      "equivalence": { tasks: [], scores: [] },
      "boundary": { tasks: [], scores: [] },
      "combinatorial": { tasks: [], scores: [] },
      "decisionTable": { tasks: [], scores: [] },
      "stateTransition": { tasks: [], scores: [] },
      "pairwise": { tasks: [], scores: [] },
      "validation": { tasks: [], scores: [] },
      "recursion": { tasks: [], scores: [] },
    };

    for (const ts of taskStats) {
      if (ts.bestScore === 0) continue;
      const topics = ts.task.topics.map(t => t.toLowerCase());

      if (topics.some(t => t.includes("класс") && !t.includes("комбинатор"))) {
        topicMap["equivalence"].tasks.push(ts.task.id);
        topicMap["equivalence"].scores.push(ts.bestScore);
      }
      if (topics.some(t => t.includes("гранич") && !t.includes("комбинатор"))) {
        topicMap["boundary"].tasks.push(ts.task.id);
        topicMap["boundary"].scores.push(ts.bestScore);
      }
      if (topics.some(t => t.includes("комбинатор") || t.includes("многофактор"))) {
        topicMap["combinatorial"].tasks.push(ts.task.id);
        topicMap["combinatorial"].scores.push(ts.bestScore);
      }
      if (topics.some(t => t.includes("таблиц") || t.includes("решен"))) {
        topicMap["decisionTable"].tasks.push(ts.task.id);
        topicMap["decisionTable"].scores.push(ts.bestScore);
      }
      if (topics.some(t => t.includes("состоя") || t.includes("переход"))) {
        topicMap["stateTransition"].tasks.push(ts.task.id);
        topicMap["stateTransition"].scores.push(ts.bestScore);
      }
      if (topics.some(t => t.includes("попарн") || t.includes("pairwise"))) {
        topicMap["pairwise"].tasks.push(ts.task.id);
        topicMap["pairwise"].scores.push(ts.bestScore);
      }
      if (topics.some(t => t.includes("формат") || t.includes("проверк") || t.includes("валид"))) {
        topicMap["validation"].tasks.push(ts.task.id);
        topicMap["validation"].scores.push(ts.bestScore);
      }
      if (topics.some(t => t.includes("рекурс"))) {
        topicMap["recursion"].tasks.push(ts.task.id);
        topicMap["recursion"].scores.push(ts.bestScore);
      }
    }

    return Object.entries(topicMap)
      .filter(([_, data]) => data.tasks.length > 0)
      .map(([name, data]) => ({
        name,
        avgScore: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
        taskCount: data.tasks.length,
      }))
      .sort((a, b) => a.avgScore - b.avgScore);
  }, [taskStats]);

  const formatTime = (ms: number): string => {
    const totalSec = Math.round(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    if (min >= 60) return `${Math.floor(min / 60)}${t("timeHour")} ${min % 60}${t("timeMin")}`;
    if (min > 0) return `${min}${t("timeMin")} ${sec}${t("timeSec")}`;
    return `${sec}${t("timeSec")}`;
  };

  // Map canonical topic keys to i18n display keys
  const topicLabelKey: Record<string, string> = {
    "equivalence": "topicEquivalence",
    "boundary": "topicBoundary",
    "combinatorial": "topicCombinatorial",
    "decisionTable": "topicDecisionTable",
    "stateTransition": "topicStateTransition",
    "pairwise": "topicPairwise",
    "validation": "topicValidation",
    "recursion": "topicRecursion",
  };

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
              <BarChart3 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              {t("title")}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {t("subtitle")}
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
                {t("streakDays")}
              </span>
            </div>
            {streak.longestStreak > 0 && (
              <span className="text-xs text-muted-foreground">
                {t("record")}: {streak.longestStreak} {t("days")}
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{totalAttempts}</p>
              <p className="text-xs text-muted-foreground">{t("attempts")}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">{avgOverallScore}%</p>
              <p className="text-xs text-muted-foreground">{t("avgScore")}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {taskStats.filter((t) => t.bestScore >= 90).length}/{tasks.length}
              </p>
              <p className="text-xs text-muted-foreground">{t("excellent")}</p>
            </div>
          </div>

          {/* Score dynamics chart */}
          {attempts.length >= 2 && (
            <div className="mt-4 pt-3 border-t border-border/50">
              <h3 className="text-xs font-medium mb-2 flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                {t("scoreDynamics")}
              </h3>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart
                  data={attempts.slice(-30).map((a, i) => ({
                    index: i + 1,
                    score: a.score,
                    task: tasks.find((t) => t.id === a.taskId)?.name ?? `#${a.taskId}`,
                    date: format(new Date(a.timestamp), "dd MMM HH:mm", { locale: dateLocale }),
                  }))}
                  margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="index"
                    className="text-xs"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => `#${v}`}
                  />
                  <YAxis
                    domain={[0, 100]}
                    className="text-xs"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value}%`, t("scoreLabel")]}
                    labelFormatter={(_, payload) => {
                      const item = payload?.[0]?.payload;
                      return item ? `${item.task} — ${item.date}` : `#${_}`;
                    }}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 2.5 }}
                    activeDot={{ r: 4.5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {timedAttemptsCount > 0 && (
            <div className="mt-4 pt-3 border-t border-border/50 grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-lg font-bold text-violet-600 dark:text-violet-400">{formatTime(avgTimeMs)}</p>
                <p className="text-xs text-muted-foreground">{t("avgTimePerTask")}</p>
              </div>
              <div>
                <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{formatTime(totalTimeMs)}</p>
                <p className="text-xs text-muted-foreground">{t("totalTime")}</p>
              </div>
            </div>
          )}

          {/* Export buttons */}
          {totalAttempts > 0 && (
            <div className="mt-3 pt-3 border-t border-border/50 flex justify-center gap-3">
              <button
                onClick={() => { downloadJSON(); toast.success(t("exportDoneJSON")); }}
                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
              >
                <Download className="h-3 w-3" />
                {t("exportJSON")}
              </button>
              <button
                onClick={() => { downloadCSV(); toast.success(t("exportDoneCSV")); }}
                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
              >
                <Download className="h-3 w-3" />
                {t("exportCSV")}
              </button>
            </div>
          )}

          {/* Category distribution analytics */}
          {categoryDistribution && (() => {
            const { catTotals, totalCats, imbalance } = categoryDistribution;
            const catColors: Record<string, string> = {
              "normal": "bg-emerald-500 dark:bg-emerald-400",
              "boundary": "bg-amber-500 dark:bg-amber-400",
              "exception": "bg-rose-500 dark:bg-rose-400",
              "invalidType": "bg-purple-500 dark:bg-purple-400",
            };
            const catLabels: Record<string, string> = {
              "normal": t("categoryNormal"),
              "boundary": t("categoryBoundary"),
              "exception": t("categoryException"),
              "invalidType": t("categoryInvalidType"),
            };

            return (
              <div className="mt-4 pt-3 border-t border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium">{t("categoryDistribution")}</p>
                  {imbalance && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400">⚠ {t("categoryImbalance")}</span>
                  )}
                </div>
                {/* Stacked bar */}
                <div className="flex h-3 rounded overflow-hidden gap-px">
                  {Object.entries(catTotals).map(([cat, count]) => {
                    if (count === 0) return null;
                    const pct = (count / totalCats) * 100;
                    return (
                      <div
                        key={cat}
                        className={`${catColors[cat]} transition-all`}
                        style={{ width: `${pct}%` }}
                        title={`${catLabels[cat]}: ${count} (${Math.round(pct)}%)`}
                      />
                    );
                  })}
                </div>
                {/* Legend */}
                <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5">
                  {Object.entries(catTotals).map(([cat, count]) => {
                    if (count === 0) return null;
                    const pct = Math.round((count / totalCats) * 100);
                    return (
                      <div key={cat} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className={`w-2 h-2 rounded-full ${catColors[cat]}`} />
                        <span>{catLabels[cat]}: {count} ({pct}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Weakness Radar */}
      {weaknessRadar.length > 0 && (
        <Card className="border-violet-200 dark:border-violet-800">
          <CardContent className="pt-5 pb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
              <Target className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              {t("skillMap")}
            </h3>
            <div className="space-y-3">
              {weaknessRadar.map((item) => {
                const scoreColor = item.avgScore >= 90
                  ? "text-emerald-600 dark:text-emerald-400"
                  : item.avgScore >= 60
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-rose-600 dark:text-rose-400";
                const barColor = item.avgScore >= 90
                  ? "bg-emerald-500 dark:bg-emerald-400"
                  : item.avgScore >= 60
                    ? "bg-amber-500 dark:bg-amber-400"
                    : "bg-rose-500 dark:bg-rose-400";
                return (
                  <div key={item.name} className="flex items-center gap-3">
                    <span className="text-xs font-medium min-w-[130px]">{t(topicLabelKey[item.name] ?? item.name)}</span>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex-1 bg-muted rounded-full h-2.5 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${item.avgScore}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          className={`h-full rounded-full ${barColor}`}
                        />
                      </div>
                      <span className={`text-xs font-bold min-w-[36px] text-right ${scoreColor}`}>
                        {item.avgScore}%
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground min-w-[30px]">
                      {item.taskCount} {t("tasksCount")}
                    </span>
                  </div>
                );
              })}
            </div>
            {weaknessRadar.length > 0 && weaknessRadar[0].avgScore < 60 && (
              <div className="mt-3 p-2 rounded-lg bg-rose-50 dark:bg-rose-900/10 text-xs text-rose-700 dark:text-rose-400">
                💡 {t("recommendRepeat", { topic: t(topicLabelKey[weaknessRadar[0].name] ?? weaknessRadar[0].name) })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent attempts timeline */}
      {attempts.length > 0 && (
        <Card>
          <CardContent className="pt-5 pb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4" />
              {t("recentAttempts")}
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
                if (diffMin < 1) timeLabel = t("justNow");
                else if (diffMin < 60) timeLabel = `${diffMin} ${t("minAgo")}`;
                else if (diffHr < 24) timeLabel = `${diffHr} ${t("hrAgo")}`;
                else if (diffDay < 7) timeLabel = `${diffDay} ${t("daysAgo")}`;
                else timeLabel = date.toLocaleDateString(locale === "zh" ? "zh-CN" : locale === "en" ? "en-US" : "ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

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
                          {task?.name ?? `${t("taskNotFound")} #${attempt.taskId}`}
                        </span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className={`text-sm font-bold ${scoreColor}`}>
                          {attempt.score}%
                        </span>
                        {trendDiff !== 0 && (
                          <span className={`text-[10px] font-medium flex items-center gap-0.5 ${trendDiff > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
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
                        <span>{attempt.testCasesCount} {t("tests")}</span>
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
          <Target className="h-4 w-4 text-muted-foreground" />
          {t("taskDetailTitle")}
        </h3>
        {taskStats.map(({ task, bestScore, avgScore, attempts: count, trend, history, sparklineData, avgTimeMs }) => {
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
                    <span className={`text-[10px] font-medium ${trend > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
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
                <span>{count} {t("attemptsSuffix")}</span>
                {avgScore > 0 && <span>{t("avgLabel")}: {avgScore}%</span>}
                {avgTimeMs > 0 && <span className="text-violet-600 dark:text-violet-400">⏱ {formatTime(avgTimeMs)}</span>}
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
                      title={`${t("attemptSingular")}: ${score}%`}
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
                          <span>{h.testCasesCount} {t("tests")}</span>
                          <span className="text-[10px]">
                            {date.toLocaleDateString(locale === "zh" ? "zh-CN" : locale === "en" ? "en-US" : "ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
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
              {t("startFirstTask")}
            </p>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
});
