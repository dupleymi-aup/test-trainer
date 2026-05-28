"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowRight,
  ArrowLeft,
  Trophy,
  Timer,
  Play,
  RotateCcw,
  Flag,
} from "lucide-react";
import { tasks } from "@/lib/tasks";
import type { Task } from "@/lib/tasks";
import type { TestCase } from "@/lib/evaluator";
import { evaluateTestCases } from "@/lib/evaluator";
import { TestForm } from "@/components/test-form";
import { ResultsPanel } from "@/components/results-panel";
import { saveMarathonRecord } from "@/lib/storage";

const MARATHON_SESSION_KEY = "test-trainer-marathon-session";

interface MarathonState {
  started: boolean;
  finished: boolean;
  currentIndex: number;
  taskResults: {
    taskId: number;
    bestScore: number;
    attempts: number;
    timeSpentSec: number;
  }[];
  startTime: number;
}

function loadMarathonSession(): { state: MarathonState | null; testCases: TestCase[] } {
  if (typeof window === "undefined") return { state: null, testCases: [] };
  try {
    const raw = sessionStorage.getItem(MARATHON_SESSION_KEY);
    if (!raw) return { state: null, testCases: [] };
    const parsed = JSON.parse(raw);
    return {
      state: parsed.state as MarathonState,
      testCases: (parsed.testCases || []) as TestCase[],
    };
  } catch {
    return { state: null, testCases: [] };
  }
}

function saveMarathonSession(state: MarathonState, testCases: TestCase[]) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(MARATHON_SESSION_KEY, JSON.stringify({ state, testCases }));
}

function clearMarathonSession() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(MARATHON_SESSION_KEY);
}

