"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";
import { logger } from "@/lib/logger";

interface AnalyticsFiltersProps {
  onFilterChange: (filters: {
    groupId?: string;
    startDate?: string;
    endDate?: string;
  }) => void;
}

export function AnalyticsFilters({ onFilterChange }: AnalyticsFiltersProps) {
  const [groups, setGroups] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [groupId, setGroupId] = useState<string | undefined>();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/teacher/groups", { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => setGroups(data.groups || []))
      .catch((err) => {
        if (controller.signal.aborted) return;
        logger.warn("Failed to fetch teacher groups", { error: err instanceof Error ? err.message : String(err) });
      });
    return () => controller.abort();
  }, []);

  const handleApply = () => {
    onFilterChange({
      groupId: groupId === "ALL" ? undefined : groupId,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
  };

  const handleReset = () => {
    setGroupId(undefined);
    setStartDate("");
    setEndDate("");
    onFilterChange({});
  };

  return (
    <div className="flex flex-wrap gap-3 items-end p-4 bg-card border rounded-lg">
      <div className="flex items-center gap-2 mr-4">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Фильтры</span>
      </div>

      <div className="flex-1 min-w-[200px]">
        <label className="text-xs text-muted-foreground mb-1 block">
          Группа
        </label>
        <Select
          value={groupId || "ALL"}
          onValueChange={(v) => setGroupId(v === "ALL" ? undefined : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Все группы" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Все группы</SelectItem>
            {groups.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="min-w-[150px]">
        <label className="text-xs text-muted-foreground mb-1 block">
          Дата от
        </label>
        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
      </div>

      <div className="min-w-[150px]">
        <label className="text-xs text-muted-foreground mb-1 block">
          Дата до
        </label>
        <Input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>

      <div className="flex gap-2">
        <Button onClick={handleApply} size="sm">
          Применить
        </Button>
        <Button onClick={handleReset} variant="outline" size="sm">
          <X className="h-3 w-3 mr-1" /> Сбросить
        </Button>
      </div>
    </div>
  );
}
