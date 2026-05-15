"use client";

import { useState } from "react";
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

const TOTAL_TASKS = tasks.length;

export default function Home() {
  const state = useTrainerState();
  const [marathonActive, setMarathonActive] = useState(false);

  const handleReplayOnboarding = () => {
    window.dispatchEvent(new Event("replay-onboarding"));
  };

  if (marathonActive) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 dark:from-zinc-950 dark:via-zinc-900 dark:to-emerald-950/20">
        <AppHeader
          streak={state.streak}
          onShowShortcuts={() => state.setShowShortcuts(true)}
          onReplayOnboarding={handleReplayOnboarding}
        />
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-4 sm:py-6">
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

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-4 sm:py-6">
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
          onReorder={state.handleReorderTestCases}
          onBulkRemove={state.handleBulkRemove}
          onClearAll={state.handleClearAll}
          onBackToTasks={state.handleBackToTasks}
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
        testCases={state.testCases}
        onAddTestCase={state.handleAddTestCase}
      />
    </div>
  );
}
