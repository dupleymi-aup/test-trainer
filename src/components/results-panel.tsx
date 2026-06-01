"use client";

import { memo, Fragment, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  XCircle,
  Target,
  BarChart3,
  Award,
  ArrowRight,
  Copy,
  Check,
  Printer,
  Download,
  Lightbulb,
  AlertTriangle,
  Info,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import type { EvaluationResult } from "@/lib/evaluator";
import type { TestCase } from "@/lib/evaluator";
import { getTaskHistory } from "@/lib/storage";
import { CoverageMatrix } from "@/components/coverage-matrix";

interface ResultsPanelProps {
  result: EvaluationResult | null;
  testCases?: TestCase[];
  onReset: () => void;
  bestScore?: number;
  elapsedTime?: number; // seconds spent on current attempt
}

function ScoreCircle({
  score,
  label,
  color,
  delay,
}: {
  score: number;
  label: string;
  color: string;
  delay: number;
}) {
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (score / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.5 }}
      className="flex flex-col items-center"
    >
      <div className="relative w-24 h-24" role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100} aria-label={`${label}: ${score}%`}>
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-muted/30"
          />
          <motion.circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ delay: delay + 0.3, duration: 1, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold">{score}%</span>
        </div>
      </div>
      <span className="text-xs text-muted-foreground mt-2 text-center max-w-[100px]">
        {label}
      </span>
    </motion.div>
  );
}

function getGrade(score: number): { text: string; color: string; emoji: string } {
  if (score >= 90) return { text: "Отлично", color: "text-emerald-600 dark:text-emerald-400", emoji: "🌟" };
  if (score >= 75) return { text: "Хорошо", color: "text-teal-600 dark:text-teal-400", emoji: "👍" };
  if (score >= 60) return { text: "Удовлетворительно", color: "text-amber-600 dark:text-amber-400", emoji: "📝" };
  if (score >= 40) return { text: "Неудовлетворительно", color: "text-orange-600 dark:text-orange-400", emoji: "⚠️" };
  return { text: "Плохо", color: "text-rose-600 dark:text-rose-400", emoji: "❌" };
}

function formatResultsAsText(result: EvaluationResult): string {
  const lines: string[] = [];
  const grade = getGrade(result.overallScore);

  lines.push(`=== Результаты проверки ===`);
  lines.push(`Задание: ${result.task.name}`);
  lines.push(`Оценка: ${result.overallScore}% — ${grade.text}`);
  lines.push("");
  lines.push(`--- Оценки по категориям ---`);
  lines.push(`Классы эквивалентности: ${result.ecCoverage}% (${result.coveredEcsCount}/${result.totalEcs})`);
  lines.push(`Граничные значения: ${result.boundaryCoverage}% (${result.coveredBvsCount}/${result.totalBvs})`);
  lines.push(`Корректность: ${result.correctnessScore}%`);
  lines.push("");
  lines.push(`--- Детальные результаты тест-кейсов ---`);

  result.results.forEach((r, idx) => {
    lines.push(`#${idx + 1}: Вход: (${r.testCase.inputs.join(", ")})`);
    lines.push(`   Ожидание: ${r.testCase.expectedOutput}`);
    lines.push(`   Факт: ${r.actualOutput}`);
    lines.push(`   Статус: ${r.isCorrect ? "✓ Верно" : "✗ Неверно"}`);
    if (r.coveredClasses.length > 0) {
      lines.push(`   Покрытые классы: ${r.coveredClasses.join(", ")}`);
    }
    lines.push("");
  });

  if (result.uncoveredEcIds.length > 0) {
    lines.push("--- Непокрытые классы эквивалентности ---");
    for (const id of result.uncoveredEcIds) {
      const ec = result.task.equivalenceClasses.find((e) => e.id === id);
      if (ec) lines.push(`  - ${ec.name}: ${ec.description}`);
    }
    lines.push("");
  }

  if (result.uncoveredBvDescriptions.length > 0) {
    lines.push("--- Непокрытые граничные значения ---");
    for (const desc of result.uncoveredBvDescriptions) {
      lines.push(`  - ${desc}`);
    }
  }

  return lines.join("\n");
}

