"use client";

import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TaskCard } from "@/components/task-card";
import { tasks } from "@/lib/tasks";
import type { Task, Difficulty } from "@/lib/tasks";
import type { TaskProgress } from "@/lib/storage";
import type { DifficultyFilter, SortMode } from "@/hooks/use-trainer-state";

const pageVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

interface TaskListTabProps {
  filteredTasks: Task[];
  selectedTask: Task | null;
  savedProgress: Record<number, TaskProgress>;
  taskBestCoverage: Record<number, { bestEc: number; bestBv: number }>;
  searchQuery: string;
  difficultyFilter: DifficultyFilter;
  sortMode: SortMode;
  onSearchQueryChange: (q: string) => void;
  onDifficultyFilterChange: (d: DifficultyFilter) => void;
  onSortModeChange: (s: SortMode) => void;
  onSelectTask: (task: Task) => void;
}

export function TaskListTab({
  filteredTasks,
  selectedTask,
  savedProgress,
  taskBestCoverage,
  searchQuery,
  difficultyFilter,
  sortMode,
  onSearchQueryChange,
  onDifficultyFilterChange,
  onSortModeChange,
  onSelectTask,
}: TaskListTabProps) {
  return (
    <motion.div
      key="tasks"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3 }}
    >
      <div className="mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold mb-1">Выберите задание</h2>
        <p className="text-sm text-muted-foreground">
          Выберите функцию для тестирования. Каждое задание содержит описание, классы
          эквивалентности и граничные значения.
        </p>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию или описанию..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex items-center gap-1">
          {(["Все", "Легко", "Средне", "Сложно"] as const).map((d) => (
            <Button
              key={d}
              variant={difficultyFilter === d ? "default" : "outline"}
              size="sm"
              className={`text-xs h-7 px-2.5 ${difficultyFilter === d ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
              onClick={() => onDifficultyFilterChange(d)}
            >
              {d}
            </Button>
          ))}
        </div>

        <div className="h-5 w-px bg-border" />

        <div className="flex items-center gap-1">
          {(["По номеру", "По имени", "По сложности"] as const).map((s) => (
            <Button
              key={s}
              variant={sortMode === s ? "default" : "outline"}
              size="sm"
              className={`text-xs h-7 px-2.5 ${sortMode === s ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
              onClick={() => onSortModeChange(s)}
            >
              {s}
            </Button>
          ))}
        </div>

        <div className="text-xs text-muted-foreground ml-auto">
          {filteredTasks.length}/{tasks.length} заданий
        </div>
      </div>

      {/* Task grid */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-16">
          <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">Ничего не найдено</p>
          <p className="text-sm text-muted-foreground mt-1">
            Попробуйте изменить поисковый запрос или фильтры
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              isSelected={selectedTask?.id === task.id}
              bestScore={savedProgress[task.id]?.score}
              bestEcCoverage={taskBestCoverage[task.id]?.bestEc}
              bestBvCoverage={taskBestCoverage[task.id]?.bestBv}
              onClick={() => onSelectTask(task)}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