export function MarathonMode({
  onExit,
}: {
  onExit: () => void;
}) {
  const [state, setState] = useState<MarathonState>(() => {
    const saved = loadMarathonSession();
    return saved.state || {
      started: false,
      finished: false,
      currentIndex: 0,
      taskResults: [],
      startTime: 0,
    };
  });

  const [testCases, setTestCases] = useState<TestCase[]>(() => {
    const saved = loadMarathonSession();
    return saved.state ? saved.testCases : [];
  });
  const [evaluationResult, setEvaluationResult] = useState<ReturnType<typeof evaluateTestCases> | null>(null);
  const [startTime, setStartTime] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const marathonSavedRef = useRef(false);
  const sessionRestoredRef = useRef(false);

  // Restore elapsed time from saved session
  useEffect(() => {
    if (state.started && !state.finished && !sessionRestoredRef.current) {
      sessionRestoredRef.current = true;
      const saved = loadMarathonSession();
      if (saved.state && saved.state.startTime) {
        setStartTime(saved.state.startTime);
        setElapsed(Math.floor((Date.now() - saved.state.startTime) / 1000));
      }
    }
  }, []);

  const currentTask = tasks[state.currentIndex];
  const isLastTask = state.currentIndex === tasks.length - 1;
  const totalScore = state.taskResults.reduce((s, r) => s + r.bestScore, 0);
  const maxPossible = tasks.length * 100;
  const overallPct = maxPossible > 0 ? Math.round((totalScore / maxPossible) * 100) : 0;

  // Persist state to sessionStorage on every change
  useEffect(() => {
    if (state.started && !state.finished) {
      saveMarathonSession(state, testCases);
    }
  }, [state, testCases]);

  // Clear session when finished or exiting
  useEffect(() => {
    if (state.finished) {
      clearMarathonSession();
    }
  }, [state.finished]);

  // Timer
  useEffect(() => {
    if (!state.started || state.finished) return;
    if (startTime === 0) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [state.started, state.finished, startTime]);

  const formatTime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const handleStart = useCallback(() => {
    setState({
      started: true,
      finished: false,
      currentIndex: 0,
      taskResults: [],
      startTime: Date.now(),
    });
    setStartTime(Date.now());
    setElapsed(0);
  }, []);

  const handleEvaluate = useCallback(() => {
    if (!currentTask || testCases.length === 0) return;
    const result = evaluateTestCases(currentTask, testCases);
    setEvaluationResult(result);

    setState((prev) => {
      const existing = prev.taskResults.find((r) => r.taskId === currentTask.id);
      let newResults: typeof prev.taskResults;
      if (existing) {
        newResults = prev.taskResults.map((r) =>
          r.taskId === currentTask.id
            ? { ...r, bestScore: Math.max(r.bestScore, result.overallScore), attempts: r.attempts + 1 }
            : r
        );
      } else {
        newResults = [...prev.taskResults, {
          taskId: currentTask.id,
          bestScore: result.overallScore,
          attempts: 1,
          timeSpentSec: elapsed,
        }];
      }
      return { ...prev, taskResults: newResults };
    });
  }, [currentTask, testCases, elapsed]);

  const handleNext = useCallback(() => {
    if (isLastTask) {
      setState((prev) => ({ ...prev, finished: true }));
    } else {
      setState((prev) => ({ ...prev, currentIndex: prev.currentIndex + 1 }));
      setTestCases([]);
      setEvaluationResult(null);
      setStartTime(Date.now());
      setElapsed(0);
    }
  }, [isLastTask]);

  const handlePrev = useCallback(() => {
    if (state.currentIndex > 0) {
      setState((prev) => ({ ...prev, currentIndex: prev.currentIndex - 1 }));
      setTestCases([]);
      setEvaluationResult(null);
      setStartTime(Date.now());
      setElapsed(0);
    }
  }, [state.currentIndex]);

  // Welcome screen
  if (!state.started) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        <Card className="border-emerald-200 dark:border-emerald-800">
          <CardContent className="pt-8 pb-8 text-center">
            <Trophy className="h-16 w-16 text-emerald-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Режим «Марафон»</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Пройдите все {tasks.length} заданий последовательно. Цель — набрать максимальный общий балл.
              Время и результаты фиксируются.
            </p>

            <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-emerald-600">{tasks.length}</p>
                <p className="text-xs text-muted-foreground">Заданий</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-amber-600">{tasks.filter((t) => t.difficulty === "Сложно").length}</p>
                <p className="text-xs text-muted-foreground">Сложных</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-blue-600">{tasks.reduce((s, t) => s + t.equivalenceClasses.length, 0)}</p>
                <p className="text-xs text-muted-foreground">Классов EC</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" onClick={() => { clearMarathonSession(); onExit(); }}>
                Отмена
              </Button>
              <Button size="lg" onClick={handleStart} className="gap-2">
                <Play className="h-4 w-4" />
                Начать марафон
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Save marathon record once when finished
  useEffect(() => {
    if (state.finished && !marathonSavedRef.current) {
      marathonSavedRef.current = true;
      const totalScoreVal = state.taskResults.reduce((s, r) => s + r.bestScore, 0);
      const avgScore = state.taskResults.length > 0 ? Math.round(totalScoreVal / state.taskResults.length) : 0;
      const totalTimeSec = state.taskResults.reduce((s, r) => s + r.timeSpentSec, 0);
      saveMarathonRecord({
        timestamp: Date.now(),
        totalTasks: tasks.length,
        completedTasks: state.taskResults.length,
        avgScore,
        totalTimeSec,
      });
    }
  }, [state.finished, state.taskResults, tasks.length]);

  // Finish screen
  if (state.finished) {
    const totalScoreVal = state.taskResults.reduce((s, r) => s + r.bestScore, 0);
    const avgScore = state.taskResults.length > 0 ? Math.round(totalScoreVal / state.taskResults.length) : 0;
    const totalTimeSec = state.taskResults.reduce((s, r) => s + r.timeSpentSec, 0);

    const sorted = [...state.taskResults].sort((a, b) => b.bestScore - a.bestScore);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    const bestTask = tasks.find((t) => t.id === best?.taskId);
    const worstTask = tasks.find((t) => t.id === worst?.taskId);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto space-y-4"
      >
        <Card className="border-emerald-200 dark:border-emerald-800">
          <CardContent className="pt-8 pb-6 text-center">
            <Flag className="h-16 w-16 text-emerald-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-emerald-600 mb-1">Марафон завершён!</h2>
            <p className="text-muted-foreground mb-4">
              Время: {formatTime(elapsed)}
            </p>

            <div className="relative w-32 h-32 mx-auto mb-6">
              <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/20" />
                <circle
                  cx="50" cy="50" r="40" fill="none" stroke={overallPct >= 75 ? "#10b981" : overallPct >= 50 ? "#f59e0b" : "#ef4444"}
                  strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 40}
                  strokeDashoffset={2 * Math.PI * 40 * (1 - overallPct / 100)}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold">{overallPct}%</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                <p className="text-lg font-bold text-emerald-600">{bestTask?.name}</p>
                <p className="text-xs text-muted-foreground">Лучший: {best?.bestScore}%</p>
              </div>
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-900/20">
                <p className="text-lg font-bold text-rose-600">{worstTask?.name}</p>
                <p className="text-xs text-muted-foreground">Худший: {worst?.bestScore}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* All results */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <h3 className="text-sm font-semibold mb-3">Результаты по заданиям</h3>
            <div className="space-y-2">
              {state.taskResults.map((r) => {
                const task = tasks.find((t) => t.id === r.taskId);
                const scoreColor = r.bestScore >= 90
                  ? "text-emerald-600" : r.bestScore >= 60
                    ? "text-amber-600" : "text-rose-600";
                return (
                  <div key={r.taskId} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">{r.taskId}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task?.name}</p>
                      <p className="text-[11px] text-muted-foreground">{r.attempts} попыт{r.attempts === 1 ? "ка" : r.attempts >= 2 && r.attempts <= 4 ? "ки" : "ок"}</p>
                    </div>
                    <span className={`text-sm font-bold ${scoreColor}`}>{r.bestScore}%</span>
                    <Progress value={r.bestScore} className="h-1.5 w-16" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" onClick={onExit}>
            Вернуться на главную
          </Button>
          <Button onClick={handleStart} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Пройти заново
          </Button>
        </div>
      </motion.div>
    );
  }

  // Active marathon
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-4"
    >
      {/* Marathon header */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="h-5 w-5 text-emerald-600" />
              <span className="text-sm font-semibold">Марафон</span>
              <Badge variant="secondary" className="text-xs">
                {state.currentIndex + 1}/{tasks.length}
              </Badge>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-sm">
                <Timer className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-sm">{formatTime(elapsed)}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Общий: <span className="font-bold text-emerald-600">{overallPct}%</span>
              </div>
              <Button variant="ghost" size="sm" onClick={onExit}>
                Выйти
              </Button>
            </div>
          </div>
          <Progress
            value={((state.currentIndex + (evaluationResult ? 1 : 0)) / tasks.length) * 100}
            className="h-1.5 mt-3"
          />
        </CardContent>
      </Card>

      {/* Task header */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-lg font-bold">{currentTask.name}</h2>
            <Badge variant="secondary">{currentTask.difficulty}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{currentTask.description}</p>
        </CardContent>
      </Card>

      {/* Test form */}
      <TestForm
        task={currentTask}
        onAdd={(inputs, expected, category, comment) => {
          setTestCases((prev) => [
            ...prev,
            { id: `tc-${Date.now()}`, inputs, expectedOutput: expected, category, comment },
          ]);
        }}
      />

      {/* Results */}
      <AnimatePresence>
        {evaluationResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <ResultsPanel
              result={evaluationResult}
              testCases={testCases}
              onReset={() => {
                setTestCases([]);
                setEvaluationResult(null);
              }}
              bestScore={state.taskResults.find((r) => r.taskId === currentTask.id)?.bestScore}
              elapsedTime={elapsed}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePrev}
          disabled={state.currentIndex === 0}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Предыдущее
        </Button>
        <Button
          onClick={handleNext}
          className="gap-2"
          disabled={testCases.length === 0}
        >
          {isLastTask ? (
            <>
              Завершить марафон
              <Flag className="h-4 w-4" />
            </>
          ) : (
            <>
              Следующее задание
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}