function formatTime(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min >= 60) return `${Math.floor(min / 60)}ч ${min % 60}м`;
  if (min > 0) return `${min}м ${sec}с`;
  return `${sec}с`;
}

export const ResultsPanel = memo(function ResultsPanel({ result, testCases = [], onReset, bestScore, elapsedTime }: ResultsPanelProps) {
  const [copied, setCopied] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const grade = result ? getGrade(result.overallScore) : null;

  // Compare with best previous attempt
  const comparison = useMemo(() => {
    if (!result) return null;
    const history = getTaskHistory(result.task.id);
    if (history.length <= 1) return null;
    const bestPrev = history
      .filter((h) => (h.coveredEcIds && h.coveredEcIds.length > 0) || (h.coveredBvDescriptions && h.coveredBvDescriptions.length > 0))
      .sort((a, b) => b.score - a.score)[0];
    if (!bestPrev) return null;

    const bestEcIds = new Set(bestPrev.coveredEcIds ?? []);
    const bestBvDesc = new Set(bestPrev.coveredBvDescriptions ?? []);
    const currentEcIds = new Set(result.coveredEcIds);
    const currentBvDesc = new Set(result.coveredBvDescriptions);

    const lostEc = [...bestEcIds].filter((id) => !currentEcIds.has(id));
    const lostBv = [...bestBvDesc].filter((desc) => !currentBvDesc.has(desc));
    const gainedEc = [...currentEcIds].filter((id) => !bestEcIds.has(id));
    const gainedBv = [...currentBvDesc].filter((desc) => !bestBvDesc.has(desc));

    if (lostEc.length === 0 && lostBv.length === 0 && gainedEc.length === 0 && gainedBv.length === 0) return null;

    return {
      bestScore: bestPrev.score,
      bestEc: bestPrev.ecCoverage,
      bestBv: bestPrev.bvCoverage,
      lostEc,
      lostBv,
      gainedEc,
      gainedBv,
    };
  }, [result]);

  // Diagnostic summary: group test results by category
  const diagnosticSummary = useMemo(() => {
    if (!result) return { lines: [] as string[], categories: [] as string[] };
    const byCategory: Record<string, { correct: number; total: number; failedDescriptions: string[] }> = {};
    result.results.forEach((r) => {
      const cat = r.testCase.category;
      if (!byCategory[cat]) byCategory[cat] = { correct: 0, total: 0, failedDescriptions: [] };
      byCategory[cat].total++;
      if (r.isCorrect) byCategory[cat].correct++;
      else byCategory[cat].failedDescriptions.push(r.explanation || "");
    });

    const lines: string[] = [];
    for (const [cat, data] of Object.entries(byCategory)) {
      if (data.correct === data.total) {
        lines.push(`✓ ${cat}: ${data.total}/${data.total} верно`);
      } else {
        lines.push(`✗ ${cat}: ${data.correct}/${data.total} верно`);
        // Find most common failure pattern
        const freq: Record<string, number> = {};
        for (const d of data.failedDescriptions) {
          freq[d] = (freq[d] || 0) + 1;
        }
        const topIssue = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
        if (topIssue) {
          lines.push(`  Наиболее частая проблема: ${topIssue[0]}`);
        }
      }
    }

    return { lines, categories: Object.keys(byCategory) };
  }, [result]);

  const strategyWarnings = useMemo(() => {
    if (!result) return [];
    const warnings: { icon: React.ReactNode; title: string; details: string; color: string }[] = [];

    const categoryCounts: Record<string, number> = {};
    result.results.forEach((r) => {
      const cat = r.testCase.category;
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    const totalTests = result.results.length;
    const hasNormal = categoryCounts["Нормальное значение"] > 0;
    const hasBoundary = categoryCounts["Граничное значение"] > 0;
    const hasException = categoryCounts["Исключение"] > 0;
    const hasInvalidType = categoryCounts["Недопустимый тип"] > 0;

    if (hasNormal && !hasException && !hasInvalidType && totalTests >= 2) {
      warnings.push({
        icon: <AlertTriangle className="h-4 w-4" />,
        title: "Тестируются только нормальные значения",
        details: "Вы добавили тесты для корректных входов, но не проверили обработку ошибок. Добавьте тесты для исключений и невалидных типов данных.",
        color: "amber",
      });
    }

    if (!hasBoundary && result.totalBvs > 3 && totalTests >= 3) {
      warnings.push({
        icon: <AlertTriangle className="h-4 w-4" />,
        title: "Отсутствуют граничные значения",
        details: `У этой задачи ${result.totalBvs} граничных значений. Границы диапазонов — наиболее вероятное место ошибок. Протестируйте min, max и соседние значения.`,
        color: "amber",
      });
    }

    if (totalTests < 3) {
      warnings.push({
        icon: <Info className="h-4 w-4" />,
        title: "Слишком мало тест-кейсов",
        details: `Всего ${totalTests} тест. Для полного покрытия этой задачи (${result.totalEcs} EC + ${result.totalBvs} BV) рекомендуется минимум ${Math.min(result.totalEcs + result.totalBvs, 8)} тестов.`,
        color: "blue",
      });
    }

    if (result.ecCoverage >= 80 && result.correctnessScore < 70) {
      warnings.push({
        icon: <AlertTriangle className="h-4 w-4" />,
        title: "Хорошее покрытие, но есть ошибки в ожиданиях",
        details: "Вы покрыли большинство классов эквивалентности, но часть ожидаемых результатов не совпадает с фактическими. Проверьте код функции и уточните ожидания.",
        color: "amber",
      });
    }

    if (result.correctnessScore >= 90 && result.ecCoverage < 50) {
      warnings.push({
        icon: <Info className="h-4 w-4" />,
        title: "Точные ожидания, но малое покрытие",
        details: "Все ваши ожидаемые результаты верны, но вы протестировали менее половины классов эквивалентности. Добавьте тесты для непокрытых классов.",
        color: "blue",
      });
    }

    const categoryKeys = Object.keys(categoryCounts);
    if (categoryKeys.length === 1 && totalTests >= 3) {
      const onlyCat = categoryKeys[0];
      warnings.push({
        icon: <AlertTriangle className="h-4 w-4" />,
        title: `Все тесты в категории «${onlyCat}»`,
        details: "Разнообразьте категории: тестируйте нормальные значения, границы, исключения и недопустимые типы для полного покрытия.",
        color: "amber",
      });
    }

    return warnings;
  }, [result]);

  // Common mistakes feedback: show task's commonMistakes when score is low
  const commonMistakesFeedback = useMemo(() => {
    if (!result || !result.task.commonMistakes) return [];
    if (result.overallScore >= 75) return [];
    // Show all common mistakes, highlighting those related to uncovered ECs
    const uncoveredEcNames = result.task.equivalenceClasses
      .filter((ec) => !result.coveredEcIds.includes(ec.id))
      .map((ec) => ec.name.toLowerCase());

    return result.task.commonMistakes.map((mistake) => {
      const isRelevant = uncoveredEcNames.some((ecName) =>
        mistake.toLowerCase().includes(ecName.split(":")[0]) ||
        mistake.toLowerCase().includes(ecName.replace("ec", ""))
      );
      return { text: mistake, isRelevant };
    });
  }, [result]);

  const handleExportCsv = () => {
    if (!result) return;
    const lines: string[] = [];
    lines.push(["#", "Вход", "Ожидание", "Факт", "Статус", "Покрытые классы"].join(";"));
    result.results.forEach((r, idx) => {
      const row = [
        String(idx + 1),
        `"${r.testCase.inputs.join(", ")}"`,
        `"${r.testCase.expectedOutput.replace(/"/g, '""')}"`,
        `"${r.actualOutput.replace(/"/g, '""')}"`,
        r.isCorrect ? "Верно" : "Неверно",
        `"${r.coveredClasses.join(", ")}"`,
      ];
      lines.push(row.join(";"));
    });
    const csvContent = "\uFEFF" + lines.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `результаты-${result.task.name}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV экспортирован");
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(formatResultsAsText(result));
      setCopied(true);
      toast.success("Результаты скопированы!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Не удалось скопировать результаты");
    }
  };

  if (!result || !grade) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground">
            Результаты появятся после проверки тест-кейсов.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Выберите задание, добавьте тест-кейсы и нажмите «Проверить».
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Overall score */}
      <Card className="border-emerald-200 dark:border-emerald-800">
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="text-4xl mb-2"
            >
              {grade.emoji}
            </motion.div>
            <h2 className={`text-2xl font-bold ${grade.color}`}>
              {grade.text}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Задание: {result.task.name}
            </p>
            {bestScore !== undefined && bestScore > 0 && (
              <div className="mt-2 inline-flex items-center gap-1.5 text-xs">
                <span className="text-muted-foreground">Лучший:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">{bestScore}%</span>
                {result.overallScore !== bestScore && (
                  <span className={`font-medium ${result.overallScore > bestScore ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                    {result.overallScore > bestScore ? "↑" : "↓"}{Math.abs(result.overallScore - bestScore)}%
                  </span>
                )}
              </div>
            )}
            {elapsedTime !== undefined && elapsedTime > 0 && (
              <div className="mt-1 text-xs text-muted-foreground">
                Время: {formatTime(elapsedTime * 1000)}
              </div>
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-6">
            <ScoreCircle
              score={result.overallScore}
              label="Общая оценка"
              color={
                result.overallScore >= 75
                  ? "#10b981"
                  : result.overallScore >= 50
                    ? "#f59e0b"
                    : "#ef4444"
              }
              delay={0}
            />
            <ScoreCircle
              score={result.ecCoverage}
              label="Классы эквивалентности"
              color="#14b8a6"
              delay={0.1}
            />
            <ScoreCircle
              score={result.boundaryCoverage}
              label="Граничные значения"
              color="#f59e0b"
              delay={0.2}
            />
            <ScoreCircle
              score={result.correctnessScore}
              label="Корректность"
              color="#8b5cf6"
              delay={0.3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Diagnostic summary */}
      {diagnosticSummary.lines.length > 0 && (
        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              Анализ результатов по категориям
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {diagnosticSummary.lines.map((line, i) => (
              <p
                key={i}
                className={`text-xs leading-relaxed ${
                  line.startsWith("✓")
                    ? "text-emerald-700 dark:text-emerald-400"
                    : line.startsWith("  ")
                      ? "text-muted-foreground pl-4"
                      : "text-rose-700 dark:text-rose-400"
                }`}
              >
                {line}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Common mistakes feedback */}
      {commonMistakesFeedback.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              Типичные ошибки — обратите внимание
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Ваш результат ниже 75%. Проверьте, не допустили ли вы одну из типичных ошибок для этой задачи:
            </p>
            {commonMistakesFeedback.map((mistake, i) => (
              <div
                key={i}
                className={`text-xs p-2.5 rounded-lg border ${
                  mistake.isRelevant
                    ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
                    : "bg-muted/30 border-border/50 text-muted-foreground"
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-amber-500 dark:text-amber-400 mt-0.5 shrink-0">{i + 1}.</span>
                  <span>{mistake.text}</span>
                </div>
                {mistake.isRelevant && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 ml-5 font-medium">
                    Вероятно, это ваша текущая проблема
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Coverage Matrix */}
      {testCases.length > 0 && (
        <CoverageMatrix result={result} />
      )}

      {/* Coverage details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* EC Coverage */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              Классы эквивалентности
              <Badge variant="secondary" className="ml-auto text-xs">
                {result.coveredEcsCount}/{result.totalEcs}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={result.ecCoverage} className="h-2" />
            <div className="space-y-1.5">
              <TooltipProvider delayDuration={200}>
              {result.task.equivalenceClasses.map((ec) => {
                const covered = result.coveredEcIds.includes(ec.id);
                return (
                  <Tooltip key={ec.id}>
                    <TooltipTrigger asChild>
                      <div
                        className={`flex items-center gap-2 text-xs p-1.5 rounded cursor-default ${
                          covered
                            ? "bg-emerald-50 dark:bg-emerald-900/20"
                            : "bg-rose-50 dark:bg-rose-900/20"
                        }`}
                      >
                        {covered ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-rose-500 dark:text-rose-400 shrink-0" />
                        )}
                        <span className={covered ? "text-emerald-800 dark:text-emerald-300" : "text-rose-700 dark:text-rose-400"}>
                          {ec.name}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <p className="text-xs">{ec.description}</p>
                      {!covered && ec.exampleValues.length > 0 && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Пример: <code>{String(ec.exampleValues[0])}</code>
                        </p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
              </TooltipProvider>
            </div>
          </CardContent>
        </Card>

        {/* Boundary Coverage */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              Граничные значения
              <Badge variant="secondary" className="ml-auto text-xs">
                {result.coveredBvsCount}/{result.totalBvs}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={result.boundaryCoverage} className="h-2" />
            <div className="space-y-1.5">
              <TooltipProvider delayDuration={200}>
              {result.task.boundaryValues.map((bv, idx) => {
                const covered = result.coveredBvDescriptions.includes(
                  bv.description
                );
                return (
                  <Tooltip key={idx}>
                    <TooltipTrigger asChild>
                      <div
                        className={`flex items-center gap-2 text-xs p-1.5 rounded cursor-default ${
                          covered
                            ? "bg-emerald-50 dark:bg-emerald-900/20"
                            : "bg-rose-50 dark:bg-rose-900/20"
                        }`}
                      >
                        {covered ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-rose-500 dark:text-rose-400 shrink-0" />
                        )}
                        <span className={covered ? "text-emerald-800 dark:text-emerald-300" : "text-rose-700 dark:text-rose-400"}>
                          {bv.description}:{" "}
                          <code className="font-mono">
                            {Array.isArray(bv.value)
                              ? `[${bv.value.join(", ")}]`
                              : String(bv.value)}
                          </code>
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <p className="text-xs">{bv.description}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Значение: <code>{Array.isArray(bv.value) ? `[${bv.value.join(", ")}]` : String(bv.value)}</code>
                      </p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
              </TooltipProvider>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed test results */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">
              Детальные результаты
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5"
                onClick={() => window.print()}
              >
                <Printer className="h-3.5 w-3.5" />
                Печать
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5"
                onClick={handleExportCsv}
                title="Экспортировать в CSV"
              >
                <Download className="h-3.5 w-3.5" />
                Экспорт CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? "Скопировано" : "Копировать результаты"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-96 overflow-y-auto custom-scrollbar">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-10">#</TableHead>
                  <TableHead className="text-xs">Вход</TableHead>
                  <TableHead className="text-xs">Ожидание</TableHead>
                  <TableHead className="text-xs">Факт</TableHead>
                  <TableHead className="text-xs w-20">Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.results.map((r, _idx) => {
                  const isExpanded = expandedRow === r.testCase.id;
                  return (
                    <Fragment key={r.testCase.id}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setExpandedRow(isExpanded ? null : r.testCase.id)}
                      >
                        <TableCell className="text-xs text-muted-foreground py-2">
                          <ChevronRight className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                        </TableCell>
                        <TableCell className="py-2">
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                            ({r.testCase.inputs.join(", ")})
                          </code>
                        </TableCell>
                        <TableCell className="py-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono max-w-[100px] inline-block truncate cursor-help">
                                  {r.testCase.expectedOutput}
                                </code>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="max-w-xs font-mono text-xs">
                                {r.testCase.expectedOutput}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className="py-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <code
                                  className={`text-xs px-1.5 py-0.5 rounded font-mono max-w-[150px] inline-block truncate cursor-help ${
                                    r.isCorrect
                                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                                      : "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400"
                                  }`}
                                >
                                  {r.actualOutput}
                                </code>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="max-w-xs font-mono text-xs">
                                {r.actualOutput}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className="py-2">
                          {r.isCorrect ? (
                            <div className="space-y-0.5">
                              <Badge className="bg-emerald-100 text-emerald-800 text-[10px] dark:bg-emerald-900/30 dark:text-emerald-400">
                                ✓ Верно
                              </Badge>
                              {r.explanation && !r.explanation.includes("успешно") && (
                                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 max-w-[150px] leading-tight">
                                  {r.explanation}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <Badge className="bg-rose-100 text-rose-800 text-[10px] dark:bg-rose-900/30 dark:text-rose-400">
                                ✗ Неверно
                              </Badge>
                              <p className="text-[10px] text-rose-600 dark:text-rose-400 max-w-[150px] leading-tight">
                                {r.explanation}
                              </p>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                      {/* Expanded guided review */}
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={5} className="bg-muted/30 p-0">
                            <div className="p-4 space-y-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="text-[10px]">{r.testCase.category}</Badge>
                                {r.testCase.comment && (
                                  <span className="text-[11px] text-muted-foreground">{r.testCase.comment}</span>
                                )}
                              </div>

                              {/* Expected vs Actual comparison */}
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">Ожидаемый результат:</p>
                                  <code className="block text-xs bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded font-mono break-all">
                                    {r.testCase.expectedOutput}
                                  </code>
                                </div>
                                <div className="space-y-1">
                                  <p className={`text-[11px] font-medium ${r.isCorrect ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>
                                    Фактический результат:
                                  </p>
                                  <code className={`block text-xs p-2 rounded font-mono break-all ${
                                    r.isCorrect
                                      ? "bg-emerald-50 dark:bg-emerald-900/20"
                                      : "bg-rose-50 dark:bg-rose-900/20"
                                  }`}>
                                    {r.actualOutput}
                                  </code>
                                </div>
                              </div>

                              {/* Explanation */}
                              {r.explanation && (
                                <div className={`p-3 rounded-lg text-xs leading-relaxed ${
                                  r.isCorrect
                                    ? "bg-emerald-50 dark:bg-emerald-900/10 text-emerald-800 dark:text-emerald-300"
                                    : "bg-rose-50 dark:bg-rose-900/10 text-rose-800 dark:text-rose-300"
                                }`}>
                                  <div className="flex items-start gap-2">
                                    {r.isCorrect ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />}
                                    <span>{r.explanation}</span>
                                  </div>
                                </div>
                              )}

                              {/* Covered classes and boundaries */}
                              {(r.coveredClasses.length > 0 || r.coveredBoundaries.length > 0) && (
                                <div className="space-y-1.5">
                                  <p className="text-[11px] font-medium text-muted-foreground">Покрытие:</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {r.coveredClasses.map((cls) => (
                                      <Badge key={cls} className="text-[10px] bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400">
                                        EC: {cls}
                                      </Badge>
                                    ))}
                                    {r.coveredBoundaries.map((bv) => (
                                      <Badge key={bv} className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                                        BV: {bv}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Hint for incorrect tests */}
                              {!r.isCorrect && (
                                <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10">
                                  <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                                  <div className="text-xs text-blue-800 dark:text-blue-300">
                                    <p className="font-medium mb-0.5">Как исправить?</p>
                                    <p className="text-[11px] opacity-80">
                                      Проверьте входные данные и ожидаемый результат. Убедитесь, что тест соответствует классу эквивалентности или граничному значению, которое вы хотите покрыть.
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Smart category distribution warnings */}
      {strategyWarnings.length > 0 && (
          <Card className="border-blue-200 dark:border-blue-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Стратегия тестирования
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {strategyWarnings.map((w, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 p-2.5 rounded-lg ${
                    w.color === "amber"
                      ? "bg-amber-50 dark:bg-amber-900/10 text-amber-800 dark:text-amber-300"
                      : "bg-blue-50 dark:bg-blue-900/10 text-blue-800 dark:text-blue-300"
                  }`}
                >
                  <span className="shrink-0 mt-0.5">{w.icon}</span>
                  <div>
                    <p className="text-xs font-medium">{w.title}</p>
                    <p className="text-[11px] mt-0.5 opacity-80">{w.details}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
      )}

      {/* Hints for improvement */}
      {(result.uncoveredEcIds.length > 0 || result.uncoveredBvDescriptions.length > 0) && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              Рекомендации по улучшению
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.uncoveredEcIds.map((id) => {
              const ec = result.task.equivalenceClasses.find((e) => e.id === id);
              if (!ec) return null;
              const example = ec.exampleValues[0];
              return (
                <div key={id} className="flex items-start justify-between gap-2 p-2 rounded bg-muted/30 dark:bg-zinc-900/30">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                      Добавьте тест для {ec.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{ec.description}</p>
                    {example !== undefined && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Пример входа: <code className="bg-muted px-1 py-0.5 rounded font-mono">{String(example)}</code>
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
            {result.uncoveredBvDescriptions.map((desc) => {
              const bv = result.task.boundaryValues.find((b) => b.description === desc);
              if (!bv) return null;
              return (
                <div key={desc} className="flex items-start justify-between gap-2 p-2 rounded bg-muted/30 dark:bg-zinc-900/30">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                      Протестируйте граничное значение
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Значение: <code className="bg-muted px-1 py-0.5 rounded font-mono">
                        {Array.isArray(bv.value) ? `[${bv.value.join(", ")}]` : String(bv.value)}
                      </code>
                    </p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Comparison with best attempt */}
      {comparison && (
        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              Сравнение с лучшей попыткой
              <Badge variant="secondary" className="ml-auto text-xs">
                Лучший: {comparison.bestScore}%
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-muted-foreground mb-1">Классы эквивалентности</p>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Было:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{comparison.bestEc}%</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className={`font-bold ${result.ecCoverage >= comparison.bestEc ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                    {result.ecCoverage}%
                  </span>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Граничные значения</p>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Было:</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{comparison.bestBv}%</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className={`font-bold ${result.boundaryCoverage >= comparison.bestBv ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                    {result.boundaryCoverage}%
                  </span>
                </div>
              </div>
            </div>

            {(comparison.lostEc.length > 0 || comparison.lostBv.length > 0) && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-rose-600 dark:text-rose-400">
                  Потеряно покрытия:
                </p>
                {comparison.lostEc.map((id) => {
                  const ec = result.task.equivalenceClasses.find((e) => e.id === id);
                  return ec ? (
                    <div key={id} className="text-[11px] text-rose-700 dark:text-rose-300 flex items-start gap-1.5">
                      <XCircle className="h-3 w-3 mt-px shrink-0" />
                      <span>EC: {ec.name}</span>
                    </div>
                  ) : null;
                })}
                {comparison.lostBv.map((desc) => (
                  <div key={desc} className="text-[11px] text-rose-700 dark:text-rose-300 flex items-start gap-1.5">
                    <XCircle className="h-3 w-3 mt-px shrink-0" />
                    <span>BV: {desc}</span>
                  </div>
                ))}
              </div>
            )}

            {(comparison.gainedEc.length > 0 || comparison.gainedBv.length > 0) && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  Новое покрытие:
                </p>
                {comparison.gainedEc.map((id) => {
                  const ec = result.task.equivalenceClasses.find((e) => e.id === id);
                  return ec ? (
                    <div key={id} className="text-[11px] text-emerald-700 dark:text-emerald-300 flex items-start gap-1.5">
                      <CheckCircle2 className="h-3 w-3 mt-px shrink-0" />
                      <span>EC: {ec.name}</span>
                    </div>
                  ) : null;
                })}
                {comparison.gainedBv.map((desc) => (
                  <div key={desc} className="text-[11px] text-emerald-700 dark:text-emerald-300 flex items-start gap-1.5">
                    <CheckCircle2 className="h-3 w-3 mt-px shrink-0" />
                    <span>BV: {desc}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reset button */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          onClick={onReset}
          className="mt-2"
        >
          Пройти заново
        </Button>
      </div>
    </motion.div>
  );
});
