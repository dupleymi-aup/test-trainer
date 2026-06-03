"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { tasks, runReferenceFunction } from "@/lib/tasks";
import type { Task, Difficulty, TestCaseCategory } from "@/lib/tasks";
import type { TestCase, EvaluationResult } from "@/lib/evaluator";
import { evaluateTestCases } from "@/lib/evaluator";
import { UndoStack } from "@/lib/undo-stack";
import { apiFetch } from "@/lib/api-client";
import { logger } from "@/lib/logger";
import {
  saveProgress,
  loadProgress,
  saveCurrentSession,
  loadCurrentSession,
  exportAllProgress,
  importAllProgress,
  clearAllProgress,
  saveAttempt,
  loadAttemptHistory,
  saveStreak,
  loadStreak,
  getTaskBestCoverage,
  type TaskProgress,
  type AttemptRecord,
  getMarathonsCompleted,
  getBestMarathonAvgScore,
} from "@/lib/storage";
import { checkAndUnlockAchievements, achievements as allAchievements } from "@/lib/achievements";
import { AchievementToast } from "@/components/achievements-panel";

// Sync attempt to server (non-blocking, fire-and-forget)
async function syncAttemptToServer(payload: {
  taskId: string;
  testCases: { id: string; inputs: unknown[]; expectedOutput: string; category: string; comment?: string }[];
  score: number;
  ecCoverage: number;
  bvCoverage: number;
  correctness: number;
  coveredEcIds: string[];
  coveredBvDescriptions: string[];
  timeSpent: number;
}) {
  try {
    const res = await apiFetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      logger.warn("Failed to sync attempt to server", { status: res.status });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn("Failed to sync attempt to server", { error: message });
  }
}

export type TabValue = "tasks" | "trainer" | "results" | "statistics" | "exam" | "theory" | "quiz";
export type SortMode = "По номеру" | "По имени" | "По сложности";
export type DifficultyFilter = "Все" | Difficulty;

export interface TrainerState {
  activeTab: TabValue;
  selectedTask: Task | null;
  testCases: TestCase[];
  evaluationResult: EvaluationResult | null;
  savedProgress: Record<string, TaskProgress>;
  showConfetti: boolean;
  showShortcuts: boolean;
  attemptHistory: AttemptRecord[];
  streak: { currentStreak: number; longestStreak: number; lastActiveDate: string };
  resetDialogOpen: boolean;
  difficultyFilter: DifficultyFilter;
  sortMode: SortMode;
  searchQuery: string;
}

