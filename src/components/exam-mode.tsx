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
import { Timer, Trophy, RotateCcw, ChevronRight, Clock, CheckCircle2, Calculator, Trash2, Download, Lightbulb, AlertTriangle, Target } from "lucide-react";
import { Confetti } from "./confetti";
import { tasks, runReferenceFunction } from "@/lib/tasks";
import type { Task } from "@/lib/tasks";
import { evaluateTestCases } from "@/lib/evaluator";
import type { TestCase, EvaluationResult } from "@/lib/evaluator";
import { toast } from "sonner";
import { saveAttempt } from "@/lib/storage";
import { ResultsPanel } from "./results-panel";
import { categories } from "@/lib/constants";

type ExamState = "setup" | "tips" | "running" | "results";

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
          const catDist: Record<string, number> = {};
          tcs.forEach((tc) => { catDist[tc.category] = (catDist[tc.category] || 0) + 1; });
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
            categoryDistribution: catDist,
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

  // Autosave exam session (debounced to avoid excessive writes)
  useEffect(() => {
    if (examState !== "running") return;
    const timer = setTimeout(() => {
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
    }, 1000); // Debounce 1s

    return () => clearTimeout(timer);
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
    setExamState("tips");
  };

  const beginExam = () => {
    // Shuffle selected tasks using Fisher-Yates
    const shuffled = selectedTasks
      .map((id) => tasks.find((t) => t.id === id))
      .filter((t): t is NonNullable<typeof t> => t !== undefined);
    if (shuffled.length === 0) {
      toast.error("Выбранные задания не найдены");
      return;
    }
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setExamTasks(shuffled);
    setExamTestCases({});
    setExamResults([]);
    setLastPracticeResult(null);
    setCurrentTaskIndex(0);
    setExamInputs(shuffled[0].params.map(() => ""));
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
    } catch {
      if (process.env.NODE_ENV === "development") console.warn("parseInputForRef: JSON.parse failed for:", trimmed);
    }
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
    const catDist: Record<string, number> = {};
    tcs.forEach((tc) => { catDist[tc.category] = (catDist[tc.category] || 0) + 1; });
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
      categoryDistribution: catDist,
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

            {/* Exam presets */}
            <div className="space-y-2">
              <p className="text-xs font-medium">Быстрый выбор:</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    const easy = tasks.filter(t => t.difficulty === "Легко").map(t => t.id);
                    setSelectedTasks(easy);
                    setTimeLimit(10);
                  }}
                  className="px-3 py-2 rounded-lg border text-xs font-medium transition-all border-border hover:border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/10"
                >
                  🟢 Только лёгкие
                </button>
                <button
                  onClick={() => {
                    const medium = tasks.filter(t => t.difficulty === "Средне").map(t => t.id);
                    setSelectedTasks(medium);
                    setTimeLimit(15);
                  }}
                  className="px-3 py-2 rounded-lg border text-xs font-medium transition-all border-border hover:border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/10"
                >
                  🟡 Только средние
                </button>
                <button
                  onClick={() => {
                    const hard = tasks.filter(t => t.difficulty === "Сложно").map(t => t.id);
                    setSelectedTasks(hard);
                    setTimeLimit(20);
                  }}
                  className="px-3 py-2 rounded-lg border text-xs font-medium transition-all border-border hover:border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/10"
                >
                  🔴 Только сложные
                </button>
                <button
                  onClick={() => {
                    const shuffled = [...tasks];
                    for (let i = shuffled.length - 1; i > 0; i--) {
                      const j = Math.floor(Math.random() * (i + 1));
                      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                    }
                    const picked = shuffled.slice(0, 5).map(t => t.id);
                    setSelectedTasks(picked);
                    setTimeLimit(15);
                  }}
                  className="px-3 py-2 rounded-lg border text-xs font-medium transition-all border-border hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/10"
                >
                  🎲 Случайные 5
                </button>
                <button
                  onClick={() => {
                    const all = tasks.map(t => t.id);
                    setSelectedTasks(all);
                    setTimeLimit(30);
                  }}
                  className="px-3 py-2 rounded-lg border text-xs font-medium transition-all border-border hover:border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/10 col-span-2 sm:col-span-2"
                >
                  📋 Все задания ({tasks.length})
                </button>
              </div>
            </div>

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

  // TIPS SCREEN
  if (examState === "tips") {
    const taskNames = selectedTasks.map((id) => tasks.find((t) => t.id === id)?.name).filter(Boolean).join(", ");
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-4">
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-600" />
              Советы перед экзаменом
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Задания: <strong>{taskNames}</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              Лимит: <strong>{timeLimit} мин</strong> • Режим: <strong>{practiceMode ? "Практика" : "Экзамен"}</strong>
            </p>

            <div className="space-y-2">
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/10">
                <Target className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">Стратегия покрытия</p>
                  <p className="text-[11px] text-muted-foreground">Сначала тестируйте нормальные значения, затем границы, потом исключения. Не тратьте время на один класс дважды.</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/10">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-300">Распределение времени</p>
                  <p className="text-[11px] text-muted-foreground">≈ {Math.floor(timePerTask / 60)}:{(timePerTask % 60).toString().padStart(2, "0")} на задание. Если застряли — переходите к следующему.</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/10">
                <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-blue-800 dark:text-blue-300">Проверяйте ожидания</p>
                  <p className="text-[11px] text-muted-foreground">Используйте кнопку калькулятора для точного ожидаемого результата. Неверное ожидание = потеря баллов корректности.</p>
                </div>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs font-medium mb-1">Формула оценки:</p>
              <p className="text-xs font-mono bg-white/50 dark:bg-black/20 rounded p-1.5">
                EC×0.4 + BV×0.3 + Correctness×0.3
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Покрытие классов эквивалентности важнее всего, но корректность ожиданий тоже существенна.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setExamState("setup")} className="flex-1">
            <RotateCcw className="h-4 w-4 mr-1" />
            Назад к настройке
          </Button>
          <Button onClick={beginExam} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
            <Timer className="h-4 w-4 mr-1" />
            Начать ({selectedTasks.length} заданий)
          </Button>
        </div>
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
          {avgScore >= 90 && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
              Отлично! Вы превосходно владеете методами тестирования!
            </p>
          )}
          {avgScore >= 75 && avgScore < 90 && (
            <p className="text-sm text-teal-600 dark:text-teal-400 mt-1">
              Хороший результат! Обратите внимание на задания с низкой оценкой.
            </p>
          )}
          {avgScore >= 50 && avgScore < 75 && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
              Удовлетворительно. Рекомендуем повторить теорию по слабым местам.
            </p>
          )}
          {avgScore < 50 && (
            <p className="text-sm text-rose-600 dark:text-rose-400 mt-1">
              Стоит подтянуть знания. Изучите теорию и попробуйте снова.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Post-exam reflection */}
      <Card className="border-blue-200 dark:border-blue-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-blue-600" />
            Анализ результатов
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* Weakest and strongest tasks */}
          {examResults.length > 1 && (() => {
            const sorted = [...examResults].sort((a, b) => a.overallScore - b.overallScore);
            const weakest = sorted[0];
            const strongest = sorted[sorted.length - 1];
            return (
              <>
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-900/10">
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-rose-800 dark:text-rose-300">Слабое место: {weakest.task.name} ({weakest.overallScore}%)</p>
                    <p className="text-[11px] text-muted-foreground">
                      {weakest.uncoveredEcIds.length > 0
                        ? `Не покрыто ${weakest.uncoveredEcIds.length} классов эквивалентности.`
                        : "Покрытие хорошее, но есть ошибки в ожидаемых результатах."}
                      Рекомендуем вернуться к теории и практике этого задания.
                    </p>
                  </div>
                </div>
                {strongest.overallScore !== weakest.overallScore && (
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/10">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">Сильное место: {strongest.task.name} ({strongest.overallScore}%)</p>
                      <p className="text-[11px] text-muted-foreground">Лучший результат на экзамене. Вы хорошо понимаете этот тип задач.</p>
                    </div>
                  </div>
                )}
              </>
            );
          })()}

          {/* Category distribution tips */}
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs font-medium mb-1">Рекомендации для улучшения:</p>
            <ul className="text-[11px] space-y-1 text-muted-foreground">
              {examResults.some((r) => r.ecCoverage < 60) && (
                <li>• <strong>Классы эквивалентности:</strong> Вы покрываете менее 60% EC. Перед тестированием выпишите все классы из кода функции.</li>
              )}
              {examResults.some((r) => r.boundaryCoverage < 50) && (
                <li>• <strong>Граничные значения:</strong> Низкое покрытие BV. Обращайте внимание на min/max в диапазонах и точки перехода.</li>
              )}
              {examResults.some((r) => r.correctnessScore < 70) && (
                <li>• <strong>Корректность:</strong> Много неверных ожиданий. Используйте калькулятор для проверки реального результата.</li>
              )}
              {examResults.every((r) => r.overallScore >= 75) && (
                <li>• Вы стабильно показываете хороший результат. Попробуйте более сложные задания или сократите лимит времени.</li>
              )}
            </ul>
          </div>
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
