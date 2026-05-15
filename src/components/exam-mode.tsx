"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { motion } from "framer-motion";
import { Timer, Trophy, RotateCcw, ChevronRight, Clock, CheckCircle2, Calculator, Trash2, Download } from "lucide-react";
import { Confetti } from "./confetti";
import { tasks, runReferenceFunction } from "@/lib/tasks";
import type { Task } from "@/lib/tasks";
import { evaluateTestCases } from "@/lib/evaluator";
import type { TestCase, EvaluationResult } from "@/lib/evaluator";
import { toast } from "sonner";
import { saveAttempt } from "@/lib/storage";
import { ResultsPanel } from "./results-panel";
import { categories } from "@/lib/constants";

type ExamState = "setup" | "running" | "results";

const EXAM_STORAGE_KEY = "exam-session";

interface ExamSessionData {
  examState: ExamState;
  selectedTasks: number[];
  timeLimit: number;
  timeRemaining: number;
  currentTaskIndex: number;
  examTasks: Task[];
  examTestCases: Record<number, TestCase[]>;
  examResults: EvaluationResult[];
  practiceMode: boolean;
}

function saveExamSession(data: ExamSessionData) {
  try {
    sessionStorage.setItem(EXAM_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore — sessionStorage may be unavailable
  }
}

function loadExamSession(): ExamSessionData | null {
  try {
    const raw = sessionStorage.getItem(EXAM_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ExamSessionData;
  } catch {
    return null;
  }
}

function clearExamSession() {
  try {
    sessionStorage.removeItem(EXAM_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function ExamMode() {
  const [examState, setExamState] = useState<ExamState>("setup");
  const [selectedTasks, setSelectedTasks] = useState<number[]>([]);
  const [timeLimit, setTimeLimit] = useState(10); // minutes
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [examTasks, setExamTasks] = useState<Task[]>([]);
  const [examTestCases, setExamTestCases] = useState<Record<number, TestCase[]>>({});
  const [examResults, setExamResults] = useState<EvaluationResult[]>([]);
  const [examInputs, setExamInputs] = useState<string[]>([]);
  const [examExpected, setExamExpected] = useState("");
  const [examCategory, setExamCategory] = useState<string>("Нормальное значение");
  const [isCalculating, setIsCalculating] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [practiceMode, setPracticeMode] = useState(false);
  const [lastPracticeResult, setLastPracticeResult] = useState<EvaluationResult | null>(null);
  const [showCode, setShowCode] = useState(false);
  const finishExamRef = useRef<() => void>(undefined);
  const isFinishingRef = useRef(false);
  const examResultsRef = useRef(examResults);
  const examTasksRef = useRef(examTasks);
  const examTestCasesRef = useRef(examTestCases);

  useEffect(() => {
    examResultsRef.current = examResults;
  }, [examResults]);

  useEffect(() => {
    examTasksRef.current = examTasks;
  }, [examTasks]);

  useEffect(() => {
    examTestCasesRef.current = examTestCases;
  }, [examTestCases]);

  // Restore exam session on mount
  useEffect(() => {
    const session = loadExamSession();
    if (session && session.examState === "running" && session.examTasks.length > 0) {
      setExamState("running");
      setSelectedTasks(session.selectedTasks);
      setTimeLimit(session.timeLimit);
      setTimeRemaining(session.timeRemaining);
      setCurrentTaskIndex(session.currentTaskIndex);
      setExamTasks(session.examTasks);
      setExamTestCases(session.examTestCases);
      setExamResults(session.examResults);
      setPracticeMode(session.practiceMode);
      const currentTask = session.examTasks[session.currentTaskIndex];
      if (currentTask) {
        setExamInputs(currentTask.params.map(() => ""));
      }
      toast.info("Сессия экзамена восстановлена");
    }
  }, []);

  const completedCount = examResults.length;

  const finishExam = useCallback(() => {
    if (isFinishingRef.current) return;
    isFinishingRef.current = true;

    const results = [...examResultsRef.current];
    const currentTasks = examTasksRef.current;
    const currentTestCases = examTestCasesRef.current;

    for (const task of currentTasks) {
      if (!results.find((r) => r.task.id === task.id)) {
        const tcs = currentTestCases[task.id] || [];
        if (tcs.length > 0) {
          const result = evaluateTestCases(task, tcs);
          saveAttempt({
            taskId: task.id,
            score: result.overallScore,
            ecCoverage: result.ecCoverage,
            bvCoverage: result.boundaryCoverage,
            correctnessScore: result.correctnessScore,
            timestamp: Date.now(),
            testCasesCount: tcs.length,
            coveredEcIds: result.coveredEcIds,
            coveredBvDescriptions: result.coveredBvDescriptions,
          });
          results.push(result);
        }
      }
    }
    setExamResults(results);
    clearExamSession();
    setExamState("results");
    window.dispatchEvent(new Event("achievements-updated"));
    const newAvg = results.length > 0
      ? Math.round(results.reduce((s, r) => s + r.overallScore, 0) / results.length)
      : 0;
    if (newAvg >= 90) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3500);
    }
    isFinishingRef.current = false;
  }, []);

  useEffect(() => {
    finishExamRef.current = finishExam;
  }, [finishExam]);

  // Autosave exam session
  useEffect(() => {
    if (examState !== "running") return;
    saveExamSession({
      examState,
      selectedTasks,
      timeLimit,
      timeRemaining,
      currentTaskIndex,
      examTasks,
      examTestCases,
      examResults,
      practiceMode,
    });
  }, [examState, selectedTasks, timeLimit, timeRemaining, currentTaskIndex, examTasks, examTestCases, examResults, practiceMode]);

  // Timer countdown
  useEffect(() => {
    if (examState !== "running") return;
    const interval = setInterval(() => {
      setTimeRemaining((t) => {
        if (t <= 1) {
          finishExamRef.current?.();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [examState]);

  const toggleTask = (id: number) => {
    setSelectedTasks((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const startExam = () => {
    if (selectedTasks.length === 0) {
      toast.error("Выберите хотя бы одно задание");
      return;
    }
    // Shuffle selected tasks
    const shuffled = selectedTasks
      .map((id) => tasks.find((t) => t.id === id)!)
      .sort(() => Math.random() - 0.5);
    setExamTasks(shuffled);
    setExamTestCases({});
    setExamResults([]);
    setLastPracticeResult(null);
    setCurrentTaskIndex(0);
    setExamInputs(shuffled.length > 0 ? shuffled[0].params.map(() => "") : []);
    setExamExpected("");
    setTimeRemaining(timeLimit * 60);
    setExamState("running");
  };

  const addExamTestCase = useCallback(() => {
    const task = examTasks[currentTaskIndex];
    if (!task) return;
    if (examInputs.some((v) => v.trim() === "") || !examExpected.trim()) return;
    const tc: TestCase = {
      id: `tc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      inputs: examInputs.map((v) => v.trim()),
      expectedOutput: examExpected.trim(),
      category: examCategory as TestCase["category"],
      comment: "",
    };
    setExamTestCases((prev) => ({
      ...prev,
      [task.id]: [...(prev[task.id] || []), tc],
    }));
    setExamInputs(task.params.map(() => ""));
    setExamExpected("");
    toast.success("Тест-кейс добавлен");
  }, [examTasks, currentTaskIndex, examInputs, examExpected, examCategory]);

  const parseInputForRef = useCallback((v: string) => {
    const trimmed = v.trim();
    if (trimmed === "true" || trimmed === "да" || trimmed === "верно") return true;
    if (trimmed === "false" || trimmed === "нет" || trimmed === "неверно") return false;
    if (trimmed === "null") return null;
    const num = Number(trimmed);
    if (trimmed !== "" && !isNaN(num) && /^-?\d+(\.\d+)?$/.test(trimmed)) return num;
    try {
      const p = JSON.parse(trimmed);
      if (typeof p === "object") return p;
    } catch {}
    return trimmed;
  }, []);

  const handleCalculate = useCallback(() => {
    const task = examTasks[currentTaskIndex];
    if (!task || examInputs.some((v) => v.trim() === "")) return;
    setIsCalculating(true);
    requestAnimationFrame(() => {
      try {
        const parsedInputs = examInputs.map(parseInputForRef);
        const { result, error } = runReferenceFunction(task.id, parsedInputs);
        if (error) {
          setExamExpected(`Ошибка: ${error}`);
        } else {
          const output = typeof result === "object" ? JSON.stringify(result) : String(result);
          setExamExpected(output);
        }
      } catch {
        setExamExpected("Ошибка вычисления");
      } finally {
        setIsCalculating(false);
      }
    });
  }, [examTasks, currentTaskIndex, examInputs, parseInputForRef]);

  const handleExamKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (examInputs.some((v) => v.trim() === "") || !examExpected.trim()) return;
      addExamTestCase();
    }
  };

  const removeExamTestCase = useCallback((tcId: string) => {
    const task = examTasks[currentTaskIndex];
    if (!task) return;
    setExamTestCases((prev) => ({
      ...prev,
      [task.id]: (prev[task.id] || []).filter((tc) => tc.id !== tcId),
    }));
    toast.info("Тест-кейс удалён");
  }, [examTasks, currentTaskIndex]);

  const submitCurrentTask = useCallback(() => {
    const task = examTasks[currentTaskIndex];
    if (!task) return;
    const tcs = examTestCases[task.id] || [];
    if (tcs.length === 0) {
      toast.error("Добавьте хотя бы один тест-кейс");
      return;
    }
    const result = evaluateTestCases(task, tcs);
    setExamResults((prev) => [...prev, result]);

    // Save this task's result to attempt history
    saveAttempt({
      taskId: task.id,
      score: result.overallScore,
      ecCoverage: result.ecCoverage,
      bvCoverage: result.boundaryCoverage,
      correctnessScore: result.correctnessScore,
      timestamp: Date.now(),
      testCasesCount: tcs.length,
      coveredEcIds: result.coveredEcIds,
      coveredBvDescriptions: result.coveredBvDescriptions,
    });

    // In practice mode, show mini result and wait for user to continue
    if (practiceMode) {
      setLastPracticeResult(result);
      toast.success(`Оценка: ${result.overallScore}% — EC: ${result.ecCoverage}%, BV: ${result.boundaryCoverage}%`);
      return;
    }

    if (currentTaskIndex < examTasks.length - 1) {
      const nextTask = examTasks[currentTaskIndex + 1];
      setCurrentTaskIndex((i) => i + 1);
      setExamInputs(nextTask.params.map(() => ""));
      setExamExpected("");
      toast.success(`Задание «${task.name}» проверено! Оценка: ${result.overallScore}%`);
    } else {
      setExamState("results");
      window.dispatchEvent(new Event("achievements-updated"));
      // Check confetti
      const newAvg = [...examResults, result];
      const newAvgScore = newAvg.length > 0
        ? Math.round(newAvg.reduce((s, r) => s + r.overallScore, 0) / newAvg.length)
        : 0;
      if (newAvgScore >= 90) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3500);
      }
    }
  }, [examTasks, currentTaskIndex, examTestCases, examResults]);

  const handleNextAfterPractice = useCallback(() => {
    setLastPracticeResult(null);
    if (currentTaskIndex < examTasks.length - 1) {
      const nextTask = examTasks[currentTaskIndex + 1];
      setCurrentTaskIndex((i) => i + 1);
      setExamInputs(nextTask.params.map(() => ""));
      setExamExpected("");
    } else {
      setExamState("results");
      window.dispatchEvent(new Event("achievements-updated"));
      const newAvg = examResults.length > 0
        ? Math.round(examResults.reduce((s, r) => s + r.overallScore, 0) / examResults.length)
        : 0;
      if (newAvg >= 90) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3500);
      }
    }
  }, [currentTaskIndex, examTasks, examResults]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const avgScore = examResults.length > 0
    ? Math.round(examResults.reduce((s, r) => s + r.overallScore, 0) / examResults.length)
    : 0;

  const exportExamResults = useCallback(() => {
    const data = {
      type: "exam-results",
      timestamp: Date.now(),
      date: new Date().toLocaleString("ru-RU"),
      avgScore,
      tasks: examResults.map((r) => ({
        name: r.task.name,
        score: r.overallScore,
        ecCoverage: r.ecCoverage,
        boundaryCoverage: r.boundaryCoverage,
        correctnessScore: r.correctnessScore,
        testCasesCount: r.results.length,
        uncoveredEc: r.uncoveredEcIds,
        uncoveredBv: r.uncoveredBvDescriptions,
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `exam-results-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Результаты экспортированы");
  }, [examResults, avgScore]);

  // Confetti trigger when entering results with avg >= 90
  const handleExamConfetti = useCallback(() => {
    const newAvg = examResults.length > 0
      ? Math.round(examResults.reduce((s, r) => s + r.overallScore, 0) / examResults.length)
      : 0;
    if (newAvg >= 90) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3500);
    }
  }, [examResults]);

  const timePerTask = selectedTasks.length > 0
    ? Math.round((timeLimit * 60) / selectedTasks.length)
    : 0;

  // SETUP SCREEN
  if (examState === "setup") {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-4">
        <Card className="border-emerald-200 dark:border-emerald-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-emerald-600" />
              Режим экзамена
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Пройдите несколько заданий на время. Выбранные задания будут перемешаны,
              и вы не сможете посмотреть теорию или подсказки до окончания экзамена.
            </p>
            <div className="space-y-2">
              <p className="text-xs font-medium">Выберите задания:</p>
              <div className="grid grid-cols-2 gap-2">
                {tasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => toggleTask(task.id)}
                    className={`text-left p-2 rounded-lg border text-xs transition-all ${
                      selectedTasks.includes(task.id)
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                        : "border-border hover:border-emerald-300"
                    }`}
                  >
                    <span className="font-medium">{task.name}</span>
                    <Badge variant="secondary" className="ml-2 text-[9px]">
                      {task.difficulty}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium">Лимит времени (минуты):</p>
              <div className="flex gap-2">
                {[5, 10, 15, 20].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTimeLimit(t)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      timeLimit === t
                        ? "border-emerald-500 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "border-border hover:border-emerald-300"
                    }`}
                  >
                    {t} мин
                  </button>
                ))}
              </div>
            </div>

            {/* Practice vs Exam mode toggle */}
            <div className="space-y-2">
              <p className="text-xs font-medium">Режим:</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPracticeMode(false)}
                  className={`flex-1 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                    !practiceMode
                      ? "border-emerald-500 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : "border-border hover:border-emerald-300"
                  }`}
                >
                  <div className="font-semibold mb-0.5">Экзамен</div>
                  <div className="text-[10px] text-muted-foreground">Результаты в конце</div>
                </button>
                <button
                  onClick={() => setPracticeMode(true)}
                  className={`flex-1 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                    practiceMode
                      ? "border-amber-500 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                      : "border-border hover:border-amber-300"
                  }`}
                >
                  <div className="font-semibold mb-0.5">Практика</div>
                  <div className="text-[10px] text-muted-foreground">Результат после каждого задания</div>
                </button>
              </div>
            </div>

            {/* Time per task estimate */}
            {selectedTasks.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  ≈ {Math.floor(timePerTask / 60)}:{(timePerTask % 60).toString().padStart(2, "0")} на задание
                </span>
              </div>
            )}

            <Button
              onClick={startExam}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={selectedTasks.length === 0}
            >
              Начать экзамен ({selectedTasks.length} заданий)
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // RUNNING SCREEN
  if (examState === "running") {
    const task = examTasks[currentTaskIndex];
    if (!task) return null;
    const isTimeLow = timeRemaining < 60;
    const taskTestCases = examTestCases[task.id] || [];
    const progressPercent = examTasks.length > 0 ? (completedCount / examTasks.length) * 100 : 0;

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto space-y-4">
        {/* Timer bar */}
        <div className={`p-3 rounded-lg border ${isTimeLow ? "border-rose-300 bg-rose-50 dark:bg-rose-900/20" : "border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20"}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Timer className={`h-4 w-4 ${isTimeLow ? "text-rose-600" : "text-emerald-600"}`} />
              <span className={`font-mono text-lg font-bold ${isTimeLow ? "text-rose-600" : "text-emerald-700 dark:text-emerald-400"}`}>
                {formatTime(timeRemaining)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Задание {currentTaskIndex + 1} из {examTasks.length}</span>
              <Badge variant="secondary">{task.name}</Badge>
            </div>
          </div>
          {/* Progress bar */}
          <div className="flex items-center gap-2">
            <Progress value={progressPercent} className="h-1.5 flex-1" />
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <CheckCircle2 className="h-3 w-3" />
              <span>{completedCount}/{examTasks.length}</span>
            </div>
          </div>
        </div>

        <div onKeyDown={handleExamKeyDown}>
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium">{task.name}</p>
                <code className="text-xs text-muted-foreground font-mono">{task.signature}</code>
                <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                {/* Show task params so user knows expected inputs */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {task.params.map((param) => (
                    <Badge key={param.name} variant="outline" className="text-[10px] font-mono normal-case">
                      {param.name}: {param.type}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 text-xs gap-1 h-7"
                onClick={() => setShowCode(!showCode)}
              >
                {showCode ? "Скрыть" : "Показать"} код
              </Button>
            </div>

            {showCode && (
              <div className="bg-zinc-900 dark:bg-zinc-950 rounded-lg p-3 overflow-x-auto">
                <pre className="text-xs font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed">
                  <code>{task.code}</code>
                </pre>
              </div>
            )}

            {/* One input per param, same pattern as TestForm */}
            {task.params.map((param, idx) => (
              <div key={param.name} className="space-y-1">
                <Label className="text-xs font-medium">
                  {param.name}
                  <span className="text-muted-foreground ml-1">({param.type})</span>
                </Label>
                <Input
                  placeholder={
                    param.type === "string"
                      ? 'Например: "Abc123!@"'
                      : param.type === "boolean"
                        ? "true / false"
                        : "Например: 5, 0, -1"
                  }
                  value={examInputs[idx] ?? ""}
                  onChange={(e) => {
                    const newInputs = [...examInputs];
                    newInputs[idx] = e.target.value;
                    setExamInputs(newInputs);
                  }}
                  className="h-9 text-sm"
                />
              </div>
            ))}

            <div className="space-y-1">
              <Label className="text-xs font-medium">Ожидаемый результат</Label>
              <div className="flex gap-2">
                <Input
                  placeholder={
                    task.returnType === "boolean"
                      ? "true / false"
                      : task.returnType === "string"
                        ? 'Например: "равносторонний"'
                        : task.returnType.startsWith("{")
                          ? '{ valid: true, errors: [] }'
                          : "Например: 120"
                  }
                  value={examExpected}
                  onChange={(e) => setExamExpected(e.target.value)}
                  className="h-9 text-sm flex-1"
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={handleCalculate}
                      disabled={examInputs.some((v) => v.trim() === "") || isCalculating}
                      aria-label="Вычислить ожидаемый результат"
                    >
                      <Calculator className={`h-4 w-4 ${isCalculating ? "animate-spin" : ""}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Вычислить ожидаемый результат
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">Категория</Label>
              <Select
                value={examCategory}
                onValueChange={setExamCategory}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      <span className="flex items-center gap-2">
                        <span
                          className={`inline-block w-2 h-2 rounded-full ${
                            cat === "Нормальное значение"
                              ? "bg-emerald-500"
                              : cat === "Граничное значение"
                                ? "bg-amber-500"
                                : cat === "Исключение"
                                  ? "bg-rose-500"
                                  : "bg-purple-500"
                          }`}
                        />
                        {cat}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={addExamTestCase}
                disabled={examInputs.some((v) => v.trim() === "") || !examExpected.trim()}
              >
                Добавить
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={submitCurrentTask}
                disabled={taskTestCases.length === 0 || (practiceMode && lastPracticeResult)}
              >
                <ChevronRight className="h-3.5 w-3.5 mr-1" />
                {currentTaskIndex < examTasks.length - 1 ? "Далее" : "Завершить"}
              </Button>
            </div>
            {taskTestCases.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-muted-foreground">
                  Тест-кейсы ({taskTestCases.length}):
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1.5 custom-scrollbar">
                  {taskTestCases.map((tc, i) => (
                    <div key={tc.id} className="flex items-start gap-2 p-2 rounded-md bg-muted/50 text-xs">
                      <span className="text-muted-foreground font-mono shrink-0 w-4">{i + 1}</span>
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <code className="block text-[11px] font-mono truncate">
                          {tc.inputs.join(", ")} → {tc.expectedOutput}
                        </code>
                        <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                          {tc.category}
                        </Badge>
                      </div>
                      <button
                        onClick={() => removeExamTestCase(tc.id)}
                        className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                        aria-label="Удалить тест-кейс"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Practice mode result display */}
            {practiceMode && lastPracticeResult && (
              <div className="mt-3 p-3 rounded-lg border bg-muted/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Результат:</span>
                  <div className="flex gap-3 text-xs">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">{lastPracticeResult.overallScore}%</span>
                    <span className="text-muted-foreground">EC: {lastPracticeResult.ecCoverage}%</span>
                    <span className="text-muted-foreground">BV: {lastPracticeResult.boundaryCoverage}%</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={handleNextAfterPractice}
                  >
                    <ChevronRight className="h-3.5 w-3.5 mr-1" />
                    {currentTaskIndex < examTasks.length - 1 ? "Следующее задание" : "Завершить"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </motion.div>
    );
  }

  // RESULTS SCREEN
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto space-y-4">
      <Confetti active={showConfetti} />
      <Card className="border-emerald-200 dark:border-emerald-800">
        <CardContent className="pt-6 text-center">
          <Trophy className="h-10 w-10 text-amber-500 mx-auto mb-2" />
          <h2 className="text-xl font-bold">Экзамен завершён!</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Средняя оценка: <strong className="text-lg">{avgScore}%</strong> по {examResults.length} заданиям
          </p>
          {avgScore >= 80 && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
              🎉 Отличный результат!
            </p>
          )}
        </CardContent>
      </Card>
      {examResults.map((result) => (
        <ResultsPanel key={result.task.id} result={result} onReset={() => {}} />
      ))}
      <div className="flex justify-center gap-2">
        <Button variant="outline" onClick={exportExamResults}>
          <Download className="h-4 w-4 mr-1" />
          Экспорт результатов
        </Button>
        <Button variant="outline" onClick={() => setExamState("setup")}>
          <RotateCcw className="h-4 w-4 mr-1" />
          Новый экзамен
        </Button>
      </div>
    </motion.div>
  );
}
