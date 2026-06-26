"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, X } from "lucide-react";
import { logger } from "@/lib/logger";

export interface FilterState {
  dateFrom: string;
  dateTo: string;
  groupId: string;
  university: string;
  riskLevel: string;
}

interface AnalyticsFilterBarProps {
  onFilterChange: (filters: FilterState) => void;
  showGroupFilter?: boolean;
  showUniversityFilter?: boolean;
  showRiskFilter?: boolean;
  defaultDateFrom?: string;
  defaultDateTo?: string;
}

export function AnalyticsFilterBar({
  onFilterChange,
  showGroupFilter = false,
  showUniversityFilter = false,
  showRiskFilter = false,
  defaultDateFrom,
  defaultDateTo,
}: AnalyticsFilterBarProps) {
  const [dateFrom, setDateFrom] = useState(defaultDateFrom || "");
  const [dateTo, setDateTo] = useState(defaultDateTo || "");
  const [groupId, setGroupId] = useState("");
  const [university, setUniversity] = useState("");
  const [riskLevel, setRiskLevel] = useState("");
  const [groups, setGroups] = useState<Array<{ id: string; name: string }>>([]);
  const [universities, setUniversities] = useState<string[]>([]);

  useEffect(() => {
    if (showGroupFilter) {
      const controller = new AbortController();
      fetch("/api/admin/groups", { signal: controller.signal })
        .then(async (r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .then((d) => setGroups(d.groups || []))
        .catch((err) => { if (controller.signal.aborted) return; logger.warn("Failed to fetch admin groups", { error: err instanceof Error ? err.message : String(err) }); });
      return () => controller.abort();
    }
  }, [showGroupFilter]);

  useEffect(() => {
    if (showUniversityFilter) {
      const controller = new AbortController();
      fetch("/api/admin/analytics/comprehensive", { signal: controller.signal })
        .then(async (r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .then((d: { universityPerformance?: Array<{ university: string }> }) => {
          if (d.universityPerformance) {
            const unis = (d.universityPerformance as Array<{ university: string }>).map(
              (u) => u.university
            );
            setUniversities([...new Set(unis)].filter(Boolean) as string[]);
          }
        })
        .catch((err) => { if (controller.signal.aborted) return; logger.warn("Failed to fetch university performance", { error: err instanceof Error ? err.message : String(err) }); });
      return () => controller.abort();
    }
  }, [showUniversityFilter]);

  const handleApply = () => {
    onFilterChange({ dateFrom, dateTo, groupId, university, riskLevel: showRiskFilter ? riskLevel : "" });
  };

  const handleReset = () => {
    setDateFrom("");
    setDateTo("");
    setGroupId("");
    setUniversity("");
    setRiskLevel("");
    onFilterChange({ dateFrom: "", dateTo: "", groupId: "", university: "", riskLevel: "" });
  };

  const hasActiveFilters = dateFrom || dateTo || groupId || university || (showRiskFilter && riskLevel);

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg">
      <Filter className="h-4 w-4 text-muted-foreground shrink-0" />

      <Input
        type="date"
        value={dateFrom}
        onChange={(e) => setDateFrom(e.target.value)}
        className="w-auto h-8 text-sm"
        placeholder="От"
      />
      <Input
        type="date"
        value={dateTo}
        onChange={(e) => setDateTo(e.target.value)}
        className="w-auto h-8 text-sm"
        placeholder="До"
      />

      {showGroupFilter && groups.length > 0 && (
        <Select value={groupId} onValueChange={setGroupId}>
          <SelectTrigger className="w-auto h-8 text-sm min-w-[160px]">
            <SelectValue placeholder="Группа" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Все группы</SelectItem>
            {groups.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {showUniversityFilter && universities.length > 0 && (
        <Select value={university} onValueChange={setUniversity}>
          <SelectTrigger className="w-auto h-8 text-sm min-w-[180px]">
            <SelectValue placeholder="Университет" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Все университеты</SelectItem>
            {universities.map((u) => (
              <SelectItem key={u} value={u}>
                {u}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {showRiskFilter && (
        <Select value={riskLevel} onValueChange={setRiskLevel}>
          <SelectTrigger className="w-auto h-8 text-sm min-w-[140px]">
            <SelectValue placeholder="Уровень риска" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Все уровни</SelectItem>
            <SelectItem value="high">Высокий</SelectItem>
            <SelectItem value="medium">Средний</SelectItem>
            <SelectItem value="low">Низкий</SelectItem>
          </SelectContent>
        </Select>
      )}

      <Button variant="default" size="sm" className="h-8" onClick={handleApply}>
        Применить
      </Button>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" className="h-8" onClick={handleReset}>
          <X className="h-3 w-3 mr-1" />
          Сбросить
        </Button>
      )}
    </div>
  );
}
