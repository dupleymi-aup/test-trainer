"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface TopicPerformanceChartProps {
  data: Array<{
    topic: string;
    avgScore: number;
    avgEc: number;
    avgBv: number;
    taskCount: number;
  }>;
}

const topicLabels: Record<string, string> = {
  "Классы эквивалентности": "Эквивалент.",
  "Граничные значения": "Граничные",
  "Комбинаторные": "Комбинатор.",
  "Таблицы решений": "Таблицы",
  "Переходы состояний": "Состояния",
  "Попарное тестирование": "Попарное",
  "Валидация": "Валидация",
  "Рекурсия": "Рекурсия",
};

export function TopicPerformanceChart({ data }: TopicPerformanceChartProps) {
  const chartData = data.map((d) => ({
    topic: topicLabels[d.topic] || d.topic.substring(0, 12),
    fullTopic: d.topic,
    avgScore: d.avgScore,
    avgEc: d.avgEc,
    avgBv: d.avgBv,
  }));

  const weakestTopic = data.length > 0 ? data[0] : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          Карта навыков
          {weakestTopic && weakestTopic.avgScore < 60 && (
            <span className="text-xs text-rose-600 font-normal">
              ⚠ {weakestTopic.topic}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={chartData}>
            <PolarGrid className="stroke-muted" />
            <PolarAngleAxis
              dataKey="topic"
              className="text-xs"
              tick={{ fill: "hsl(var(--foreground))" }}
            />
            <PolarRadiusAxis
              domain={[0, 100]}
              className="text-xs"
              tick={{ fill: "hsl(var(--muted-foreground))" }}
            />
            <Radar
              name="Балл"
              dataKey="avgScore"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.3}
              strokeWidth={2}
            />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === "avgScore") return [`${value}%`, "Балл"];
                if (name === "avgEc") return [`${value}%`, "EC"];
                if (name === "avgBv") return [`${value}%`, "BV"];
                return [value, name];
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