export function useTrainerState() {
  const [activeTab, setActiveTab] = useState<TabValue>("tasks");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);
  const [savedProgress, setSavedProgress] = useState<Record<string, TaskProgress>>(() => {
    if (typeof window !== "undefined") {
      return loadProgress();
    }
    return {};
  });
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerConfetti = useCallback(() => {
    if (confettiTimeoutRef.current) clearTimeout(confettiTimeoutRef.current);
    setShowConfetti(true);
    confettiTimeoutRef.current = setTimeout(() => {
      setShowConfetti(false);
      confettiTimeoutRef.current = null;
    }, 3500);
  }, []);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [attemptHistory, setAttemptHistory] = useState<AttemptRecord[]>(() => loadAttemptHistory());
  const [streak, setStreak] = useState(() => loadStreak());
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>("Все");
  const [sortMode, setSortMode] = useState<SortMode>("По номеру");
  const [searchQuery, setSearchQuery] = useState("");
  const [taskStartTime, setTaskStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [availableTaskIds, setAvailableTaskIds] = useState<Set<number> | null>(null);

  // Fetch available tasks on mount (group-based permissions)
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/tasks/available", { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (data.taskIds && data.taskIds.length < tasks.length) {
          setAvailableTaskIds(new Set(data.taskIds));
        }
      })
      .catch((err) => {
        if ((err as DOMException)?.name === "AbortError") return;
        logger.warn("Failed to fetch available tasks", { error: err instanceof Error ? err.message : String(err) });
      });
    return () => controller.abort();
  }, []);

  // Undo/Redo
  const undoStackRef = useRef(new UndoStack<TestCase[]>());
  const undoStack = undoStackRef.current;

  const pushUndoSnapshot = useCallback(() => {
    undoStack.push([...testCases]);
  }, [testCases, undoStack]);

  const handleUndo = useCallback(() => {
    const prev = undoStack.undo();
    if (prev) {
      setTestCases(prev);
      if (selectedTask) {
        saveCurrentSession(selectedTask.id, prev);
      }
      toast.info("Действие отменено");
    }
  }, [undoStack, selectedTask]);

  const handleRedo = useCallback(() => {
    const next = undoStack.redo();
    if (next) {
      setTestCases(next);
      if (selectedTask) {
        saveCurrentSession(selectedTask.id, next);
      }
      toast.info("Действие возвращено");
    }
  }, [undoStack, selectedTask]);

  // Computed values
  const completedCount = useMemo(() => {
    return Object.keys(savedProgress).length;
  }, [savedProgress]);

  const taskBestCoverage = useMemo(() => {
    const map: Record<string, { bestEc: number; bestBv: number }> = {};
    for (const task of tasks) {
      map[String(task.id)] = getTaskBestCoverage(task.id);
    }
    return map;
    // tasks is a module-level import; attemptHistory triggers re-render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptHistory]);

  const filteredTasks = useMemo(() => {
    let filtered = tasks;

    // Apply group-based restrictions
    if (availableTaskIds) {
      filtered = filtered.filter((t) => availableTaskIds.has(t.id));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
      );
    }

    if (difficultyFilter !== "Все") {
      filtered = filtered.filter((t) => t.difficulty === difficultyFilter);
    }

    const difficultyOrder: Record<Difficulty, number> = { "Легко": 1, "Средне": 2, "Сложно": 3 };

    switch (sortMode) {
      case "По номеру":
        return [...filtered].sort((a, b) => a.id - b.id);
      case "По имени":
        return [...filtered].sort((a, b) => a.name.localeCompare(b.name, "ru"));
      case "По сложности":
        return [...filtered].sort(
          (a, b) => difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]
        );
      default:
        return filtered;
    }
  }, [difficultyFilter, sortMode, searchQuery, availableTaskIds]);

  // Task selection
  const handleSelectTask = useCallback(
    (task: Task) => {
      setSelectedTask(task);
      setEvaluationResult(null);
      setActiveTab("trainer");
      setTaskStartTime(Date.now());
      setElapsedTime(0);

      const savedSession = loadCurrentSession(task.id);
      if (savedSession && savedSession.length > 0) {
        setTestCases(savedSession);
      } else {
        setTestCases([]);
      }

      undoStack.clear();
    },
    [undoStack]
  );

  // Test case operations
  const handleAddTestCase = useCallback(
    (inputs: string[], expected: string, category: TestCaseCategory, comment: string) => {
      const inputKey = JSON.stringify(inputs);
      const isDuplicate = testCases.some((tc) => JSON.stringify(tc.inputs) === inputKey);

      if (isDuplicate) {
        toast.warning("Такие входные данные уже есть в списке тест-кейсов");
        return;
      }

      pushUndoSnapshot();

      const newCase: TestCase = {
        id: `tc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        inputs,
        expectedOutput: expected,
        category,
        comment,
      };

      setTestCases((prev) => {
        const updated = [...prev, newCase];
        if (selectedTask) {
          saveCurrentSession(selectedTask.id, updated);
        }
        return updated;
      });

      toast.success("Тест-кейс добавлен");
    },
    [selectedTask, testCases, pushUndoSnapshot]
  );

  const handleRemoveTestCase = useCallback(
    (id: string) => {
      const tc = testCases.find((t) => t.id === id);
      pushUndoSnapshot();

      setTestCases((prev) => {
        const updated = prev.filter((t) => t.id !== id);
        if (selectedTask) {
          saveCurrentSession(selectedTask.id, updated);
        }
        return updated;
      });

      if (tc) {
        toast.info("Тест-кейс удалён", {
          action: {
            label: "Отменить",
            onClick: () => {
              setTestCases((prev) => {
                const restored = [...prev, tc];
                if (selectedTask) {
                  saveCurrentSession(selectedTask.id, restored);
                }
                return restored;
              });
              toast.success("Тест-кейс восстановлен");
            },
          },
          duration: 5000,
        });
      }
    },
    [selectedTask, testCases, pushUndoSnapshot]
  );

  const handleReorderTestCases = useCallback(
    (reordered: TestCase[]) => {
      pushUndoSnapshot();
      setTestCases(reordered);
      if (selectedTask) {
        saveCurrentSession(selectedTask.id, reordered);
      }
    },
    [selectedTask, pushUndoSnapshot]
  );

  const handleEditTestCase = useCallback(
    (
      id: string,
      updates: Partial<{
        inputs: string[];
        expectedOutput: string;
        category: TestCaseCategory;
        comment: string;
      }>
    ) => {
      pushUndoSnapshot();
      setTestCases((prev) => {
        const updated = prev.map((tc) => (tc.id === id ? { ...tc, ...updates } : tc));
        if (selectedTask) {
          saveCurrentSession(selectedTask.id, updated);
        }
        return updated;
      });
      toast.success("Тест-кейс обновлён");
    },
    [selectedTask, pushUndoSnapshot]
  );

  const handleDuplicateTestCase = useCallback(
    (id: string) => {
      const tc = testCases.find((t) => t.id === id);
      if (!tc) return;

      pushUndoSnapshot();

      const clone: TestCase = {
        ...tc,
        id: `tc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        comment: tc.comment ? `${tc.comment} (копия)` : "копия",
      };

      setTestCases((prev) => {
        const idx = prev.findIndex((t) => t.id === id);
        const updated = [...prev];
        updated.splice(idx + 1, 0, clone);
        if (selectedTask) {
          saveCurrentSession(selectedTask.id, updated);
        }
        return updated;
      });

      toast.success("Тест-кейс дублирован");
    },
    [testCases, selectedTask, pushUndoSnapshot]
  );

  const handleBulkRemove = useCallback(
    (ids: string[]) => {
      pushUndoSnapshot();
      setTestCases((prev) => {
        const updated = prev.filter((t) => !ids.includes(t.id));
        if (selectedTask) {
          saveCurrentSession(selectedTask.id, updated);
        }
        return updated;
      });
      toast.success(`Удалено тест-кейсов: ${ids.length}`);
    },
    [selectedTask, pushUndoSnapshot]
  );

  // Parse input for reference function
  const parseInputForRef = useCallback((v: string) => {
    const trimmed = v.trim();
    if (trimmed === "true" || trimmed === "да" || trimmed === "верно") return true;
    if (trimmed === "false" || trimmed === "нет" || trimmed === "неверно") return false;
    if (trimmed === "null") return null;
    if (trimmed === "undefined") return undefined;
    const num = Number(trimmed);
    if (trimmed !== "" && !isNaN(num) && /^-?\d+(\.\d+)?$/.test(trimmed)) return num;
    try {
      const p = JSON.parse(trimmed);
      if (typeof p === "object") return p;
    } catch {
      if (process.env.NODE_ENV === "development") logger.debug("parseInputForRef: JSON.parse failed", { input: trimmed });
    }
    return trimmed;
  }, []);

  // Generate test case from equivalence class
  const generateTestCaseFromEc = useCallback(
    (ec: { id: string; name: string; description: string; exampleValues: unknown[] }) => {
      if (!selectedTask || ec.exampleValues.length === 0) return null;

      const exampleValue = ec.exampleValues[0];
      const inputs = Array.isArray(exampleValue) ? exampleValue.map(String) : [String(exampleValue)];
      const parsedInputs = inputs.map(parseInputForRef);

      const { result: fnResult, error: fnError } = runReferenceFunction(selectedTask.id, parsedInputs);

      const expectedOutput = fnError
        ? `Ошибка: ${fnError}`
        : typeof fnResult === "object"
          ? JSON.stringify(fnResult)
          : String(fnResult);

      let category: TestCaseCategory = "Нормальное значение";
      const desc = ec.description.toLowerCase();
      if (
        desc.includes("ошибк") ||
        desc.includes("недопустим") ||
        desc.includes("переполнен") ||
        desc.includes("неверный")
      ) {
        category = fnError ? "Исключение" : "Нормальное значение";
      }
      if (desc.includes("границ") || desc.includes("миним") || desc.includes("максим")) {
        category = "Граничное значение";
      }

      return {
        id: `tc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        inputs,
        expectedOutput,
        category,
        comment: `Подсказка: ${ec.name}`,
      };
    },
    [selectedTask, parseInputForRef]
  );

  const handleShowHint = useCallback(() => {
    if (!selectedTask) return;

    const result = evaluateTestCases(selectedTask, testCases);
    if (result.uncoveredEcIds.length === 0) {
      toast.info("Все классы эквивалентности уже покрыты!");
      return;
    }

    const randomEcId =
      result.uncoveredEcIds[Math.floor(Math.random() * result.uncoveredEcIds.length)];
    const ec = selectedTask.equivalenceClasses.find((e) => e.id === randomEcId);
    if (!ec) return;

    // Generate hint info without auto-adding
    const exampleValue = ec.exampleValues[0];
    const suggestedInput = Array.isArray(exampleValue) ? exampleValue.map(String).join(", ") : String(exampleValue);

    // Dispatch hint event for HintDialog to display
    window.dispatchEvent(new CustomEvent("show-hint", {
      detail: {
        ecName: ec.name,
        ecDescription: ec.description,
        suggestedInput,
        exampleValues: ec.exampleValues.map((v) => Array.isArray(v) ? v.join(", ") : String(v)),
        taskId: String(selectedTask.id),
        whyImportant: ec.whyImportant,
      },
    }));
  }, [selectedTask, testCases]);

  const handleFillAllEc = useCallback(() => {
    if (!selectedTask) return;

    const result = evaluateTestCases(selectedTask, testCases);
    const uncoveredIds = result.uncoveredEcIds;
    if (uncoveredIds.length === 0) {
      toast.info("Все классы эквивалентности уже покрыты!");
      return;
    }

    const newCases: TestCase[] = [];
    for (const ecId of uncoveredIds) {
      const ec = selectedTask.equivalenceClasses.find((e) => e.id === ecId);
      if (!ec) continue;
      const tc = generateTestCaseFromEc(ec);
      if (tc) newCases.push(tc);
    }

    if (newCases.length === 0) {
      toast.warning("Не удалось сгенерировать тест-кейсы");
      return;
    }

    pushUndoSnapshot();
    setTestCases((prev) => {
      const updated = [...prev, ...newCases];
      if (selectedTask) {
        saveCurrentSession(selectedTask.id, updated);
      }
      return updated;
    });

    toast.success(`Добавлено ${newCases.length} тест-кейс(ов) для покрытия всех EC`);
  }, [selectedTask, testCases, generateTestCaseFromEc, pushUndoSnapshot]);

  const handleFillAllBv = useCallback(() => {
    if (!selectedTask) return;

    const result = evaluateTestCases(selectedTask, testCases);
    const uncoveredBvs = result.uncoveredBvDescriptions;
    if (uncoveredBvs.length === 0) {
      toast.info("Все граничные значения уже покрыты!");
      return;
    }

    const newCases: TestCase[] = [];
    for (const bvDesc of uncoveredBvs) {
      const bv = selectedTask.boundaryValues.find((b) => b.description === bvDesc);
      if (!bv) continue;

      const inputValues = Array.isArray(bv.value) ? bv.value.map(String) : [String(bv.value)];
      const parsedInputs = inputValues.map(parseInputForRef);
      const { result: fnResult, error: fnError } = runReferenceFunction(selectedTask.id, parsedInputs);

      const expectedOutput = fnError
        ? `Ошибка: ${fnError}`
        : typeof fnResult === "object"
          ? JSON.stringify(fnResult)
          : String(fnResult);

      newCases.push({
        id: `tc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        inputs: inputValues,
        expectedOutput,
        category: "Граничное значение",
        comment: `BV: ${bvDesc}`,
      });
    }

    if (newCases.length === 0) {
      toast.warning("Не удалось сгенерировать тест-кейсы");
      return;
    }

    pushUndoSnapshot();
    setTestCases((prev) => {
      const updated = [...prev, ...newCases];
      if (selectedTask) {
        saveCurrentSession(selectedTask.id, updated);
      }
      return updated;
    });

    toast.success(`Добавлено ${newCases.length} тест-кейс(ов) для покрытия всех BV`);
  }, [selectedTask, testCases, pushUndoSnapshot, parseInputForRef]);

  // Submit evaluation
  const handleSubmit = useCallback(async () => {
    if (!selectedTask || testCases.length === 0) return;

    const result = evaluateTestCases(selectedTask, testCases);
    setEvaluationResult(result);
    setActiveTab("results");

    saveProgress(selectedTask.id, result.overallScore, testCases);
    setSavedProgress(loadProgress());

    // Compute category distribution
    const categoryDist: Record<string, number> = {};
    testCases.forEach((tc) => {
      categoryDist[tc.category] = (categoryDist[tc.category] || 0) + 1;
    });

    saveAttempt({
      taskId: selectedTask.id,
      score: result.overallScore,
      ecCoverage: result.ecCoverage,
      bvCoverage: result.boundaryCoverage,
      correctnessScore: result.correctnessScore,
      timestamp: Date.now(),
      testCasesCount: testCases.length,
      coveredEcIds: result.coveredEcIds,
      coveredBvDescriptions: result.coveredBvDescriptions,
      timeSpentMs: elapsedTime > 0 ? elapsedTime * 1000 : undefined,
      categoryDistribution: categoryDist,
    });
    setAttemptHistory(loadAttemptHistory());

    // Sync to server (fire-and-forget)
    const timeSpentSeconds = elapsedTime > 0 ? elapsedTime : 0;
    syncAttemptToServer({
      taskId: String(selectedTask.id),
      testCases: testCases.map((tc) => ({
        id: tc.id,
        inputs: tc.inputs,
        expectedOutput: tc.expectedOutput,
        category: tc.category,
        comment: tc.comment,
      })),
      score: result.overallScore,
      ecCoverage: result.ecCoverage,
      bvCoverage: result.boundaryCoverage,
      correctness: result.correctnessScore,
      coveredEcIds: result.coveredEcIds,
      coveredBvDescriptions: result.coveredBvDescriptions,
      timeSpent: timeSpentSeconds,
    });

    const updatedStreak = await saveStreak();
    setStreak(updatedStreak);

    // Check achievements
    const history = loadAttemptHistory();
    const progress = loadProgress();

    const maxEc = history.reduce((max, h) => Math.max(max, h.ecCoverage ?? 0), 0);
    const maxBv = history.reduce((max, h) => Math.max(max, h.bvCoverage ?? 0), 0);

    const examScores = history.filter((h) => h.testCasesCount > 0);
    const examsCompleted = examScores.length;
    const examAvgScore =
      examsCompleted > 0
        ? Math.round(examScores.reduce((s, h) => s + h.score, 0) / examsCompleted)
        : 0;

    // Check if all 4 categories were used in this submission
    const categorySet = new Set(testCases.map((tc) => tc.category));
    const usedAllCategories = categorySet.size >= 4;

    // Count score improvements (current score > previous best on same task)
    const scoreImprovements = history.filter((h) => {
      const prev = progress[String(h.taskId)];
      return prev && h.score > prev.score;
    }).length;

    // Count distinct active days
    const activeDays = new Set(history.map((h) => new Date(h.timestamp).toDateString())).size;

    // Count distinct tasks where exception/invalid type tests were submitted
    const exceptionTestTasks = new Set(
      history
        .filter((h) => h.categoryDistribution && h.categoryDistribution["Исключение"] > 0)
        .map((h) => h.taskId)
    ).size;

    const context = {
      completedTasks: Object.keys(progress).length,
      totalTasks: tasks.length,
      bestScores: Object.fromEntries(
        Object.entries(progress).map(([id, p]) => [id, p.score])
      ),
      totalAttempts: history.length,
      perfectScores: Object.values(progress).filter((p) => p.score >= 100).length,
      attemptHistory: history.map((h) => ({
        taskId: h.taskId,
        score: h.score,
        timestamp: h.timestamp,
      })),
      maxEcCoverage: maxEc,
      maxBvCoverage: maxBv,
      examsCompleted,
      examAvgScore,
      usedAllCategories,
      scoreImprovements,
      daysActive: activeDays,
      marathonCompleted: getMarathonsCompleted(),
      bestMarathonScore: getBestMarathonAvgScore(),
      exceptionTestTasks,
      workedExamplesViewed: Object.keys(progress).length, // tasks with attempts ≈ worked examples viewed
      testCaseCategories: new Set(
        history.flatMap((h) => {
          const dist = h.categoryDistribution;
          return dist ? Object.keys(dist).filter((k) => dist[k] > 0) : [];
        })
      ),
    };

    const newlyUnlocked = checkAndUnlockAchievements(context);
    if (newlyUnlocked.length > 0) {
      window.dispatchEvent(new Event("achievements-updated"));
      for (const id of newlyUnlocked) {
        const ach = allAchievements.find((a) => a.id === id);
        if (ach) {
          toast.custom(() => <AchievementToast achievement={ach} />, { duration: 5000 });
        }
      }
    }

    toast.success(`Проверка завершена! Оценка: ${result.overallScore}%`);

    if (result.overallScore >= 90) {
      triggerConfetti();
    }
  }, [selectedTask, testCases, elapsedTime, triggerConfetti]);

  // Reset current task
  const handleReset = useCallback(() => {
    setTestCases([]);
    setEvaluationResult(null);
    setActiveTab("trainer");

    if (selectedTask) {
      saveCurrentSession(selectedTask.id, []);
    }
    undoStack.clear();
  }, [selectedTask, undoStack]);

  // Clear all test cases
  const handleClearAll = useCallback(() => {
    pushUndoSnapshot();
    setTestCases([]);
    setEvaluationResult(null);

    if (selectedTask) {
      saveCurrentSession(selectedTask.id, []);
    }

    toast.info("Все тест-кейсы удалены");
  }, [selectedTask, pushUndoSnapshot]);

  // Reset all progress
  const handleResetAllProgress = useCallback(() => {
    clearAllProgress();
    setSavedProgress({});
    setTestCases([]);
    setEvaluationResult(null);
    setSelectedTask(null);
    setActiveTab("tasks");
    setStreak({ currentStreak: 0, longestStreak: 0, lastActiveDate: "" });
    setAttemptHistory([]);
    undoStack.clear();
    setResetDialogOpen(false);
    toast.success("Весь прогресс сброшен");
  }, [undoStack]);

  // Export/Import
  const handleExportProgress = useCallback(() => {
    const json = exportAllProgress();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `test-trainer-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Прогресс экспортирован");
  }, []);

  const handleImportProgress = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        if (importAllProgress(text)) {
          setSavedProgress(loadProgress());
          setStreak(loadStreak());
          setAttemptHistory(loadAttemptHistory());
          toast.success("Прогресс импортирован");
        } else {
          toast.error("Не удалось импортировать прогресс");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, []);

  const handleBackToTasks = useCallback(() => {
    setActiveTab("tasks");
  }, []);

  const handleRandomTask = useCallback(() => {
    const pool = filteredTasks.length > 0 ? filteredTasks : tasks;
    const uncompleted = pool.filter((t) => !savedProgress[String(t.id)]);
    const randomPool = uncompleted.length > 0 ? uncompleted : pool;
    const randomTask = randomPool[Math.floor(Math.random() * randomPool.length)];
    handleSelectTask(randomTask);
  }, [savedProgress, handleSelectTask, filteredTasks]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!taskStartTime || activeTab !== "trainer") return;
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - taskStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [taskStartTime, activeTab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (activeTab === "trainer" && selectedTask && testCases.length > 0) {
          handleSubmit();
        }
      }

      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        (e.key === "Z" || e.key === "z" || e.key === "Я" || e.key === "я")
      ) {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "Z" || e.key === "z" || e.key === "Я" || e.key === "я")
      ) {
        e.preventDefault();
        handleUndo();
        return;
      }

      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
        e.preventDefault();
        setShowShortcuts(true);
      }

      if (e.key === "h" || e.key === "H" || e.key === "р" || e.key === "Р") {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
        if (activeTab === "trainer" && selectedTask) {
          e.preventDefault();
          handleShowHint();
        }
      }

      if (e.key === "f" || e.key === "F" || e.key === "а" || e.key === "А") {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
        if (activeTab === "trainer" && selectedTask) {
          e.preventDefault();
          handleFillAllEc();
        }
      }

      if (e.key === "b" || e.key === "B" || e.key === "и" || e.key === "И") {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
        if (activeTab === "trainer" && selectedTask) {
          e.preventDefault();
          handleFillAllBv();
        }
      }

      if ((e.key === "r" || e.key === "R" || e.key === "к" || e.key === "К") && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
        if (activeTab === "tasks") {
          e.preventDefault();
          handleRandomTask();
        }
      }

      if (activeTab === "tasks" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
        const num = parseInt(e.key);
        const available = filteredTasks.length > 0 ? filteredTasks : tasks;
        if (num >= 1 && num <= available.length) {
          e.preventDefault();
          const task = available.find((t) => t.id === num);
          if (task) {
            handleSelectTask(task);
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    activeTab,
    selectedTask,
    testCases,
    handleSubmit,
    handleUndo,
    handleRedo,
    handleSelectTask,
    handleShowHint,
    handleFillAllEc,
    handleRandomTask,
    filteredTasks,
    handleFillAllBv,
  ]);

  return {
    // State
    activeTab,
    selectedTask,
    testCases,
    evaluationResult,
    savedProgress,
    showConfetti,
    showShortcuts,
    attemptHistory,
    streak,
    resetDialogOpen,
    difficultyFilter,
    sortMode,
    searchQuery,
    // Computed
    completedCount,
    taskBestCoverage,
    filteredTasks,
    elapsedTime,
    // Setters
    setActiveTab,
    setResetDialogOpen,
    setDifficultyFilter,
    setSortMode,
    setSearchQuery,
    setShowShortcuts,
    // Actions
    handleSelectTask,
    handleAddTestCase,
    handleRemoveTestCase,
    handleReorderTestCases,
    handleEditTestCase,
    handleDuplicateTestCase,
    handleBulkRemove,
    handleSubmit,
    handleReset,
    handleClearAll,
    handleResetAllProgress,
    handleExportProgress,
    handleImportProgress,
    handleBackToTasks,
    handleRandomTask,
    handleShowHint,
    handleFillAllEc,
    handleFillAllBv,
    handleUndo,
    handleRedo,
  };
}
