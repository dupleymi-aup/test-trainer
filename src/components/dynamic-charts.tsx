"use client";

import dynamic from "next/dynamic";

export const DynamicChart = dynamic(
  () => import("recharts").then((mod) => mod.ResponsiveContainer),
  { ssr: false }
);

export const DynamicBarChart = dynamic(
  () => import("recharts").then((mod) => mod.BarChart),
  { ssr: false }
);

export const DynamicLineChart = dynamic(
  () => import("recharts").then((mod) => mod.LineChart),
  { ssr: false }
);

export const DynamicPieChart = dynamic(
  () => import("recharts").then((mod) => mod.PieChart),
  { ssr: false }
);

export const DynamicAreaChart = dynamic(
  () => import("recharts").then((mod) => mod.AreaChart),
  { ssr: false }
);

export const DynamicComposedChart = dynamic(
  () => import("recharts").then((mod) => mod.ComposedChart),
  { ssr: false }
);

export const DynamicBar = dynamic(
  () => import("recharts").then((mod) => mod.Bar),
  { ssr: false }
);

export const DynamicLine = dynamic(
  () => import("recharts").then((mod) => mod.Line),
  { ssr: false }
);

export const DynamicArea = dynamic(
  () => import("recharts").then((mod) => mod.Area),
  { ssr: false }
);

export const DynamicPie = dynamic(
  () => import("recharts").then((mod) => mod.Pie),
  { ssr: false }
);

export const DynamicCell = dynamic(
  () => import("recharts").then((mod) => mod.Cell),
  { ssr: false }
);

export const DynamicXAxis = dynamic(
  () => import("recharts").then((mod) => mod.XAxis),
  { ssr: false }
);

export const DynamicYAxis = dynamic(
  () => import("recharts").then((mod) => mod.YAxis),
  { ssr: false }
);

export const DynamicTooltip = dynamic(
  () => import("recharts").then((mod) => mod.Tooltip),
  { ssr: false }
);

export const DynamicLegend = dynamic(
  () => import("recharts").then((mod) => mod.Legend),
  { ssr: false }
);

export const DynamicCartesianGrid = dynamic(
  () => import("recharts").then((mod) => mod.CartesianGrid),
  { ssr: false }
);

export const DynamicReferenceLine = dynamic(
  () => import("recharts").then((mod) => mod.ReferenceLine),
  { ssr: false }
);
