"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { tasks } from "@/lib/tasks";
import { useTrainerState } from "@/hooks/use-trainer-state";
import { AppHeader } from "@/components/app-header";
import { ProgressStatsBar } from "@/components/progress-stats-bar";
import { TabContent } from "@/components/tab-content";
import { KeyboardShortcutsDialog } from "@/components/keyboard-shortcuts";
import { Confetti } from "@/components/confetti";
import { Onboarding } from "@/components/onboarding";
import { HintDialog } from "@/components/hint-dialog";
import { MarathonMode } from "@/components/marathon-mode";
import { CommandPalette } from "@/components/command-palette";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";

const TOTAL_TASKS = tasks.length;

export default function TrainerPage() {
  const { status } = useSession();
  const router = useRouter();
  const state = useTrainerState();
  const [marathonActive, setMarathonActive] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/trainer");
    }
  }, [status, router]);

  const handleReplayOnboarding = () => {
    window.dispatchEvent(new Event("replay-onboarding"));
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 dark:from-zinc-950 dark:via-zinc-900 dark:to-emerald-950/20">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Необходима авторизация</p>
          <Button asChild>
            <Link href="/login?callbackUrl=/trainer">
              <ArrowLeft className="mr-2 h-4 w-4" /> Войти
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (marathonActive) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 dark:from-zinc-950 dark:via-zinc-900 dark:to-emerald-950/20">
        <AppHeader
          streak={state.streak}
          onShowShortcuts={() => state.setShowShortcuts(true)}
          onReplayOnboarding={handleReplayOnboarding}
        />
        <main id="main-content" className="flex-1 max-w-7xl mx-auto w-full px-4 py-4 sm:py-6">
          <MarathonMode onExit={() => setMarathonActive(false)} />
        </main>
        <footer className="border-t bg-white/50 dark:bg-zinc-900/50 mt-auto">
          <div className="max-w-7xl mx-auto px-4 py-4 text-center text-xs text-muted-foreground">
            Тренажёр тестирования • Генератор тест-кейсов • Методы чёрного ящика
          </div>
        </footer>
        <KeyboardShortcutsDialog open={state.showShortcuts} onOpenChange={state.setShowShortcuts} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 dark:from-zinc-950 dark:via-zinc-900 dark:to-emerald-950/20">
      <AppHeader
        streak={state.streak}
        onShowShortcuts={() => state.setShowShortcuts(true)}
        onReplayOnboarding={handleReplayOnboarding}
        onMarathonClick={() => setMarathonActive(true)}
      />

      <main id="main-content" className="flex-1 max-w-7xl mx-auto w-full px-4 py-4 sm:py-6">
        <ProgressStatsBar
          completedCount={state.completedCount}
          totalTasks={TOTAL_TASKS}
          savedProgress={state.savedProgress}
          resetDialogOpen={state.resetDialogOpen}
          onResetDialogOpenChange={state.setResetDialogOpen}
          onExport={state.handleExportProgress}
          onImport={state.handleImportProgress}
          onResetAll={state.handleResetAllProgress}
        />

        <TabContent
          activeTab={state.activeTab}
          onTabChange={state.setActiveTab as (tab: string) => void}
          selectedTask={state.selectedTask}
          testCases={state.testCases}
          evaluationResult={state.evaluationResult}
          attemptHistory={state.attemptHistory}
          savedProgress={state.savedProgress}
          taskBestCoverage={state.taskBestCoverage}
          elapsedTime={state.elapsedTime}
          searchQuery={state.searchQuery}
          difficultyFilter={state.difficultyFilter}
          sortMode={state.sortMode}
          filteredTasks={state.filteredTasks}
          onSearchQueryChange={state.setSearchQuery}
          onDifficultyFilterChange={state.setDifficultyFilter}
          onSortModeChange={state.setSortMode}
          onSelectTask={state.handleSelectTask}
          onAddTestCase={state.handleAddTestCase}
          onRemoveTestCase={state.handleRemoveTestCase}
          onDuplicateTestCase={state.handleDuplicateTestCase}
          onEditTestCase={state.handleEditTestCase}
          onSubmit={state.handleSubmit}
          onReset={state.handleReset}
          onShowHint={state.handleShowHint}
          onFillAllEc={state.handleFillAllEc}
          onFillAllBv={state.handleFillAllBv}
          onRandomTask={state.handleRandomTask}
          onReorder={state.handleReorderTestCases}
          onBulkRemove={state.handleBulkRemove}
          onClearAll={state.handleClearAll}
          onBackToTasks={state.handleBackToTasks}
          onStudyTheory={() => state.setActiveTab("theory")}
        />
      </main>

      <footer className="border-t bg-white/50 dark:bg-zinc-900/50 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-xs text-muted-foreground">
          Тренажёр тестирования • Генератор тест-кейсов • Методы чёрного ящика
        </div>
      </footer>

      <KeyboardShortcutsDialog open={state.showShortcuts} onOpenChange={state.setShowShortcuts} />
      <Confetti active={state.showConfetti} />
      <Onboarding />
      <HintDialog
        onAddTestCase={state.handleAddTestCase}
      />
      <CommandPalette
        activeTab={state.activeTab}
        onTabChange={state.setActiveTab as (tab: string) => void}
        onSelectTask={(taskId: number) => {
          const task = state.filteredTasks.find((t) => t.id === taskId);
          if (task) state.handleSelectTask(task);
        }}
        onRandomTask={state.handleRandomTask}
        onSubmit={state.handleSubmit}
        onReset={state.handleReset}
        onBackToTasks={state.handleBackToTasks}
        onHint={state.handleShowHint}
        onFillAllEc={state.handleFillAllEc}
        onFillAllBv={state.handleFillAllBv}
        onExport={state.handleExportProgress}
        onImport={state.handleImportProgress}
        onResetAllProgress={state.handleResetAllProgress}
        availableTaskIds={new Set(state.filteredTasks.map((t) => t.id))}
      />
    </div>
  );
}
