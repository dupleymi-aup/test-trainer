"use client";

import {
  ComposedChart as RechartsComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface ComposedChartData {
  label: string;
  [key: string]: string | number;
}

interface ComposedChartProps {
  data: ComposedChartData[];
  barDataKey: string;
  lineDataKey: string;
  barColor?: string;
  lineColor?: string;
  title?: string;
  height?: number;
  yAxisDomain?: [number, number];
  targetLine?: number;
}

export function ComposedChart({
  data,
  barDataKey,
  lineDataKey,
  barColor = "hsl(var(--primary))",
  lineColor = "hsl(var(--chart-2))",
  title,
  height = 300,
  yAxisDomain = [0, 100],
  targetLine,
}: ComposedChartProps) {
  return (
    <div className="w-full">
      {title && (
        <h3 className="text-sm font-medium text-muted-foreground mb-2">
          {title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsComposedChart>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="label"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            className="stroke-muted-foreground"
          />
          <YAxis
            domain={yAxisDomain}
            fontSize={12}
            tickLine={false}
            axisLine={false}
            className="stroke-muted-foreground"
          />
          <Tooltip />
          <Legend />
          <Bar
            dataKey={barDataKey}
            fill={barColor}
            radius={[4, 4, 0, 0]}
            opacity={0.8}
          />
          <Line
            type="monotone"
            dataKey={lineDataKey}
            stroke={lineColor}
            strokeWidth={2}
            dot={false}
          />
          {targetLine && (
            <ReferenceLine
              y={targetLine}
              stroke="hsl(var(--destructive))"
              strokeDasharray="5 5"
              label={{
                value: "Цель",
                position: "insideTopRight",
                fontSize: 11,
                fill: "hsl(var(--destructive))",
              }}
            />
          )}
        </RechartsComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
