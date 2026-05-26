"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useMemo } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ListChecks,
  Dumbbell,
  BarChart3,
  BookOpen,
  TrendingUp,
  Timer,
} from "lucide-react";
import type { TestCase, EvaluationResult } from "@/lib/evaluator";
import type { Task as TaskType, Difficulty, TestCaseCategory } from "@/lib/tasks";
import type { TaskProgress, AttemptRecord } from "@/lib/storage";
import type { TabValue, DifficultyFilter, SortMode } from "@/hooks/use-trainer-state";
import { TaskListTab } from "@/components/task-list-tab";
import { TrainerTab } from "@/components/trainer-tab";
import { ResultsPanel } from "@/components/results-panel";
import { TheoryPanel } from "@/components/theory-panel";
import { StatisticsPanel } from "@/components/statistics-panel";
import { ExamMode } from "@/components/exam-mode";
import { AchievementsPanel } from "@/components/achievements-panel";
import type { AchievementContext } from "@/lib/achievements";
import { tasks } from "@/lib/tasks";

const pageVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

interface TabContentProps {
  activeTab: TabValue;
  onTabChange: (tab: string) => void;
  selectedTask: TaskType | null;
  testCases: TestCase[];
  evaluationResult: EvaluationResult | null;
  attemptHistory: AttemptRecord[];
  savedProgress: Record<string, TaskProgress>;
  taskBestCoverage: Record<string, { bestEc: number; bestBv: number }>;
  elapsedTime: number;
  searchQuery: string;
  difficultyFilter: DifficultyFilter;
  sortMode: SortMode;
  filteredTasks: TaskType[];
  onSearchQueryChange: (q: string) => void;
  onDifficultyFilterChange: (d: DifficultyFilter) => void;
  onSortModeChange: (s: SortMode) => void;
  onSelectTask: (task: TaskType) => void;
  onAddTestCase: (inputs: string[], expected: string, category: TestCaseCategory, comment: string) => void;
  onRemoveTestCase: (id: string) => void;
  onDuplicateTestCase: (id: string) => void;
  onEditTestCase: (id: string, updates: Partial<{inputs: string[]; expectedOutput: string; category: TestCaseCategory; comment: string}>) => void;
  onSubmit: () => void;
  onReset: () => void;
  onShowHint: () => void;
  onFillAllEc: () => void;
  onFillAllBv: () => void;
  onReorder: (reordered: TestCase[]) => void;
  onBulkRemove: (ids: string[]) => void;
  onClearAll: () => void;
  onBackToTasks: () => void;
  onRandomTask: () => void;
}

