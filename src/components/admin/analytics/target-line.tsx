import { ReferenceLine, Label } from "recharts";

interface TargetLineProps {
  value: number;
  label?: string;
  color?: string;
  strokeDasharray?: string;
}

export function TargetLine({ value, label, color = "#ef4444", strokeDasharray = "5 5" }: TargetLineProps) {
  return (
    <ReferenceLine y={value} stroke={color} strokeDasharray={strokeDasharray}>
      <Label value={label || `Цель: ${value}%`} position="insideTopRight" fill={color} fontSize={10} />
    </ReferenceLine>
  );
}
