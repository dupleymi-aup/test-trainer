"use client";

import { TeacherLayout } from "@/components/teacher/teacher-layout";
import { useState, useEffect, useCallback } from "react";
import { AnalyticsFilters } from "@/components/teacher/analytics/analytics-filters";
import { SummaryStatsCards } from "@/components/teacher/analytics/summary-stats-cards";
import { ScoreDistributionChart } from "@/components/teacher/analytics/score-distribution-chart";
import { TaskDifficultyChart } from "@/components/teacher/analytics/task-difficulty-chart";
import { TopicPerformanceChart } from "@/components/teacher/analytics/topic-performance-chart";
import { TimeTrendsChart } from "@/components/teacher/analytics/time-trends-chart";
import { CategoryDistributionChart } from "@/components/teacher/analytics/category-distribution-chart";
import { GroupComparisonTable } from "@/components/teacher/analytics/group-comparison-table";

interface AnalyticsData {
  scoreDistribution: Array<{ range: string; count: number }>;
  taskDifficulty: Array<{
    taskId: string;
    taskName: string;
    difficulty: string;
    avgScore: number;
    attemptsCount: number;
    avgTimeSpent: number;
  }>;
  topicPerformance: Array<{
    topic: string;
    avgScore: number;
    avgEc: number;
    avgBv: number;
    taskCount: number;
  }>;
  timeTrends: Array<{
    date: string;
    avgScore: number;
    avgEc: number;
    avgBv: number;
    attemptCount: number;
  }>;
  categoryDistribution: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  overallStats: {
    totalAttempts: number;
    avgScore: number;
    avgEc: number;
    avgBv: number;
    avgCorrectness: number;
    avgTimeSpent: number;
  };
  groupComparison: Array<{
    groupId: string;
    groupName: string;
    studentCount: number;
    avgScore: number;
    avgEc: number;
    avgBv: number;
    totalAttempts: number;
  }>;
}

export default function EnhancedAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<{
    groupId?: string;
    startDate?: string;
    endDate?: string;
  }>({});

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.groupId) params.set("groupId", filters.groupId);
    if (filters.startDate) params.set("startDate", filters.startDate);
    if (filters.endDate) params.set("endDate", filters.endDate);

    fetch(`/api/teacher/analytics/enhanced?${params.toString()}`)
      .then(async (r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading)
    return (
      <TeacherLayout>
        <div className="p-8 text-center">Загрузка...</div>
      </TeacherLayout>
    );

  if (!data)
    return (
      <TeacherLayout>
        <div className="p-8 text-center">Ошибка загрузки данных</div>
      </TeacherLayout>
    );

  return (
    <TeacherLayout>
      <div className="space-y-6">
        <AnalyticsFilters onFilterChange={setFilters} />

        <SummaryStatsCards stats={data.overallStats} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ScoreDistributionChart data={data.scoreDistribution} />
          <TopicPerformanceChart data={data.topicPerformance} />
        </div>

        <TaskDifficultyChart data={data.taskDifficulty} />

        <TimeTrendsChart data={data.timeTrends} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CategoryDistributionChart data={data.categoryDistribution} />
          <GroupComparisonTable data={data.groupComparison} />
        </div>

        {data.overallStats.totalAttempts === 0 && (
          <div className="text-center p-8 bg-card border rounded-lg">
            <p className="text-muted-foreground">
              Пока нет данных о попытках. Студенты ещё не выполняли задания.
            </p>
          </div>
        )}
      </div>
    </TeacherLayout>
  );
}
