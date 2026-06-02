"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { tasks } from "@/lib/tasks";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  ListChecks,
  Dumbbell,
  BarChart3,
  TrendingUp,
  Timer,
  BookOpen,
  Shuffle,
  RotateCcw,
  ArrowLeft,
  Send,
  Lightbulb,
  Layers,
  GitBranch,
  Download,
  Upload,
  RotateCcw as ResetIcon,
} from "lucide-react";

interface CommandPaletteProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSelectTask: (taskId: number) => void;
  onRandomTask: () => void;
  onSubmit: () => void;
  onReset: () => void;
  onBackToTasks: () => void;
  onHint: () => void;
  onFillAllEc: () => void;
  onFillAllBv: () => void;
  onExport: () => void;
  onImport: () => void;
  onResetAllProgress: () => void;
  availableTaskIds: Set<number> | null;
}

export function CommandPalette({
  activeTab,
  onTabChange,
  onSelectTask,
  onRandomTask,
  onSubmit,
  onReset,
  onBackToTasks,
  onHint,
  onFillAllEc,
  onFillAllBv,
  onExport,
  onImport,
  onResetAllProgress,
  availableTaskIds,
}: CommandPaletteProps) {
  const tCommon = useTranslations("common");
  const tNav = useTranslations("nav");
  const tTrainer = useTranslations("trainer");
  const tProgress = useTranslations("progress");
  const [open, setOpen] = useState(false);

  const taskNames = useMemo(() => {
    const map: Record<number, string> = {};
    for (const t of tasks) map[t.id] = t.name;
    return map;
  }, []);

  const visibleTaskIds = useMemo(() => {
    if (!availableTaskIds) return tasks.map((t) => t.id);
    return tasks.filter((t) => availableTaskIds.has(t.id)).map((t) => t.id);
  }, [availableTaskIds]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const tabs = [
    { id: "tasks", label: tCommon("tasks"), icon: ListChecks, shortcut: "1" },
    { id: "trainer", label: tNav("trainer"), icon: Dumbbell, shortcut: "2" },
    { id: "results", label: tNav("results"), icon: BarChart3, shortcut: "3" },
    { id: "statistics", label: tCommon("statistics"), icon: TrendingUp, shortcut: "4" },
    { id: "exam", label: tNav("exam"), icon: Timer, shortcut: "5" },
    { id: "theory", label: tNav("theory"), icon: BookOpen, shortcut: "6" },
  ];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder={tCommon("search")} />
      <CommandList>
        <CommandEmpty>{tCommon("noResults")}</CommandEmpty>

        {/* Navigation */}
        <CommandGroup heading={tCommon("navigation")}>
          {tabs.map((tab) => (
            <CommandItem
              key={tab.id}
              onSelect={() => {
                onTabChange(tab.id);
                setOpen(false);
              }}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.id === activeTab && (
                <span className="ml-auto text-xs text-emerald-600 dark:text-emerald-400">{tCommon("active")}</span>
              )}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* Tasks */}
        <CommandGroup heading={tCommon("tasks")}>
          {visibleTaskIds.map((id) => (
            <CommandItem
              key={id}
              onSelect={() => {
                onSelectTask(id);
                setOpen(false);
              }}
            >
              <ListChecks className="h-4 w-4" />
              {id}. {taskNames[id]}
            </CommandItem>
          ))}
          <CommandItem
            onSelect={() => {
              onRandomTask();
              setOpen(false);
            }}
          >
            <Shuffle className="h-4 w-4" />
            {tTrainer("randomTask")}
            <CommandShortcut>R</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Actions */}
        <CommandGroup heading={tCommon("actions")}>
          {activeTab === "trainer" && (
            <>
              <CommandItem
                onSelect={() => {
                  onSubmit();
                  setOpen(false);
                }}
              >
                <Send className="h-4 w-4" />
                {tTrainer("checkTests")}
                <CommandShortcut>Ctrl+Enter</CommandShortcut>
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  onHint();
                  setOpen(false);
                }}
              >
                <Lightbulb className="h-4 w-4" />
                {tTrainer("hint")}
                <CommandShortcut>H</CommandShortcut>
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  onFillAllEc();
                  setOpen(false);
                }}
              >
                <Layers className="h-4 w-4" />
                {tTrainer("fillAllEquivalenceClasses")}
                <CommandShortcut>F</CommandShortcut>
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  onFillAllBv();
                  setOpen(false);
                }}
              >
                <GitBranch className="h-4 w-4" />
                {tTrainer("fillAllBoundaryValues")}
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  onReset();
                  setOpen(false);
                }}
              >
                <RotateCcw className="h-4 w-4" />
                {tTrainer("resetTests")}
              </CommandItem>
            </>
          )}
          {activeTab !== "tasks" && (
            <CommandItem
              onSelect={() => {
                onBackToTasks();
                setOpen(false);
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              {tCommon("back")}
            </CommandItem>
          )}
        </CommandGroup>

        <CommandSeparator />

        {/* Data */}
        <CommandGroup heading={tCommon("data")}>
          <CommandItem
            onSelect={() => {
              onExport();
              setOpen(false);
            }}
          >
            <Download className="h-4 w-4" />
            {tProgress("exportProgress")}
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onImport();
              setOpen(false);
            }}
          >
            <Upload className="h-4 w-4" />
            {tProgress("importProgress")}
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onResetAllProgress();
              setOpen(false);
            }}
          >
            <ResetIcon className="h-4 w-4" />
            {tProgress("resetAllProgress")}
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
