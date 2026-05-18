import { create } from "zustand";
import type { Task } from "@/lib/tasks";
import type { TestCase, EvaluationResult } from "@/lib/evaluator";
import { evaluateTestCases } from "@/lib/evaluator";
import {
  saveCurrentSession,
  loadCurrentSession,
  saveProgress as saveProgressToStorage,
  loadProgress as loadProgressFromStorage,
  saveAttempt,
  loadAttemptHistory,
  loadStreak,
  saveStreak as saveStreakToStorage,
  clearAllProgress as clearAllProgressFromStorage,
  getMarathonsCompleted,
  getBestMarathonAvgScore,
  type TaskProgress as StorageTaskProgress,
  type AttemptRecord,
  type StreakData,
} from "@/lib/storage";
import { checkAndUnlockAchievements, achievements } from "@/lib/achievements";
import { tasks, runReferenceFunction } from "@/lib/tasks";
import { toast } from "sonner";
import { UndoStack } from "@/lib/undo-stack";
import { apiFetch } from "@/lib/api-client";

export type { StorageTaskProgress, AttemptRecord, StreakData };

/** Context passed to achievement checker */
export interface AchievementContext {
  completedTasks: number;
  totalTasks: number;
  bestScores: Record<number, number>;
  totalAttempts: number;
  perfectScores: number;
  attemptHistory: { taskId: number; score: number; timestamp: number }[];
  maxEcCoverage?: number;
  maxBvCoverage?: number;
  examsCompleted?: number;
  examAvgScore?: number;
  usedAllCategories?: boolean;
  theorySectionsRead?: number;
  scoreImprovements?: number;
  daysActive?: number;
  marathonCompleted?: number;
  bestMarathonScore?: number;
}

interface TrainerStore {
  // Active task
  selectedTask: Task | null;
  setSelectedTask: (task: Task | null) => void;

  // Test cases for current task
  testCases: TestCase[];
  setTestCases: (testCases: TestCase[]) => void;
  addTestCase: (testCase: TestCase) => void;
  removeTestCase: (id: string) => void;
  reorderTestCases: (testCases: TestCase[]) => void;
  clearTestCases: () => void;

  // Undo/Redo
  canUndo: boolean;
  canRedo: boolean;
  handleUndo: () => void;
  handleRedo: () => void;

  // Evaluation
  evaluationResult: EvaluationResult | null;
  setEvaluationResult: (result: EvaluationResult | null) => void;

  // Saved progress (best scores per task)
  savedProgress: Record<number, StorageTaskProgress>;
  loadSavedProgress: () => void;

  // Session persistence
  loadSession: (taskId: number) => void;
  saveSession: () => void;

  // Submit & evaluate (with achievements + server sync)
  submitTestCases: (elapsedTime?: number) => EvaluationResult | null;

  // Generate test cases from EC/BV
  generateTestCaseFromEc: (ec: { id: string; name: string; description: string; exampleValues: unknown[] }) => void;
  fillAllUncoveredEc: () => number;
  fillAllUncoveredBv: () => number;

  // Reset
  clearAllProgress: () => void;
}

/** Builds an AchievementContext from current localStorage data */
export function buildAchievementContext(): AchievementContext {
  const progress = loadProgressFromStorage();
  const history = loadAttemptHistory();

  const bestScores: Record<number, number> = {};
  for (const [taskIdStr, p] of Object.entries(progress)) {
    const taskId = Number(taskIdStr);
    bestScores[taskId] = Math.max(bestScores[taskId] ?? 0, p.score);
  }

  const perfectScores = Object.values(progress).filter((p) => p.score === 100).length;
  const maxEc = history.reduce((max, h) => Math.max(max, h.ecCoverage ?? 0), 0);
  const maxBv = history.reduce((max, h) => Math.max(max, h.bvCoverage ?? 0), 0);
  const activeDays = new Set(history.map((h) => new Date(h.timestamp).toDateString())).size;

  const scoreImprovements = history.filter((h) => {
    const prev = progress[h.taskId];
    return prev && h.score > prev.score;
  }).length;

  return {
    completedTasks: Object.keys(progress).length,
    totalTasks: tasks.length,
    bestScores,
    totalAttempts: history.length,
    perfectScores,
    attemptHistory: history.map((h) => ({
      taskId: h.taskId,
      score: h.score,
      timestamp: h.timestamp,
    })),
    maxEcCoverage: maxEc,
    maxBvCoverage: maxBv,
    usedAllCategories: false,
    scoreImprovements,
    daysActive: activeDays,
    marathonCompleted: getMarathonsCompleted(),
    bestMarathonScore: getBestMarathonAvgScore(),
  };
}

/** Sync attempt to server (non-blocking, fire-and-forget) */
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
      console.warn("Failed to sync attempt to server:", res.status);
    }
  } catch {
    // Silently fail — localStorage is the primary storage
  }
}

/** Parse a string input value for reference function execution */
function parseInputForRef(v: string): unknown {
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
}

