"use client";

import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskWorkspace } from "@/components/task-workspace";
import { TestForm } from "@/components/test-form";
import { TestList } from "@/components/test-list";
import type { Task, TestCase, TestCaseCategory, EvaluationResult } from "@/lib/evaluator";
import type { Task as TaskType } from "@/lib/tasks";

const pageVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

interface TrainerTabProps {
  task: TaskType;
  testCases: TestCase[];
  onBack: () => void;
  onAddTestCase: (inputs: string[], expected: string, category: TestCaseCategory, comment: string) => void;
  onRemoveTestCase: (id: string) => void;
  onDuplicateTestCase: (id: string) => void;
  onEditTestCase: (id: string, updates: Partial<{inputs: string[]; expectedOutput: string; category: TestCaseCategory; comment: string}>) => void;
  onSubmit: () => void;
  onShowHint: () => void;
  onFillAllEc: () => void;
  onReorder: (reordered: TestCase[]) => void;
  onBulkRemove: (ids: string[]) => void;
}

export function TrainerTab({
  task,
  testCases,
  onBack,
  onAddTestCase,
  onRemoveTestCase,
  onDuplicateTestCase,
  onEditTestCase,
  onSubmit,
  onShowHint,
  onFillAllEc,
  onReorder,
  onBulkRemove,
}: TrainerTabProps) {
  return (
    <motion.div
      key="trainer"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-2 mb-4 sm:mb-6">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Назад
        </Button>
        <h2 className="text-lg sm:text-xl font-semibold">Тренажёр: {task.name}</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Left panel — task description */}
        <div className="lg:max-h-[calc(100vh-240px)]">
          <TaskWorkspace task={task} />
        </div>

        {/* Right panel — test form and list */}
        <div className="space-y-4">
          <TestForm task={task} onAdd={onAddTestCase} />
          <TestList
            task={task}
            testCases={testCases}
            onRemove={onRemoveTestCase}
            onDuplicate={onDuplicateTestCase}
            onEdit={onEditTestCase}
            onSubmit={onSubmit}
            onShowHint={onShowHint}
            onFillAllEc={onFillAllEc}
            onReorder={onReorder}
            onBulkRemove={onBulkRemove}
          />
        </div>
      </div>
    </motion.div>
  );
}
