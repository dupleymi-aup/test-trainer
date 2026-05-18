export interface AttemptData {
  score: number;
  ecCoverage: number;
  bvCoverage: number;
  correctness?: number;
  timeSpent?: number;
  createdAt: Date;
}

export interface RiskResult {
  riskFactors: string[];
  recommendations: string[];
  dropoutRisk: "high" | "medium" | "low";
  trend: "improving" | "stable" | "declining";
}

export interface StatsResult {
  bestScore: number;
  avgScore: number;
  avgEc: number;
  avgBv: number;
  avgCorrectness: number;
  totalAttempts: number;
  avgTimeSpent: number;
}

const riskFactorLabels: Record<string, { label: string; recommendation: string }> = {
  low_performer: {
    label: "Низкая успеваемость",
    recommendation: "Рекомендуется дополнительная практика и консультация с преподавателем",
  },
  declining: {
    label: "Снижение прогресса",
    recommendation: "Необходимо выявить причины снижения и скорректировать учебный план",
  },
  inactive: {
    label: "Длительная неактивность",
    recommendation: "Связаться со студентом для выяснения причин отсутствия",
  },
  low_engagement: {
    label: "Низкая вовлечённость",
    recommendation: "Мотивировать студента к регулярным занятиям",
  },
  poor_ec_coverage: {
    label: "Плохое покрытие классов эквивалентности",
    recommendation: "Изучить тему классов эквивалентности и пройти дополнительные задания",
  },
  poor_bv_coverage: {
    label: "Плохое покрытие граничных значений",
    recommendation: "Обратить внимание на тестирование граничных значений",
  },
};

export function computeStudentStats(attempts: AttemptData[]): StatsResult {
  if (attempts.length === 0) {
    return { bestScore: 0, avgScore: 0, avgEc: 0, avgBv: 0, avgCorrectness: 0, totalAttempts: 0, avgTimeSpent: 0 };
  }

  return {
    bestScore: Math.max(...attempts.map((a) => a.score)),
    avgScore: Math.round(attempts.reduce((s, a) => s + a.score, 0) / attempts.length),
    avgEc: Math.round(attempts.reduce((s, a) => s + a.ecCoverage, 0) / attempts.length),
    avgBv: Math.round(attempts.reduce((s, a) => s + a.bvCoverage, 0) / attempts.length),
    avgCorrectness: attempts[0].correctness !== undefined
      ? Math.round(attempts.reduce((s, a) => s + (a.correctness ?? 0), 0) / attempts.length)
      : 0,
    totalAttempts: attempts.length,
    avgTimeSpent: attempts[0].timeSpent !== undefined
      ? Math.round(attempts.reduce((s, a) => s + (a.timeSpent ?? 0), 0) / attempts.length)
      : 0,
  };
}

export function computeStudentRisk(
  attempts: AttemptData[],
  createdAt: Date
): RiskResult {
  const riskFactors: string[] = [];
  const recommendations: string[] = [];

  if (attempts.length === 0) {
    return { riskFactors, recommendations, dropoutRisk: "low", trend: "stable" };
  }

  const now = new Date();
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const stats = computeStudentStats(attempts);
  const lastAttempt = attempts[attempts.length - 1];

  // Trend calculation
  const first3 = attempts.slice(0, 3);
  const last3 = attempts.slice(-3);
  const first3Avg = first3.reduce((s, a) => s + a.score, 0) / first3.length;
  const last3Avg = last3.reduce((s, a) => s + a.score, 0) / last3.length;
  const trend =
    attempts.length >= 6
      ? last3Avg - first3Avg > 15
        ? "improving"
        : last3Avg - first3Avg < -15
          ? "declining"
          : "stable"
      : "stable";

  if (stats.bestScore < 50) {
    riskFactors.push("low_performer");
    recommendations.push(riskFactorLabels.low_performer.recommendation);
  }

  if (trend === "declining") {
    riskFactors.push("declining");
    recommendations.push(riskFactorLabels.declining.recommendation);
  }

  if (lastAttempt && lastAttempt.createdAt < fourteenDaysAgo) {
    riskFactors.push("inactive");
    recommendations.push(riskFactorLabels.inactive.recommendation);
  }

  if (attempts.length < 3 && createdAt < sevenDaysAgo) {
    riskFactors.push("low_engagement");
    recommendations.push(riskFactorLabels.low_engagement.recommendation);
  }

  if (stats.avgEc < 50) {
    riskFactors.push("poor_ec_coverage");
    recommendations.push(riskFactorLabels.poor_ec_coverage.recommendation);
  }

  if (stats.avgBv < 50) {
    riskFactors.push("poor_bv_coverage");
    recommendations.push(riskFactorLabels.poor_bv_coverage.recommendation);
  }

  // Dropout risk calculation
  const riskScore = riskFactors.length + (trend === "declining" ? 1 : 0) + (stats.bestScore < 30 ? 1 : 0);
  const dropoutRisk: "high" | "medium" | "low" =
    riskScore >= 4 ? "high" : riskScore >= 2 ? "medium" : "low";

  return { riskFactors, recommendations, dropoutRisk, trend };
}

export function generateRecommendations(
  weakAreas: Array<{ topic: string; avgScore: number }>,
  avgEc: number,
  avgBv: number,
  avgCorrectness: number,
  totalAttempts: number
): string[] {
  const recommendations: string[] = [];

  if (weakAreas.length > 0) {
    recommendations.push(
      `Повторить теорию по темам: ${weakAreas.map((a) => a.topic).join(", ")}`
    );
  }
  if (avgEc < 70) {
    recommendations.push(
      "Улучшить покрытие классов эквивалентности — создавать тесты для каждого класса"
    );
  }
  if (avgBv < 70) {
    recommendations.push(
      "Усилить тестирование граничных значений — проверять границы и значения вокруг них"
    );
  }
  if (avgCorrectness < 70) {
    recommendations.push(
      "Повысить корректность тестов — внимательнее проверять ожидаемые результаты"
    );
  }
  if (totalAttempts < 5) {
    recommendations.push(
      "Практиковаться больше — выполнить дополнительные задания для закрепления навыков"
    );
  }
  if (recommendations.length === 0) {
    recommendations.push(
      "Отличная работа! Продолжайте практиковаться и помогать другим студентам"
    );
  }

  return recommendations;
}

export const { label: _, recommendation: __, ...riskLabels } = riskFactorLabels;
export { riskFactorLabels };
