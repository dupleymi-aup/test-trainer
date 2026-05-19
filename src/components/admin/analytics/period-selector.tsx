"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface PeriodSelectorProps {
  period1Start: string;
  period1End: string;
  period2Start: string;
  period2End: string;
  onPeriod1StartChange: (v: string) => void;
  onPeriod1EndChange: (v: string) => void;
  onPeriod2StartChange: (v: string) => void;
  onPeriod2EndChange: (v: string) => void;
  onCompare: () => void;
  loading?: boolean;
  compareLabel?: string;
}

export function PeriodSelector({
  period1Start,
  period1End,
  period2Start,
  period2End,
  onPeriod1StartChange,
  onPeriod1EndChange,
  onPeriod2StartChange,
  onPeriod2EndChange,
  onCompare,
  loading = false,
  compareLabel = "Сравнить",
}: PeriodSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Период 1: От
          </label>
          <Input
            type="date"
            value={period1Start}
            onChange={(e) => onPeriod1StartChange(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Период 1: До
          </label>
          <Input
            type="date"
            value={period1End}
            onChange={(e) => onPeriod1EndChange(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Период 2: От
          </label>
          <Input
            type="date"
            value={period2Start}
            onChange={(e) => onPeriod2StartChange(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">
            Период 2: До
          </label>
          <Input
            type="date"
            value={period2End}
            onChange={(e) => onPeriod2EndChange(e.target.value)}
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={onCompare} disabled={loading}>
          {compareLabel}
        </Button>
      </div>
    </div>
  );
}