/** Generate a test case from an equivalence class example value */
function generateTestCaseFromEc(
  task: Task,
  ec: { id: string; name: string; description: string; exampleValues: unknown[] }
): TestCase | null {
  if (ec.exampleValues.length === 0) return null;

  const exampleValue = ec.exampleValues[0];
  const inputs = Array.isArray(exampleValue) ? exampleValue.map(String) : [String(exampleValue)];
  const parsedInputs = inputs.map(parseInputForRef);

  const { result: fnResult, error: fnError } = runReferenceFunction(task.id, parsedInputs);

  let expectedOutput = fnError
    ? `Ошибка: ${fnError}`
    : typeof fnResult === "object"
      ? JSON.stringify(fnResult)
      : String(fnResult);

  let category: TestCase["category"] = "Нормальное значение";
  const desc = ec.description.toLowerCase();
  if (desc.includes("ошибк") || desc.includes("недопустим") || desc.includes("переполнен") || desc.includes("неверный")) {
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
}

/** Generate a test case from a boundary value */
function generateTestCaseFromBv(
  task: Task,
  bv: { value: unknown; description: string }
): TestCase {
  const inputValues = Array.isArray(bv.value) ? bv.value.map(String) : [String(bv.value)];
  const parsedInputs = inputValues.map(parseInputForRef);
  const { result: fnResult, error: fnError } = runReferenceFunction(task.id, parsedInputs);

  const expectedOutput = fnError
    ? `Ошибка: ${fnError}`
    : typeof fnResult === "object"
      ? JSON.stringify(fnResult)
      : String(fnResult);

  return {
    id: `tc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    inputs: inputValues,
    expectedOutput,
    category: "Граничное значение",
    comment: `BV: ${bv.description}`,
  };
}

export const useTrainerStore = create<TrainerStore>((set, get) => {
  const undoStack = new UndoStack<TestCase[]>(50);

  const pushUndoSnapshot = () => {
    const { testCases } = get();
    undoStack.push([...testCases]);
  };

  const syncUndoState = () => {
    set({ canUndo: undoStack.canUndo, canRedo: undoStack.canRedo });
  };

  return {
    selectedTask: null,
    setSelectedTask: (task) => {
      const state = get();
      if (state.selectedTask && task && state.selectedTask.id === task.id) return;
      if (task) {
        const saved = loadCurrentSession(task.id);
        set({ selectedTask: task, testCases: saved ?? [], evaluationResult: null });
      } else {
        set({ selectedTask: null, testCases: [], evaluationResult: null });
      }
      undoStack.clear();
      syncUndoState();
    },

    testCases: [],
    setTestCases: (testCases) => {
      const state = get();
      if (state.selectedTask) {
        saveCurrentSession(state.selectedTask.id, testCases);
      }
      set({ testCases });
    },
    addTestCase: (testCase) => {
      pushUndoSnapshot();
      syncUndoState();
      set((state) => {
        const testCases = [...state.testCases, testCase];
        if (state.selectedTask) {
          saveCurrentSession(state.selectedTask.id, testCases);
        }
        return { testCases };
      });
    },
    removeTestCase: (id) => {
      pushUndoSnapshot();
      syncUndoState();
      set((state) => {
        const testCases = state.testCases.filter((tc) => tc.id !== id);
        if (state.selectedTask) {
          saveCurrentSession(state.selectedTask.id, testCases);
        }
        return { testCases };
      });
    },
    reorderTestCases: (testCases) => {
      pushUndoSnapshot();
      syncUndoState();
      const state = get();
      if (state.selectedTask) {
        saveCurrentSession(state.selectedTask.id, testCases);
      }
      set({ testCases });
    },
    clearTestCases: () => {
      undoStack.clear();
      syncUndoState();
      const state = get();
      if (state.selectedTask) {
        saveCurrentSession(state.selectedTask.id, []);
      }
      set({ testCases: [], evaluationResult: null });
    },

    canUndo: false,
    canRedo: false,
    handleUndo: () => {
      const state = get();
      const prev = undoStack.undo();
      if (prev) {
        set({ testCases: prev });
        if (state.selectedTask) {
          saveCurrentSession(state.selectedTask.id, prev);
        }
        toast.info("Действие отменено");
      }
      syncUndoState();
    },
    handleRedo: () => {
      const state = get();
      const next = undoStack.redo();
      if (next) {
        set({ testCases: next });
        if (state.selectedTask) {
          saveCurrentSession(state.selectedTask.id, next);
        }
        toast.info("Действие возвращено");
      }
      syncUndoState();
    },

    evaluationResult: null,
    setEvaluationResult: (result) => set({ evaluationResult: result }),

    savedProgress: typeof window !== "undefined" ? loadProgressFromStorage() : {},
    loadSavedProgress: () => {
      set({ savedProgress: loadProgressFromStorage() });
    },

    loadSession: (taskId) => {
      const saved = loadCurrentSession(taskId);
      set({ testCases: saved ?? [] });
    },
    saveSession: () => {
      const state = get();
      if (state.selectedTask) {
        saveCurrentSession(state.selectedTask.id, state.testCases);
      }
    },

    submitTestCases: (elapsedTime = 0) => {
      const state = get();
      if (!state.selectedTask || state.testCases.length === 0) return null;

      const result = evaluateTestCases(state.selectedTask, state.testCases);
      set({ evaluationResult: result });

      saveProgressToStorage(state.selectedTask.id, result.overallScore, state.testCases);

      const categoryDist: Record<string, number> = {};
      state.testCases.forEach((tc) => {
        categoryDist[tc.category] = (categoryDist[tc.category] || 0) + 1;
      });

      saveAttempt({
        taskId: state.selectedTask.id,
        score: result.overallScore,
        ecCoverage: result.ecCoverage,
        bvCoverage: result.boundaryCoverage,
        correctnessScore: result.correctnessScore,
        timestamp: Date.now(),
        testCasesCount: state.testCases.length,
        coveredEcIds: result.coveredEcIds,
        coveredBvDescriptions: result.coveredBvDescriptions,
        timeSpentMs: elapsedTime > 0 ? elapsedTime * 1000 : undefined,
        categoryDistribution: categoryDist,
      });

      saveStreakToStorage();
      set({ savedProgress: loadProgressFromStorage() });

      // Server sync (fire-and-forget)
      const timeSpentSeconds = elapsedTime > 0 ? elapsedTime : 0;
      syncAttemptToServer({
        taskId: String(state.selectedTask.id),
        testCases: state.testCases.map((tc) => ({
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

      // Achievements
      const context = buildAchievementContext();
      const categorySet = new Set(state.testCases.map((tc) => tc.category));
      context.usedAllCategories = categorySet.size >= 4;

      const newlyUnlocked = checkAndUnlockAchievements(context);
      if (newlyUnlocked.length > 0) {
        window.dispatchEvent(new Event("achievements-updated"));
        for (const id of newlyUnlocked) {
          const ach = achievements.find((a) => a.id === id);
          if (ach) {
            toast.success(`🏆 ${ach.name} разблокировано!`);
          }
        }
      }

      toast.success(`Проверка завершена! Оценка: ${result.overallScore}%`);
      return result;
    },

    generateTestCaseFromEc: (ec) => {
      const state = get();
      if (!state.selectedTask) return;
      const tc = generateTestCaseFromEc(state.selectedTask, ec);
      if (tc) {
        pushUndoSnapshot();
        syncUndoState();
        const testCases = [...state.testCases, tc];
        saveCurrentSession(state.selectedTask.id, testCases);
        set({ testCases });
        toast.success(`Добавлен тест-кейс: ${ec.name}`);
      }
    },
    fillAllUncoveredEc: () => {
      const state = get();
      if (!state.selectedTask) return 0;
      const result = evaluateTestCases(state.selectedTask, state.testCases);
      if (result.uncoveredEcIds.length === 0) {
        toast.info("Все классы эквивалентности уже покрыты!");
        return 0;
      }
      const newCases: TestCase[] = [];
      for (const ecId of result.uncoveredEcIds) {
        const ec = state.selectedTask.equivalenceClasses.find((e) => e.id === ecId);
        if (!ec) continue;
        const tc = generateTestCaseFromEc(state.selectedTask, ec);
        if (tc) newCases.push(tc);
      }
      if (newCases.length === 0) return 0;
      pushUndoSnapshot();
      syncUndoState();
      const testCases = [...state.testCases, ...newCases];
      saveCurrentSession(state.selectedTask.id, testCases);
      set({ testCases });
      toast.success(`Добавлено ${newCases.length} тест-кейс(ов) для покрытия EC`);
      return newCases.length;
    },
    fillAllUncoveredBv: () => {
      const state = get();
      if (!state.selectedTask) return 0;
      const result = evaluateTestCases(state.selectedTask, state.testCases);
      if (result.uncoveredBvDescriptions.length === 0) {
        toast.info("Все граничные значения уже покрыты!");
        return 0;
      }
      const newCases: TestCase[] = [];
      for (const bvDesc of result.uncoveredBvDescriptions) {
        const bv = state.selectedTask.boundaryValues.find((b) => b.description === bvDesc);
        if (!bv) continue;
        newCases.push(generateTestCaseFromBv(state.selectedTask, bv));
      }
      if (newCases.length === 0) return 0;
      pushUndoSnapshot();
      syncUndoState();
      const testCases = [...state.testCases, ...newCases];
      saveCurrentSession(state.selectedTask.id, testCases);
      set({ testCases });
      toast.success(`Добавлено ${newCases.length} тест-кейс(ов) для покрытия BV`);
      return newCases.length;
    },

    clearAllProgress: () => {
      clearAllProgressFromStorage();
      undoStack.clear();
      syncUndoState();
      set({
        selectedTask: null,
        testCases: [],
        evaluationResult: null,
        savedProgress: {},
      });
      toast.success("Весь прогресс сброшен");
    },
  };
});
