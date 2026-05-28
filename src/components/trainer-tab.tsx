"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskWorkspace } from "@/components/task-workspace";
import { TestForm } from "@/components/test-form";
import { TestList } from "@/components/test-list";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import type { TestCase } from "@/lib/evaluator";
import type { Task as TaskType, TestCaseCategory } from "@/lib/tasks";

const pageVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

interface TrainerTabProps {
  task: TaskType;
  testCases: TestCase[];
  elapsedTime: number;
  onBack: () => void;
  onAddTestCase: (inputs: string[], expected: string, category: TestCaseCategory, comment: string) => void;
  onRemoveTestCase: (id: string) => void;
  onDuplicateTestCase: (id: string) => void;
  onEditTestCase: (id: string, updates: Partial<{inputs: string[]; expectedOutput: string; category: TestCaseCategory; comment: string}>) => void;
  onSubmit: () => void;
  onShowHint: () => void;
  onFillAllEc: () => void;
  onFillAllBv: () => void;
  onReorder: (reordered: TestCase[]) => void;
  onBulkRemove: (ids: string[]) => void;
  onClearAll: () => void;
}

export function TrainerTab({
  task,
  testCases,
  elapsedTime,
  onBack,
  onAddTestCase,
  onRemoveTestCase,
  onDuplicateTestCase,
  onEditTestCase,
  onSubmit,
  onShowHint,
  onFillAllEc,
  onFillAllBv,
  onReorder,
  onBulkRemove,
  onClearAll,
}: TrainerTabProps) {
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <motion.div
      key="trainer"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Назад
          </Button>
          <h2 className="text-lg sm:text-xl font-semibold">Тренажёр: {task.name}</h2>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-1.5">
          <Clock className="h-3.5 w-3.5" />
          <span className="font-mono">{formatTime(elapsedTime)}</span>
        </div>
      </div>

      {/* Mobile: stacked, Desktop: resizable split */}
      <div className="lg:hidden space-y-4">
        <TaskWorkspace task={task} testCases={testCases} />
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
          onFillAllBv={onFillAllBv}
          onReorder={onReorder}
          onBulkRemove={onBulkRemove}
          onClearAll={onClearAll}
        />
      </div>

      <div className="hidden lg:block h-[calc(100dvh-6rem)]">
        <ResizablePanelGroup direction="horizontal" autoSaveId="trainer-split">
          <ResizablePanel defaultSize={50} minSize={30} className="overflow-hidden">
            <div className="h-full overflow-auto pr-4">
              <TaskWorkspace task={task} testCases={testCases} />
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={50} minSize={30} className="overflow-hidden">
            <div className="h-full overflow-auto space-y-4 pr-4">
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
                onFillAllBv={onFillAllBv}
                onReorder={onReorder}
                onBulkRemove={onBulkRemove}
                onClearAll={onClearAll}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </motion.div>
  );
}