export function TabContent({
  activeTab,
  onTabChange,
  selectedTask,
  testCases,
  evaluationResult,
  attemptHistory,
  savedProgress,
  taskBestCoverage,
  elapsedTime,
  searchQuery,
  difficultyFilter,
  sortMode,
  filteredTasks,
  onSearchQueryChange,
  onDifficultyFilterChange,
  onSortModeChange,
  onSelectTask,
  onAddTestCase,
  onRemoveTestCase,
  onDuplicateTestCase,
  onEditTestCase,
  onSubmit,
  onReset,
  onShowHint,
  onFillAllEc,
  onFillAllBv,
  onReorder,
  onBulkRemove,
  onClearAll,
  onBackToTasks,
  onRandomTask,
}: TabContentProps) {
  const achievementContext = useMemo<AchievementContext>(() => ({
    completedTasks: Object.keys(savedProgress).length,
    totalTasks: tasks.length,
    bestScores: Object.fromEntries(Object.entries(savedProgress).map(([id, p]) => [id, p.score])),
    totalAttempts: attemptHistory.length,
    perfectScores: Object.values(savedProgress).filter((p) => p.score >= 100).length,
    attemptHistory: attemptHistory.map((h) => ({ taskId: h.taskId, score: h.score, timestamp: h.timestamp })),
    maxEcCoverage: attemptHistory.reduce((max, h) => Math.max(max, h.ecCoverage ?? 0), 0),
    maxBvCoverage: attemptHistory.reduce((max, h) => Math.max(max, h.bvCoverage ?? 0), 0),
  }), [savedProgress, attemptHistory]);

  return (
    <Tabs value={activeTab} onValueChange={onTabChange}>
      <TabsList className="flex flex-wrap sm:grid sm:grid-cols-6 w-full mb-4 sm:mb-6 h-auto p-1 bg-muted/50 gap-1">
        <TabsTrigger
          value="tasks"
          className="text-xs sm:text-sm py-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
        >
          <ListChecks className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Задания</span>
          <span className="sm:hidden">Зад</span>
        </TabsTrigger>
        <TabsTrigger
          value="trainer"
          className="text-xs sm:text-sm py-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
          disabled={!selectedTask}
        >
          <Dumbbell className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Тренажёр</span>
          <span className="sm:hidden">Тр</span>
        </TabsTrigger>
        <TabsTrigger
          value="results"
          className="text-xs sm:text-sm py-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
          disabled={!evaluationResult}
        >
          <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Результаты</span>
          <span className="sm:hidden">Рез</span>
        </TabsTrigger>
        <TabsTrigger
          value="statistics"
          className="text-xs sm:text-sm py-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
        >
          <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Статистика</span>
          <span className="sm:hidden">Ст</span>
        </TabsTrigger>
        <TabsTrigger
          value="exam"
          className="text-xs sm:text-sm py-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
        >
          <Timer className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Экзамен</span>
          <span className="sm:hidden">Эк</span>
        </TabsTrigger>
        <TabsTrigger
          value="theory"
          className="text-xs sm:text-sm py-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
        >
          <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Теория</span>
          <span className="sm:hidden">Т</span>
        </TabsTrigger>
      </TabsList>

      <AnimatePresence mode="wait">
        {activeTab === "tasks" && (
          <TaskListTab
            filteredTasks={filteredTasks}
            selectedTask={selectedTask}
            savedProgress={savedProgress}
            taskBestCoverage={taskBestCoverage}
            searchQuery={searchQuery}
            difficultyFilter={difficultyFilter}
            sortMode={sortMode}
            onSearchQueryChange={onSearchQueryChange}
            onDifficultyFilterChange={onDifficultyFilterChange}
            onSortModeChange={onSortModeChange}
            onSelectTask={onSelectTask}
            onRandomTask={onRandomTask}
          />
        )}

        {activeTab === "trainer" && selectedTask && (
          <TrainerTab
            task={selectedTask}
            testCases={testCases}
            onBack={onBackToTasks}
            onAddTestCase={onAddTestCase}
            onRemoveTestCase={onRemoveTestCase}
            onDuplicateTestCase={onDuplicateTestCase}
            onEditTestCase={onEditTestCase}
            onSubmit={onSubmit}
            onShowHint={onShowHint}
            onFillAllEc={onFillAllEc}
            onFillAllBv={onFillAllBv}
            onReorder={onReorder}
            onBulkRemove={onBulkRemove}
            onClearAll={onClearAll}
            elapsedTime={elapsedTime}
          />
        )}

        {activeTab === "results" && evaluationResult && (
          <motion.div
            key="results"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            <div className="mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-1">Результаты проверки</h2>
              <p className="text-sm text-muted-foreground">
                Подробная оценка ваших тест-кейсов с покрытием и рекомендациями.
              </p>
            </div>
            <div className="max-w-4xl mx-auto">
              <ResultsPanel
                result={evaluationResult}
                testCases={testCases}
                onReset={onReset}
                bestScore={savedProgress[String(evaluationResult.task.id)]?.score}
                elapsedTime={elapsedTime}
              />
            </div>
          </motion.div>
        )}

        {activeTab === "theory" && (
          <motion.div
            key="theory"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            <div className="mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-1">Теория тестирования</h2>
              <p className="text-sm text-muted-foreground">
                Изучите основные методы тестирования «чёрного ящика» перед выполнением заданий.
              </p>
            </div>
            <div className="max-w-3xl mx-auto">
              <TheoryPanel task={selectedTask ?? undefined} />
            </div>
          </motion.div>
        )}

        {activeTab === "statistics" && (
          <motion.div
            key="statistics"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            <div className="mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-1">Статистика и достижения</h2>
              <p className="text-sm text-muted-foreground">
                Обзор результатов и полученные достижения.
              </p>
            </div>
            <div className="max-w-3xl mx-auto space-y-6">
              <StatisticsPanel attempts={attemptHistory} />
              <AchievementsPanel context={achievementContext} />
            </div>
          </motion.div>
        )}

        {activeTab === "exam" && (
          <motion.div
            key="exam"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            <div className="mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-1">Режим экзамена</h2>
              <p className="text-sm text-muted-foreground">
                Пройдите задания на время без подсказок.
              </p>
            </div>
            <ExamMode />
          </motion.div>
        )}
      </AnimatePresence>
    </Tabs>
  );
}
